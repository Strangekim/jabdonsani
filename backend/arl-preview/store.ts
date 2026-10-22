import { createHash, randomUUID } from 'crypto';
import { createReadStream } from 'fs';
import * as fs from 'fs/promises';
import path from 'path';
import { Identity, PreviewError } from './auth';

export const CHUNK_SIZE = 512 * 1024;
const MAX_BYTES = 128 * 1024 * 1024;
const MAX_FILES = 256;
export const RELEASE_ID = /^[a-f0-9]{40}-[1-9][0-9]{0,17}-[1-9][0-9]{0,17}$/;
interface FileEntry { path: string; size: number; sha256: string; }
interface Manifest { identity: Identity; files: FileEntry[]; createdAt: string; }
interface Current extends Identity { deployedAt: string; }

function validPath(value: unknown): value is string {
    return typeof value === 'string' && value.length <= 200 &&
        value.split('/').every(part => /^[A-Za-z0-9_-][A-Za-z0-9_.-]*$/.test(part)) &&
        /\.(html|js|wasm|json|css|png|jpg|jpeg|svg|webp|ktx2|glb|gltf|bin|ogg|mp3|wav|ttf|woff2?)$/.test(value);
}

function validateFiles(body: unknown): FileEntry[] {
    const candidate = body as { files?: unknown } | null;
    if (!candidate || !Array.isArray(candidate.files) || !candidate.files.length || candidate.files.length > MAX_FILES) {
        throw new PreviewError(400, 'A bounded files manifest is required.');
    }
    let total = 0;
    const seen = new Set<string>();
    const files = candidate.files.map((item: unknown): FileEntry => {
        const file = item as FileEntry | null;
        if (!file || !validPath(file.path) || seen.has(file.path) || !Number.isSafeInteger(file.size) ||
            file.size < 0 || file.size > MAX_BYTES || typeof file.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(file.sha256)) {
            throw new PreviewError(400, 'Invalid file path, size, digest or duplicate file.');
        }
        seen.add(file.path);
        total += file.size;
        return { path: file.path, size: file.size, sha256: file.sha256 };
    });
    if (total > MAX_BYTES || !files.some(file => file.path === 'index.html' && file.size > 0) ||
        !files.some(file => file.path.endsWith('.wasm') && file.size > 0)) {
        throw new PreviewError(400, 'The preview needs index.html and a wasm file within the 128 MiB limit.');
    }
    for (const file of files) {
        if (file.path.split('/').slice(0, -1).some((_, i, parts) => seen.has(parts.slice(0, i + 1).join('/')))) {
            throw new PreviewError(400, 'A file cannot also be a parent directory.');
        }
    }
    return files;
}

async function readJson<T>(filename: string): Promise<T | undefined> {
    try { return JSON.parse(await fs.readFile(filename, 'utf8')) as T; }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined; throw error; }
}

async function digest(filename: string): Promise<string> {
    const hash = createHash('sha256');
    for await (const data of createReadStream(filename)) hash.update(data);
    return hash.digest('hex');
}

export class PreviewStore {
    readonly releases: string;
    private readonly staging: string;
    private queue: Promise<unknown> = Promise.resolve();

    constructor(readonly root: string) {
        this.releases = path.join(root, 'releases');
        this.staging = path.join(root, 'staging');
    }

    // Compose runs one backend instance. Serialize mutations, including the publication pointer.
    private mutate<T>(action: () => Promise<T>): Promise<T> {
        const next = this.queue.then(action, action);
        this.queue = next.catch(() => undefined);
        return next;
    }

    private async initialize() {
        await fs.mkdir(this.releases, { recursive: true });
        await fs.mkdir(this.staging, { recursive: true });
    }

    private async locate(identity: Identity): Promise<{ directory: string; manifest: Manifest; published: boolean }> {
        for (const [parent, published] of [[this.staging, false], [this.releases, true]] as const) {
            const directory = path.join(parent, identity.id);
            const manifest = await readJson<Manifest>(path.join(directory, '.manifest.json'));
            if (!manifest) continue;
            if (JSON.stringify(manifest.identity) !== JSON.stringify(identity)) throw new PreviewError(403, 'Deployment identity mismatch.');
            return { directory, manifest, published };
        }
        throw new PreviewError(404, 'Deployment not found; start the upload again.');
    }

    async begin(identity: Identity, body: unknown) {
        const files = validateFiles(body);
        return this.mutate(async () => {
            await this.initialize();
            await this.cleanStaging(identity.id);
            const directory = path.join(this.staging, identity.id);
            const existing = await this.locate(identity).catch(error => {
                if (error instanceof PreviewError && error.status === 404) return undefined;
                throw error;
            });
            if (existing) {
                if (JSON.stringify(existing.manifest.files) !== JSON.stringify(files)) throw new PreviewError(409, 'This deployment already has a different manifest.');
            } else {
                const temporary = path.join(this.staging, `.upload-${randomUUID()}`);
                await fs.mkdir(temporary);
                const manifest: Manifest = { identity, files, createdAt: new Date().toISOString() };
                try {
                    for (const file of files) {
                        const destination = path.join(temporary, file.path);
                        await fs.mkdir(path.dirname(destination), { recursive: true });
                        await fs.writeFile(destination, '', { flag: 'wx' });
                    }
                    await fs.writeFile(path.join(temporary, '.manifest.json'), JSON.stringify(manifest), { flag: 'wx' });
                    await fs.rename(temporary, directory);
                } catch (error) {
                    await fs.rm(temporary, { recursive: true, force: true });
                    throw error;
                }
            }
            return { id: identity.id, chunkSize: CHUNK_SIZE };
        });
    }

