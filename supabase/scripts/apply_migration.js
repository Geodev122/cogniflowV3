#!/usr/bin/env node
// supabase/scripts/apply_migration.js
// Simple migration runner: executes the specified SQL file against a Postgres
// database. It reads DATABASE_URL (preferred) or SUPABASE_DATABASE_URL from the
// environment. It will refuse to run if neither is provided.

import fs from 'fs'
import path from 'path'
import { Client } from 'pg'

const MIGRATION = process.argv[2] || process.env.MIGRATION_FILE || path.join(process.cwd(), 'supabase', 'migrations', '20251001120000_add_interactive_schema_to_resource_library.sql')
const DATABASE_URL = process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL || process.env.SUPABASE_SERVICE_ROLE_KEY

if (!DATABASE_URL) {
  console.error('No DATABASE_URL / SUPABASE_DATABASE_URL / SUPABASE_SERVICE_ROLE_KEY found in environment.')
  console.error('Set DATABASE_URL to a Postgres connection string with sufficient privileges (service_role) and re-run:')
  console.error('  node supabase/scripts/apply_migration.js')
  process.exit(2)
}

if (!fs.existsSync(MIGRATION)) {
  console.error('Migration file not found:', MIGRATION)
  process.exit(3)
}

const sql = fs.readFileSync(MIGRATION, 'utf8')

;(async function main(){
  const client = new Client({ connectionString: DATABASE_URL })
  try {
    console.log('Connecting to DB...')
    await client.connect()
    console.log('Beginning transaction and applying migration:', MIGRATION)
    await client.query('BEGIN')
    await client.query(sql)
    await client.query('COMMIT')
    console.log('Migration applied successfully.')
  } catch (err) {
    try { await client.query('ROLLBACK') } catch (_) {}
    console.error('Migration failed:', err.message || err)
    process.exitCode = 1
  } finally {
    await client.end()
  }
})()
