/**
 * Creates (or updates) the DevLog tables from db/schema.sql.
 *
 *   npm run db:setup
 *
 * Idempotent: safe to run again. Loads DATABASE_URL from .env.local (or .env / the environment).
 */
import dotenv from 'dotenv';
import fs from 'node:fs';
import postgres from 'postgres';
import { pgOptions } from '../lib/pg-options.js';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('✖ DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.');
  process.exit(1);
}

const sql = postgres(url, { ...pgOptions(url), max: 1 });

try {
  await sql.unsafe(fs.readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8'));
  const tables = await sql`
    select table_name from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE' order by table_name`;
  console.log(`✔ Schema applied. Tables: ${tables.map((t) => t.tableName).join(', ')}`);
} catch (err) {
  console.error('✖ Schema setup failed:', err.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