    async write(identity: Identity, index: number, offset: number, bytes: Buffer) {
        if (!Number.isSafeInteger(index) || index < 0 || !Number.isSafeInteger(offset) || offset < 0 ||
            !Buffer.isBuffer(bytes) || !bytes.length || bytes.length > CHUNK_SIZE) throw new PreviewError(400, 'Invalid upload chunk.');
        await this.mutate(async () => {
            const { directory, manifest, published } = await this.locate(identity);
            const file = manifest.files[index];
            if (!file || offset + bytes.length > file.size) throw new PreviewError(400, 'Chunk exceeds the declared file size.');
            const filename = path.join(directory, file.path);
            const size = (await fs.stat(filename)).size;
            if (offset + bytes.length <= size) {
                const handle = await fs.open(filename, 'r');
                try {
                    const existing = Buffer.alloc(bytes.length);
                    const { bytesRead } = await handle.read(existing, 0, existing.length, offset);
                    if (bytesRead !== bytes.length || !existing.equals(bytes)) throw new PreviewError(409, 'Retry conflicts with uploaded bytes.');
                } finally { await handle.close(); }
                return;
            }
            if (published || offset !== size) throw new PreviewError(409, 'Upload offset does not match the stored file.');
            await fs.appendFile(filename, bytes);
        });
    }

    async activate(identity: Identity) {
        return this.mutate(async () => {
            const { directory, manifest, published } = await this.locate(identity);
            const current = await readJson<Current>(path.join(this.root, 'current.json'));
            if (current && (BigInt(identity.runNumber) < BigInt(current.runNumber) ||
                (identity.runNumber === current.runNumber && BigInt(identity.runAttempt) < BigInt(current.runAttempt)))) {
                throw new PreviewError(409, 'A newer workflow has already published a preview.');
            }
            for (const file of manifest.files) {
                const filename = path.join(directory, file.path);
                if ((await fs.stat(filename)).size !== file.size || await digest(filename) !== file.sha256) {
                    throw new PreviewError(409, 'The upload is incomplete or its SHA-256 digest does not match.');
                }
            }
            if (!published) await fs.rename(directory, path.join(this.releases, identity.id));
            const next: Current = { ...identity, deployedAt: current?.id === identity.id ? current.deployedAt : new Date().toISOString() };
            const temporary = path.join(this.root, `.current-${randomUUID()}.json`);
            await fs.writeFile(temporary, JSON.stringify(next));
            await fs.rename(temporary, path.join(this.root, 'current.json'));
            await this.cleanReleases(identity.id).catch(() => undefined); // Cleanup must not invalidate publication.
            return this.publicStatus(next);
        });
    }

    private publicStatus(current: Current) {
        return {
            ready: true, sha: current.sha, deployedAt: current.deployedAt,
            previewUrl: `/api/arl-preview/releases/${current.id}/index.html`,
            runUrl: `https://github.com/Strangekim/AcousticRealityLab/actions/runs/${current.runId}`,
        };
    }

    async status() {
        const current = await readJson<Current>(path.join(this.root, 'current.json'));
        return current ? this.publicStatus(current) : { ready: false };
    }

    private async cleanStaging(currentId: string) {
        const cutoff = Date.now() - 24 * 60 * 60 * 1000;
        const candidates: { name: string; time: number }[] = [];
        for (const name of await fs.readdir(this.staging)) {
            if (!RELEASE_ID.test(name) && !/^\.upload-[a-f0-9-]+$/.test(name)) continue;
            const directory = path.join(this.staging, name);
            const time = (await fs.stat(directory)).mtimeMs;
            // No other mutation is running, so temporary directories are interrupted initializations.
            if (name.startsWith('.upload-') || (name !== currentId && time < cutoff)) {
                await fs.rm(directory, { recursive: true, force: true });
            } else if (name !== currentId) candidates.push({ name, time });
        }
        // At most three 128 MiB uploads, including the one being started/resumed.
        for (const { name } of candidates.sort((a, b) => b.time - a.time).slice(2)) {
            await fs.rm(path.join(this.staging, name), { recursive: true, force: true });
        }
    }

    private async cleanReleases(currentId: string) {
        const entries = await Promise.all((await fs.readdir(this.releases)).filter(name => RELEASE_ID.test(name)).map(async name => ({
            name, time: (await fs.stat(path.join(this.releases, name))).mtimeMs,
        })));
        const retained = new Set([currentId, ...entries.sort((a, b) => b.time - a.time).filter(item => item.name !== currentId).slice(0, 2).map(item => item.name)]);
        for (const { name } of entries) if (!retained.has(name)) await fs.rm(path.join(this.releases, name), { recursive: true, force: true });
    }
}
