import { eq, and, gt } from 'drizzle-orm';
import { randomBytes } from 'node:crypto';
import { db } from './db.js';
import { sessions, users } from './schema.js';

const SESSION_DAYS = 30;

export function httpError(status, message) {
    const e = new Error(message);
    e.statusCode = status;
    return e;
}

export async function issueSession(userId) {
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000);
    await db.insert(sessions).values({ token, userId, expiresAt }).execute();
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
        .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())))
        .execute();
    if (!rows.length) return null;
    const userRows = await db.select().from(users).where(eq(users.id, rows[0].userId)).execute();
    if (!userRows.length) return null;
    return { id: userRows[0].id, username: userRows[0].username };
}

export async function authed(request, reply) {
    const user = await currentUser(request);
    if (!user) {
        reply.code(401).send({ error: 'not logged in' });
        return null;
    }
    return user;
}