import { eq, and, gt } from 'drizzle-orm';
import { createHash, randomBytes } from 'node:crypto';
import { db } from './db.js';
import { sessions, users } from './schema.js';

const SESSION_DAYS = 30;

// Shared account rules — used by register and profile, so the two can
// never drift apart again.
export const USERNAME_RE = /^[A-Za-z0-9._]{2,30}$/;
// bcrypt only uses the first 72 bytes; longer input is silently truncated
export function validatePassword(p) {
    if (typeof p !== 'string' || p.length < 8 || Buffer.byteLength(p) > 72) {
        throw httpError(400, 'password must be 8 to 72 bytes');
    }
}

export function httpError(status, message) {
    const e = new Error(message);
    e.statusCode = status;
    return e;
}

// Sessions are stored as SHA-256 hashes: reading the database must not be
// enough to take over a live session. The raw token only lives in the cookie.
export const hashToken = (t) => createHash('sha256').update(t).digest('hex');

export async function issueSession(userId) {
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000);
    await db.insert(sessions).values({ token: hashToken(token), userId, expiresAt }).execute();
    return { token, expiresAt };
}

export function setSessionCookie(reply, { token, expiresAt }) {
    reply.setCookie('sid', token, { expires: expiresAt, httpOnly: true, path: '/', sameSite: 'lax' });
}

export async function currentUser(request) {
    const token = request.cookies.sid;
    if (!token) return null;
    const rows = await db
        .select()
        .from(sessions)
        .where(and(eq(sessions.token, hashToken(token)), gt(sessions.expiresAt, new Date())))
        .execute();
    if (!rows.length) return null;
    const userRows = await db.select().from(users).where(eq(users.id, rows[0].userId)).execute();
    if (!userRows.length) return null;
    return { id: userRows[0].id, username: userRows[0].username, avatar: userRows[0].avatar || null };
}

export async function authed(request, reply) {
    const user = await currentUser(request);
    if (!user) {
        reply.code(401).send({ error: 'not logged in' });
        return null;
    }
    return user;
}