import { readFileSync } from 'fs';
import path from 'path';
import { setupDnsResolver } from '../config/dns.js';
import { pool } from '../config/database.js';

setupDnsResolver();

/**
 * Simple migration runner — executes schema.sql against the database.
 * For a production app, use a proper migration tool (e.g. node-pg-migrate).
 * This approach is sufficient for initial setup and hackathon-to-production transition.
 */
async function migrate() {
  const schemaPath = path.resolve(import.meta.dirname, 'schema.sql');
  const schema = readFileSync(schemaPath, 'utf-8');

  try {
    await pool.query(schema);
    console.log('[Migrate] Schema applied successfully');
  } catch (err) {
    console.error('[Migrate] Failed to apply schema:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
