import { eq, and, inArray, asc } from 'drizzle-orm';
import { db } from '../db.js';
import { todos, tags, todoTags } from '../schema.js';
import { httpError, authed } from '../http.js';

const STATUSES = ['planned', 'started', 'completed'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// dueDate arrives as 'YYYY-MM-DD' or null; pg may hand back DATE as Date or string
function toDateString(v) {
    if (v == null) return null;
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    return v;
}

function validateDueDate(dueDate) {
    if (dueDate === null) return null;
    if (typeof dueDate !== 'string' || !DATE_RE.test(dueDate) || Number.isNaN(Date.parse(dueDate))) {
        throw httpError(400, 'dueDate must be a YYYY-MM-DD date or null');
    }
    return dueDate;
}

async function validateTagIds(user, tagIds) {
    if (!Array.isArray(tagIds)) throw httpError(400, 'tagIds must be an array');
    if (tagIds.some((id) => !Number.isInteger(id))) throw httpError(400, 'tag ids must be integers');
    if (!tagIds.length) return [];
    const rows = await db.select().from(tags).where(inArray(tags.id, tagIds)).execute();
    const valid = new Set(rows.filter((t) => t.userId === user.id).map((t) => t.id));
    if (tagIds.some((id) => !valid.has(id))) throw httpError(400, 'unknown tag id');
    return [...new Set(tagIds)];
}

export async function todoRoutes(app) {
    app.get('/api/board', async (request, reply) => {
        const user = await authed(request, reply);
        if (!user) return;
        const rows = await db
            .select()
            .from(todos)
            .where(eq(todos.userId, user.id))
            .orderBy(asc(todos.position), asc(todos.id))
            .execute();
        const tagRows = await db
            .select()
            .from(tags)
            .where(eq(tags.userId, user.id))
            .orderBy(asc(tags.name))
            .execute();
        const links = rows.length
            ? await db.select().from(todoTags).where(inArray(todoTags.todoId, rows.map((t) => t.id))).execute()
            : [];
        const byTodo = new Map();
        for (const l of links) {
            if (!byTodo.has(l.todoId)) byTodo.set(l.todoId, []);
            byTodo.get(l.todoId).push(l.tagId);
        }
        return {
            todos: rows.map((t) => ({
                id: t.id,
                title: t.title,
                description: t.description,
                status: t.status,
                dueDate: toDateString(t.dueDate),
                tagIds: byTodo.get(t.id) ?? [],
            })),
            tags: tagRows.map((t) => ({ id: t.id, name: t.name })),
        };
    });

    app.post('/api/todos', async (request, reply) => {
        const user = await authed(request, reply);
        if (!user) return;
        const { title, description, status, tagIds, dueDate } = request.body ?? {};
        if (typeof title !== 'string' || !title.trim()) throw httpError(400, 'title required');
        const st = status ?? 'planned';
        if (!STATUSES.includes(st)) throw httpError(400, 'invalid status');
        const due = dueDate === undefined ? null : validateDueDate(dueDate);
        const cleanTags = await validateTagIds(user, tagIds ?? []);
        const posRows = await db
            .select({ p: todos.position })
            .from(todos)
            .where(and(eq(todos.userId, user.id), eq(todos.status, st)))
            .execute();
        const position = posRows.length ? Math.max(...posRows.map((r) => r.p)) + 1 : 0;
        const [row] = await db
            .insert(todos)
            .values({
                userId: user.id,
                title: title.trim(),
                description: String(description ?? '').trim(),
                status: st,
                position,
                dueDate: due,
            })
            .returning()
            .execute();
        for (const tagId of cleanTags) {
            await db.insert(todoTags).values({ todoId: row.id, tagId }).onConflictDoNothing().execute();
        }
        return {
            id: row.id,
            title: row.title,
            description: row.description,
            status: row.status,
            dueDate: due,
            tagIds: cleanTags,
        };
    });

    app.patch('/api/todos/:id', async (request, reply) => {
        const user = await authed(request, reply);
        if (!user) return;
        const id = Number(request.params.id);
        if (!Number.isInteger(id)) throw httpError(400, 'invalid todo id');
        const rows = await db.select().from(todos).where(eq(todos.id, id)).execute();
        if (!rows.length || rows[0].userId !== user.id) throw httpError(404, 'todo not found');
        const current = rows[0];
        const { title, description, status, tagIds, dueDate } = request.body ?? {};

        const set = {};
        if (title !== undefined) {
            if (typeof title !== 'string' || !title.trim()) throw httpError(400, 'title required');
            set.title = title.trim();
        }
        if (description !== undefined) set.description = String(description).trim();
        if (status !== undefined) {
            if (!STATUSES.includes(status)) throw httpError(400, 'invalid status');
            if (status !== current.status) {
                const posRows = await db
                    .select({ p: todos.position })
                    .from(todos)
                    .where(and(eq(todos.userId, user.id), eq(todos.status, status)))
                    .execute();
                set.status = status;
                set.position = posRows.length ? Math.max(...posRows.map((r) => r.p)) + 1 : 0;
            }
        }
        if (dueDate !== undefined) set.dueDate = validateDueDate(dueDate);
        if (Object.keys(set).length) {
            set.updatedAt = new Date();
            await db.update(todos).set(set).where(eq(todos.id, id)).execute();
        }
        if (tagIds !== undefined) {
            const clean = await validateTagIds(user, tagIds);
            await db.delete(todoTags).where(eq(todoTags.todoId, id)).execute();
            for (const tagId of clean) {
                await db.insert(todoTags).values({ todoId: id, tagId }).execute();
            }
        }
        return { ok: true, id };
    });

    app.delete('/api/todos/:id', async (request, reply) => {
        const user = await authed(request, reply);
        if (!user) return;
        const id = Number(request.params.id);
        if (!Number.isInteger(id)) throw httpError(400, 'invalid todo id');
        const rows = await db.select().from(todos).where(eq(todos.id, id)).execute();
        if (!rows.length || rows[0].userId !== user.id) throw httpError(404, 'todo not found');
        await db.delete(todos).where(eq(todos.id, id)).execute();
        return { ok: true };
    });

    // one atomic reorder: receives the full id list per column
    app.post('/api/reorder', async (request, reply) => {
        const user = await authed(request, reply);
        if (!user) return;
        const body = request.body ?? {};
        const lists = {};
        const allIds = [];
        for (const st of STATUSES) {
            if (body[st] !== undefined) {
                if (!Array.isArray(body[st])) throw httpError(400, `${st} must be an array`);
                lists[st] = body[st].map(Number);
                allIds.push(...lists[st]);
            }
        }
        if (!allIds.length) return { ok: true };
        if (allIds.some((id) => !Number.isInteger(id))) throw httpError(400, 'todo ids must be integers');
        const ownedRows = await db
            .select({ id: todos.id })
            .from(todos)
            .where(and(eq(todos.userId, user.id), inArray(todos.id, allIds)))
            .execute();
        const owned = new Set(ownedRows.map((r) => r.id));
        if (allIds.some((id) => !owned.has(id))) throw httpError(400, 'todo(s) not found for this user');
        await db.transaction(async (tx) => {
            for (const st of STATUSES) {
                const ids = lists[st];
                if (!ids) continue;
                for (let i = 0; i < ids.length; i++) {
                    await tx.update(todos)
                        .set({ status: st, position: i, updatedAt: new Date() })
                        .where(eq(todos.id, ids[i]));
                }
            }
        });
        return { ok: true };
    });
}