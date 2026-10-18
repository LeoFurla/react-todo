import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, '..', 'dist');

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.ico': 'image/x-icon',
    '.woff2': 'font/woff2',
};

export async function staticRoutes(app) {
    app.get('/*', async (request, reply) => {
        const raw = request.params['*'] ?? '';
        if (raw.startsWith('/api/')) return reply.code(404).send({ error: 'not found' });
        let rel;
        try {
            rel = decodeURIComponent(raw).replace(/^\/+/, '');
        } catch {
            return reply.code(400).send('bad path');
        }
        const file = path.normalize(path.join(DIST, rel));
        if (file !== DIST && !file.startsWith(DIST + path.sep)) return reply.code(403).send('forbidden');
        let stat = null;
        try {
            stat = await fs.promises.stat(file);
        } catch {
            /* fall through to SPA */
        }
        if (stat && stat.isFile() && path.extname(file)) {
            const data = await fs.promises.readFile(file);
            reply.header('content-type', MIME[path.extname(file)] ?? 'application/octet-stream');
            reply.header('cache-control', 'public, max-age=3600');
            return reply.send(data);
        }
        const data = await fs.promises.readFile(path.join(DIST, 'index.html'));
        reply.header('content-type', 'text/html; charset=utf-8');
        reply.header('cache-control', 'no-cache');
        return reply.send(data);
    });
}