import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { tables } from './schema.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set — create .env first');
    process.exit(1);
}

export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema: tables });

export async function waitForDb() {
    for (;;) {
        try {
            await pool.query('SELECT 1');
            return;
        } catch {
            console.log('waiting for postgres…');
            await new Promise((r) => setTimeout(r, 1500));
        }
    }
}

// purge sessions that passed their expiry
export async function cleanupExpiredSessions() {
    await pool.query('DELETE FROM sessions WHERE expires_at < now()');
}

// idempotent — runs on every boot; extend schema.sql to evolve the database
export async function applySchema() {
    const raw = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    for (const stmt of raw.split(';').map((s) => s.trim()).filter(Boolean)) {
        await pool.query(stmt);
    }
    console.log('schema applied');
}