import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

// Example Edge function to be deployed with Supabase Edge Functions or any serverless platform
// This endpoint is intended to be called by a server-side signup handler or webhook when a new auth.user is created.

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') return res.status(405).send('Method not allowed')
    const { user_id, role = 'Client' } = req.body
    if (!user_id) return res.status(400).send('user_id required')

    // Only service role allowed
    // Insert profile if missing
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user_id)
      .maybeSingle()

    if (error) return res.status(500).send(error.message)

    if (!data) {
      const { error: insErr } = await supabase
        .from('profiles')
        .insert({ user_id, user_role: role })
      if (insErr) return res.status(500).send(insErr.message)
    }

    return res.status(200).json({ ok: true })
  } catch (e: any) {
    return res.status(500).send(e?.message || 'Unknown error')
  }
}
