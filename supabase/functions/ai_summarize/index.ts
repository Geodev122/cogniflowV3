// supabase/functions/ai_summarize/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
// Call your AI provider here (OpenAI, etc.)
serve(async (req) => {
  try {
    const { texts } = await req.json()
    const combined = (texts || []).join('\n').slice(0, 4000)
    // TODO: call LLM; here we make a trivial "summary":
    const firstLines = combined.split('\n').map(s=>s.trim()).filter(Boolean).slice(0,8)
    const summary = firstLines.length ? `• ${firstLines.join('\n• ')}` : 'No salient highlights.'
    return new Response(JSON.stringify({ summary }), { headers: { 'Content-Type': 'application/json' } })
  } catch {
    return new Response(JSON.stringify({ summary: 'No highlights.' }), { headers: { 'Content-Type': 'application/json' } })
  }
})
