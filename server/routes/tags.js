import { eq, and, ne } from 'drizzle-orm';
import { db } from '../db.js';
import { tags } from '../schema.js';
import { httpError, authed } from '../http.js';

export async function tagRoutes(app) {
    app.post('/api/tags', async (request, reply) => {
        const user = await authed(request, reply);
        if (!user) return;
        const { name } = request.body ?? {};
        if (typeof name !== 'string' || !name.trim()) throw httpError(400, 'name required');
        const clean = name.trim().slice(0, 30);
        const dup = await db
            .select()
            .from(tags)
            .where(and(eq(tags.userId, user.id), eq(tags.name, clean)))
            .execute();
        if (dup.length) throw httpError(409, 'tag already exists');
        const [row] = await db.insert(tags).values({ userId: user.id, name: clean }).returning().execute();
        return { id: row.id, name: row.name };
    });

    app.patch('/api/tags/:id', async (request, reply) => {
        const user = await authed(request, reply);
        if (!user) return;
        const id = Number(request.params.id);
        if (!Number.isInteger(id)) throw httpError(400, 'invalid tag id');
        const rows = await db.select().from(tags).where(eq(tags.id, id)).execute();
        if (!rows.length || rows[0].userId !== user.id) throw httpError(404, 'tag not found');
        const { name } = request.body ?? {};
        if (typeof name !== 'string' || !name.trim()) throw httpError(400, 'name required');
        const clean = name.trim().slice(0, 30);
        const dup = await db
            .select()
            .from(tags)
            .where(and(eq(tags.userId, user.id), eq(tags.name, clean), ne(tags.id, id)))
            .execute();
        if (dup.length) throw httpError(409, 'tag already exists');
        await db.update(tags).set({ name: clean }).where(eq(tags.id, id)).execute();
        return { id, name: clean };
    });

    app.delete('/api/tags/:id', async (request, reply) => {
        const user = await authed(request, reply);
        if (!user) return;
        const id = Number(request.params.id);
        if (!Number.isInteger(id)) throw httpError(400, 'invalid tag id');
        const rows = await db.select().from(tags).where(eq(tags.id, id)).execute();
        if (!rows.length || rows[0].userId !== user.id) throw httpError(404, 'tag not found');
        await db.delete(tags).where(eq(tags.id, id)).execute();
        return { ok: true };
    });
}