import express, { NextFunction, Request, RequestHandler, Response } from 'express';
import path from 'path';
import { createVerifier, Identity, PreviewError } from './auth';
import { CHUNK_SIZE, PreviewStore, RELEASE_ID } from './store';

export function createPreviewRouter(options: {
    root?: string;
    verify?: (authorization: string | undefined) => Promise<Identity>;
} = {}) {
    const router = express.Router();
    const store = new PreviewStore(options.root ?? process.env.ARL_PREVIEW_DIR ?? path.resolve('arl-preview-data'));
    const verify = options.verify ?? createVerifier();
    const authenticated: RequestHandler = async (req, res, next) => {
        try {
            res.locals.identity = await verify(req.header('authorization'));
            if (req.params.id && req.params.id !== res.locals.identity.id) throw new PreviewError(403, 'Deployment identity mismatch.');
            next();
        } catch (error) { next(error); }
    };

    router.get('/status', async (_req, res) => {
        res.setHeader('Cache-Control', 'no-store');
        res.json(await store.status());
    });
    router.use('/releases/:id', (req, res, next) => {
        if (!RELEASE_ID.test(String(req.params.id))) return res.status(404).end();
        res.setHeader('X-Content-Type-Options', 'nosniff');
        // Enables the preview's module/wasm fetches inside a sandboxed opaque-origin iframe.
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.removeHeader('Access-Control-Allow-Credentials');
        res.setHeader('Referrer-Policy', 'no-referrer');
        return express.static(path.join(store.releases, String(req.params.id)), {
            dotfiles: 'deny', index: 'index.html', fallthrough: false,
            immutable: true, maxAge: '1y',
            setHeaders(response, filename) {
                if (filename.endsWith('.wasm')) response.setHeader('Content-Type', 'application/wasm');
            },
        })(req, res, next);
    });

    router.post('/deployments', authenticated, express.json({ limit: '64kb' }), async (req, res) => {
        res.status(201).json(await store.begin(res.locals.identity, req.body));
    });
    router.put('/deployments/:id/files/:index', authenticated, express.raw({ type: 'application/octet-stream', limit: CHUNK_SIZE }), async (req, res) => {
        const index = String(req.params.index);
        const offset = req.query.offset;
        if (!/^(0|[1-9][0-9]*)$/.test(index) || typeof offset !== 'string' || !/^(0|[1-9][0-9]*)$/.test(offset)) {
            throw new PreviewError(400, 'A file index and byte offset are required.');
        }
        await store.write(res.locals.identity, Number(index), Number(offset), req.body);
        res.status(204).end();
    });
    router.post('/deployments/:id/activate', authenticated, async (_req, res) => {
        res.json(await store.activate(res.locals.identity));
    });
    router.use((error: Error & { status?: number; type?: string }, _req: Request, res: Response, _next: NextFunction) => {
        const status = error instanceof PreviewError ? error.status : error.status && error.status >= 400 && error.status < 500 ? error.status : 500;
        res.status(status).json({ error: error instanceof PreviewError ? error.message : status === 413 ? 'Request exceeds the allowed size.' : status === 404 ? 'Preview file not found.' : 'Preview request failed.' });
    });
    return router;
}
