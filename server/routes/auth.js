import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import { users, sessions } from '../schema.js';
import { httpError, issueSession, currentUser, setSessionCookie } from '../http.js';

export async function authRoutes(app) {
    app.post('/api/register', { config: { rateLimit: { max: 5, timeWindow: '10 minutes' } } }, async (request, reply) => {
        // Fail-closed: registration is open only while ALLOW_REGISTRATION=true.
        // Bootstrap exception: the very first account can always be created.
        if (process.env.ALLOW_REGISTRATION !== 'true') {
            const any = await db.select({ id: users.id }).from(users).limit(1).execute();
            if (any.length) throw httpError(403, 'registration is closed');
        }
        const { username, password } = request.body ?? {};
        if (typeof username !== 'string' || typeof password !== 'string')
            throw httpError(400, 'username and password required');
        const name = username.trim();
        if (name.length < 2) throw httpError(400, 'username must be at least 2 characters');
        if (password.length < 4) throw httpError(400, 'password must be at least 4 characters');
        const existing = await db.select().from(users).where(eq(users.username, name)).execute();
        if (existing.length) throw httpError(409, 'username already taken');
        const hash = await bcrypt.hash(password, 10);
        const [row] = await db
            .insert(users)
            .values({ username: name, passwordHash: hash })
            .returning()
            .execute();
        setSessionCookie(reply, await issueSession(row.id));
        return { id: row.id, username: row.username, avatar: row.avatar || null };
    });

    app.post('/api/login', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (request, reply) => {
        const { username, password } = request.body ?? {};
        if (typeof username !== 'string' || typeof password !== 'string')
            throw httpError(400, 'username and password required');
        const rows = await db
            .select()
            .from(users)
            .where(eq(users.username, username.trim()))
            .execute();
        if (!rows.length || !await bcrypt.compare(password, rows[0].passwordHash))
            throw httpError(401, 'wrong username or password');
        setSessionCookie(reply, await issueSession(rows[0].id));
        return { id: rows[0].id, username: rows[0].username, avatar: rows[0].avatar || null };
    });

    app.post('/api/logout', async (request, reply) => {
        const token = request.cookies.sid;
        if (token) {
            await db.delete(sessions).where(eq(sessions.token, token)).execute();
            reply.clearCookie('sid', { path: '/' });
        }
        return { ok: true };
    });

    app.get('/api/me', async (request, reply) => {
        const user = await currentUser(request);
        if (!user) return reply.code(401).send({ error: 'not logged in' });
        return user;
    });
}