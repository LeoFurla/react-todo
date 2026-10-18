import { buildApp } from './app.js';
import { waitForDb, applySchema, cleanupExpiredSessions } from './db.js';

const PORT = Number(process.env.PORT || 8092);

await waitForDb();
await applySchema();
await cleanupExpiredSessions();

const app = await buildApp();
await app.listen({ port: PORT, host: '0.0.0.0' });
console.log(`todo board listening on :${PORT}`);