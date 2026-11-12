// API tests for the per-user ownership rules.
//
// Run against a scratch Postgres (NOT the production database):
//   docker run -d --name rt-test -e POSTGRES_PASSWORD=test \
//     -p 127.0.0.1:5544:5432 postgres:16-alpine
//   DATABASE_URL=postgres://postgres:test@127.0.0.1:5544/postgres npm test
//
// Skipped automatically when DATABASE_URL is not set.
import test from 'node:test';
import assert from 'node:assert/strict';

// db.js exits on import when DATABASE_URL is missing, so the app modules
// are only imported once the skip check has passed.
const skip = process.env.DATABASE_URL ? false : 'DATABASE_URL not set';

test('ownership rules across users', { skip }, async (t) => {
    // Tests get an open registration gate, independent of the host env.
    process.env.ALLOW_REGISTRATION = 'true';
    const { waitForDb, applySchema } = await import('../server/db.js');
    // waitForDb retries forever — bound it so a wrong DATABASE_URL fails fast
    await Promise.race([
        waitForDb(),
        new Promise((_, rej) => setTimeout(() => rej(new Error('database not reachable within 10s')), 10000)),
    ]);
    await applySchema(); // idempotent; the scratch DB starts empty
    const { buildApp } = await import('../server/app.js');
    const app = await buildApp();

    async function register(username) {
        const res = await app.inject({
            method: 'POST',
            url: '/api/register',
            payload: { username, password: 'longenough1' },
        });
        assert.equal(res.statusCode, 200, `register ${username}: ${res.body}`);
        // inject delivers set-cookie as a string, not an array
        const setCookie = res.headers['set-cookie'];
        const raw = Array.isArray(setCookie) ? setCookie[0] : setCookie;
        return { user: res.json(), cookie: raw.split(';')[0] };
    }

    // Unique per run so the test works on any database, not only a fresh one
    const run = Date.now();
    const alice = await register(`alice_${run}`);
    const bob = await register(`bob_${run}`);

    const tagRes = await app.inject({
        method: 'POST',
        url: '/api/tags',
        payload: { name: 'work' },
        headers: { cookie: alice.cookie },
    });
    const tagId = tagRes.json().id;
    const todoRes = await app.inject({
        method: 'POST',
        url: '/api/todos',
        payload: { title: 'alice todo', tagIds: [tagId] },
        headers: { cookie: alice.cookie },
    });
    const todoId = todoRes.json().id;

    await t.test("bob's board does not contain alice's todos", async () => {
        const res = await app.inject({ method: 'GET', url: '/api/board', headers: { cookie: bob.cookie } });
        assert.ok(res.json().todos.every((x) => x.id !== todoId));
    });

    await t.test('bob gets 404 patching or deleting alice\'s todo', async () => {
        const p = await app.inject({
            method: 'PATCH',
            url: `/api/todos/${todoId}`,
            payload: { title: 'stolen' },
            headers: { cookie: bob.cookie },
        });
        assert.equal(p.statusCode, 404);
        const d = await app.inject({ method: 'DELETE', url: `/api/todos/${todoId}`, headers: { cookie: bob.cookie } });
        assert.equal(d.statusCode, 404);
    });

    await t.test('bob cannot assign alice\'s tags to his todos', async () => {
        const res = await app.inject({
            method: 'POST',
            url: '/api/todos',
            payload: { title: 'with alice tag', tagIds: [tagId] },
            headers: { cookie: bob.cookie },
        });
        assert.equal(res.statusCode, 400);
    });

    await t.test('bob cannot reorder alice\'s todos', async () => {
        const res = await app.inject({
            method: 'POST',
            url: '/api/reorder',
            payload: { planned: [todoId] },
            headers: { cookie: bob.cookie },
        });
        assert.equal(res.statusCode, 400);
    });

    await t.test('alice can still patch her own todo', async () => {
        const res = await app.inject({
            method: 'PATCH',
            url: `/api/todos/${todoId}`,
            payload: { title: 'still mine' },
            headers: { cookie: alice.cookie },
        });
        assert.equal(res.statusCode, 200);
    });

    await app.close();
});
