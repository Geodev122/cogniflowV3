// Minimal fallback `Database` type used when generated Supabase types are
// not present in `src/types/database.ts`.
//
// Long-term: generate types with `supabase gen types typescript --project-id <id>`
// or the Supabase web UI and replace this file with the generated definitions.

export type Database = any

export default Database
