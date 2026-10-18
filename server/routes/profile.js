import fs from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { eq, ne, and } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import { users, sessions } from '../schema.js';
import { httpError, authed } from '../http.js';

const AVATARS_DIR = process.env.AVATARS_DIR || path.join(process.cwd(), 'data', 'avatars');
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
};
const EXT_CONTENT_TYPES = Object.fromEntries(Object.entries(IMAGE_TYPES).map(([t, e]) => [e, t]));
const USERNAME_RE = /^[A-Za-z0-9._]{2,30}$/;

// Don't trust the client-sent mimetype: verify the payload against its magic bytes.
function magicBytesMatch(buf, ext) {
    if (buf.length < 12) return false;
    switch (ext) {
        case '.jpg':
            return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
        case '.png':
            return buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
        case '.gif':
            return buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38;
        case '.webp':
            return buf.subarray(0, 4).toString('ascii') === 'RIFF'
                && buf.subarray(8, 12).toString('ascii') === 'WEBP';
        default:
            return false;
    }
}

async function fetchUser(id) {
    const rows = await db.select().from(users).where(eq(users.id, id)).execute();
    if (!rows.length) throw httpError(404, 'user not found');
    return rows[0];
}

export async function profileRoutes(app) {
    app.get('/api/profile', async (request, reply) => {
        const user = await authed(request, reply);
        if (!user) return;
        const row = await fetchUser(user.id);
        return { username: row.username, avatar: row.avatar || null };
    });

    app.patch('/api/profile/username', async (request, reply) => {
        const user = await authed(request, reply);
        if (!user) return;
        const { username } = request.body ?? {};
        if (typeof username !== 'string' || !USERNAME_RE.test(username.trim()))
            throw httpError(400, 'username must be 2-30 characters (letters, numbers, dot, underscore)');
        const name = username.trim();
        const clash = await db
            .select()
            .from(users)
            .where(and(eq(users.username, name), ne(users.id, user.id)))
            .execute();
        if (clash.length) throw httpError(409, 'username already taken');
        await db.update(users).set({ username: name }).where(eq(users.id, user.id)).execute();
        return { username: name };
    });

    app.post('/api/profile/password', async (request, reply) => {
        const user = await authed(request, reply);
        if (!user) return;
        const { current, next } = request.body ?? {};
        if (typeof current !== 'string' || typeof next !== 'string')
            throw httpError(400, 'current and new password required');
        if (next.length < 8) throw httpError(400, 'new password must be at least 8 characters');
        const row = await fetchUser(user.id);
        // 400, not 401: the client maps 401 to "session expired" and force-logs-out
        if (!await bcrypt.compare(current, row.passwordHash))
            throw httpError(400, 'current password is incorrect');
        const hash = await bcrypt.hash(next, 10);
        await db.update(users).set({ passwordHash: hash }).where(eq(users.id, user.id)).execute();
        // A password change means the old secret is suspect: kill every session of
        // this user except the one making the request (stays logged in).
        await db.delete(sessions)
            .where(and(eq(sessions.userId, user.id), ne(sessions.token, request.cookies.sid)))
            .execute();
        return { ok: true };
    });

    app.post('/api/profile/avatar', async (request, reply) => {
        const user = await authed(request, reply);
        if (!user) return;
        const file = await request.file({ limits: { fileSize: MAX_AVATAR_BYTES, files: 1 } });
        if (!file) throw httpError(400, 'file required (multipart field "file")');
        const ext = IMAGE_TYPES[(file.mimetype || '').toLowerCase()];
        if (!ext) throw httpError(415, 'only JPEG, PNG, WebP or GIF images are allowed');
        const buf = await file.toBuffer();
        if (!buf.length) throw httpError(400, 'empty file');
        if (!magicBytesMatch(buf, ext)) throw httpError(415, 'file content does not match its image type');
        await fs.promises.mkdir(AVATARS_DIR, { recursive: true });
        // never trust the client-supplied filename; store under a random name
        const filename = `${randomBytes(16).toString('hex')}${ext}`;
        await fs.promises.writeFile(path.join(AVATARS_DIR, filename), buf);
        const row = await fetchUser(user.id);
        const old = row.avatar;
        // Update the DB first; only delete the old file once the row points at the
        // new one, so a failed update can never leave the user with a 404 avatar.
        await db.update(users).set({ avatar: filename }).where(eq(users.id, user.id)).execute();
        if (old && old !== filename) {
            await fs.promises.unlink(path.join(AVATARS_DIR, old)).catch(() => {
                /* already gone — ignore */
            });
        }
        return { avatar: filename };
    });

    app.get('/avatars/:file', async (request, reply) => {
        // The whole app sits behind login; gate file serving too so unguessable
        // avatar names never resolve for anonymous visitors.
        const user = await authed(request, reply);
        if (!user) return;
        const { file } = request.params;
        if (path.basename(file) !== file || !file || file.includes('\u0000'))
            return reply.code(400).send({ error: 'bad file name' });
        const ext = path.extname(file);
        const content = EXT_CONTENT_TYPES[ext.toLowerCase()];
        if (!content) return reply.code(404).send({ error: 'not found' });
        const filePath = path.join(AVATARS_DIR, path.basename(request.params.file));
        let data;
        try {
            data = await fs.promises.readFile(filePath);
        } catch {
            return reply.code(404).send({ error: 'not found' });
        }
        reply.header('content-type', content);
        reply.header('cache-control', 'private, max-age=3600');
        return reply.send(data);
    });
}
