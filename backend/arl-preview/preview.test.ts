import test, { TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, rm, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import express from 'express';
import { AUDIENCE, createVerifier, identityFromClaims, ISSUER, PreviewError } from './auth';
import { CHUNK_SIZE, PreviewStore } from './store';
import { createPreviewRouter } from './router';

const loadJose: () => Promise<typeof import('jose')> = require('./jose-loader.cjs');
const sha = 'a'.repeat(40);
const claims = {
    repository: 'Strangekim/AcousticRealityLab', repository_id: '1428258581', repository_owner_id: '114288288',
    ref: 'refs/heads/main', ref_type: 'branch', workflow_ref: 'Strangekim/AcousticRealityLab/.github/workflows/preview.yml@refs/heads/main',
    event_name: 'push', sub: 'repo:Strangekim@114288288/AcousticRealityLab@1428258581:ref:refs/heads/main',
    sha, run_id: '100', run_number: '1', run_attempt: '1',
};
const identity = identityFromClaims(claims);
const contents = [Buffer.from('<!doctype html><title>ARL preview</title>'), Buffer.from('\0asm\x01\0\0\0')];
const manifest = {
    files: contents.map((bytes, i) => ({
        path: ['index.html', 'app_bg.wasm'][i], size: bytes.length,
        sha256: createHash('sha256').update(bytes).digest('hex'),
    })),
};
const rejectStatus = (status: number) => (error: unknown) => error instanceof PreviewError && error.status === status;

async function tempStore(t: TestContext) {
    const root = await mkdtemp(path.join(tmpdir(), 'arl-preview-'));
    t.after(() => rm(root, { recursive: true, force: true }));
    return new PreviewStore(root);
}

test('verifies signatures and issuer, audience, expiry, repository, branch and workflow restrictions', async () => {
    const { generateKeyPair, SignJWT, createLocalJWKSet, exportJWK } = await loadJose();
    const keys = await generateKeyPair('RS256');
    const publicJwk = { ...await exportJWK(keys.publicKey), alg: 'RS256', kid: 'test' };
    const verify = createVerifier(createLocalJWKSet({ keys: [publicJwk] }));
    const token = async (overrides: Record<string, unknown> = {}) => {
        const now = Math.floor(Date.now() / 1000);
        return new SignJWT({ ...claims, iss: ISSUER, aud: AUDIENCE, iat: now, nbf: now, exp: now + 300, ...overrides })
            .setProtectedHeader({ alg: 'RS256', kid: 'test' }).sign(keys.privateKey);
    };
    assert.deepEqual(await verify(`Bearer ${await token()}`), identity);
    assert.deepEqual(await verify(`Bearer ${await token({ sub: 'repo:Strangekim/AcousticRealityLab:ref:refs/heads/main' })}`), identity);
    assert.deepEqual(await verify(`Bearer ${await token({ event_name: 'workflow_dispatch' })}`), identity);
    for (const overrides of [
        { iss: 'https://attacker.invalid' }, { aud: 'https://other.example' }, { exp: 1 },
        { repository_id: '99' }, { repository_owner_id: '99' }, { repository: 'fork/AcousticRealityLab' },
        { ref: 'refs/heads/feature' }, { event_name: 'pull_request' }, { event_name: 'dynamic' },
        { workflow_ref: 'Strangekim/AcousticRealityLab/.github/workflows/other.yml@refs/heads/main' },
        { sub: 'repo:Strangekim/AcousticRealityLab:pull_request' }, { run_number: '0' },
    ]) await assert.rejects(verify(`Bearer ${await token(overrides)}`), error => error instanceof PreviewError);
    const valid = await token();
    const parts = valid.split('.');
    parts[2] = (parts[2][0] === 'a' ? 'b' : 'a') + parts[2].slice(1);
    await assert.rejects(verify(`Bearer ${parts.join('.')}`), rejectStatus(401));
    await assert.rejects(verify(undefined), rejectStatus(401));
});

test('rejects traversal, duplicate paths, oversized manifests and file/directory conflicts', async t => {
    const store = await tempStore(t);
    for (const bad of ['../index.html', '/index.html', 'assets/../../index.html', 'assets\\index.html', '.env', 'assets/%2e%2e/index.html', 'source.rs']) {
        await assert.rejects(store.begin(identity, { files: [...manifest.files, { ...manifest.files[0], path: bad }] }), rejectStatus(400));
    }
    await assert.rejects(store.begin(identity, { files: [...manifest.files, manifest.files[0]] }), rejectStatus(400));
    await assert.rejects(store.begin(identity, { files: [{ ...manifest.files[0], size: 129 * 1024 * 1024 }, manifest.files[1]] }), rejectStatus(400));
    await assert.rejects(store.begin(identity, { files: [...manifest.files, { ...manifest.files[0], path: 'index.html/file.js' }] }), rejectStatus(400));
    assert.deepEqual(await store.status(), { ready: false });
});

test('partial and corrupt uploads never replace current; retries are idempotent and immutable', async t => {
    const store = await tempStore(t);
    const session = await store.begin(identity, manifest);
    assert.deepEqual(session, { id: identity.id, chunkSize: CHUNK_SIZE });
    assert.deepEqual(await store.begin(identity, manifest), session);
    await store.write(identity, 0, 0, contents[0]);
    await assert.rejects(store.activate(identity), rejectStatus(409));
    assert.deepEqual(await store.status(), { ready: false });
    await store.write(identity, 0, 0, contents[0]);
    await assert.rejects(store.write(identity, 0, 0, Buffer.from('bad')), rejectStatus(409));
    await assert.rejects(store.write(identity, 1, 1, contents[1].subarray(1)), rejectStatus(409));
    await store.write(identity, 1, 0, contents[1]);
    const status = await store.activate(identity);
    assert.equal(status.ready, true);
    assert.equal(status.sha, sha);
    assert.deepEqual(await store.begin(identity, manifest), session);
    await store.write(identity, 1, 0, contents[1]);
    assert.deepEqual(await store.activate(identity), status);
    assert.deepEqual(await readFile(path.join(store.releases, identity.id, 'app_bg.wasm')), contents[1]);
    const later = identityFromClaims({ ...claims, sha: 'b'.repeat(40), run_id: '101', run_number: '2' });
    await store.begin(later, manifest);
    await store.write(later, 0, 0, contents[0]);
    await store.write(later, 1, 0, Buffer.alloc(contents[1].length));
    await assert.rejects(store.activate(later), rejectStatus(409));
    assert.deepEqual(await store.status(), status);
});

test('prevents stale runs and rerun attempts from replacing the newest successful build', async t => {
    const store = await tempStore(t);
    const newer = identityFromClaims({ ...claims, sha: 'b'.repeat(40), run_id: '101', run_number: '2', run_attempt: '2' });
    const oldAttempt = identityFromClaims({ ...claims, sha: 'b'.repeat(40), run_id: '101', run_number: '2' });
    for (const actor of [identity, oldAttempt, newer]) {
        await store.begin(actor, manifest);
        for (let i = 0; i < contents.length; i++) await store.write(actor, i, 0, contents[i]);
    }
    const status = await store.activate(newer);
    await assert.rejects(store.activate(identity), rejectStatus(409));
    await assert.rejects(store.activate(oldAttempt), rejectStatus(409));
    assert.deepEqual(await store.status(), status);
});

test('bounds abandoned uploads to three staging directories', async t => {
    const store = await tempStore(t);
    for (let run = 1; run <= 5; run++) {
        await store.begin(identityFromClaims({ ...claims, run_id: String(99 + run), run_number: String(run) }), manifest);
    }
    assert.equal((await readdir(path.join(store.root, 'staging'))).length, 3);
    await assert.rejects(store.write(identity, 0, 0, contents[0]), rejectStatus(404));
});

test('HTTP receiver authenticates before parsing and serves only complete builds with wasm MIME', async t => {
    const store = await tempStore(t);
    const app = express();
    app.use('/api/arl-preview', createPreviewRouter({ root: store.root, verify: async header => {
        if (header !== 'Bearer test') throw new PreviewError(401, 'Token required.');
        return identity;
    } }));
    const server = app.listen(0, '127.0.0.1');
    await new Promise<void>(resolve => server.once('listening', resolve));
    t.after(() => new Promise<void>((resolve, reject) => { server.closeAllConnections(); server.close(error => error ? reject(error) : resolve()); }));
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    const base = `http://127.0.0.1:${address.port}/api/arl-preview`;
    let response = await fetch(`${base}/deployments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{bad' });
    assert.equal(response.status, 401);
    response = await fetch(`${base}/deployments`, { method: 'POST', headers: { Authorization: 'Bearer test', 'Content-Type': 'application/json' }, body: JSON.stringify(manifest) });
    assert.equal(response.status, 201);
    response = await fetch(`${base}/deployments/${identity.id}/files/0?offset=0`, { method: 'PUT', headers: { Authorization: 'Bearer test', 'Content-Type': 'application/octet-stream' }, body: new Uint8Array(CHUNK_SIZE + 1) });
    assert.equal(response.status, 413);
    for (let i = 0; i < contents.length; i++) {
        response = await fetch(`${base}/deployments/${identity.id}/files/${i}?offset=0`, { method: 'PUT', headers: { Authorization: 'Bearer test', 'Content-Type': 'application/octet-stream' }, body: new Uint8Array(contents[i]) });
        assert.equal(response.status, 204);
    }
    response = await fetch(`${base}/deployments/${identity.id}/activate`, { method: 'POST', headers: { Authorization: 'Bearer test' } });
    assert.equal(response.status, 200);
    response = await fetch(`${base}/releases/${identity.id}/app_bg.wasm`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('Content-Type'), 'application/wasm');
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), '*');
    assert.match(response.headers.get('Cache-Control') ?? '', /immutable/);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), contents[1]);
    response = await fetch(`${base}/releases/${identity.id}/.manifest.json`);
    assert.ok([403, 404].includes(response.status));
    response = await fetch(`${base}/status`);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
});
