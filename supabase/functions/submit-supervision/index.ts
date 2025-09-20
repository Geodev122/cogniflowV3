import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface SupervisionRequest {
  caseId: string
  supervisorId?: string
  title?: string
  notes?: string
  priority?: number
  attachments?: Array<{
    filename: string
    file_path: string
    file_size: number
    mime_type: string
  }>
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Defensive: inspect and log incoming headers to detect any Role-like headers
  try {
    const incomingHeaders: Record<string,string> = {}
    for (const [k,v] of req.headers.entries()) incomingHeaders[k] = v
    console.info('submit-supervision incoming headers:', incomingHeaders)
    if (incomingHeaders['role'] || incomingHeaders['x-postgrest-role']) {
      console.warn('Detected role-like header in submit-supervision; stripping for safety', {
        role: incomingHeaders['role'] ?? null,
        x_postgrest_role: incomingHeaders['x-postgrest-role'] ?? null
      })
    }
  } catch (e) {
    console.warn('Failed to read headers in submit-supervision debug:', e)
  }

  try {
    // Safe fetch wrapper: strip role-like headers from outgoing requests to PostgREST
    const safeFetch = (input: RequestInfo, init?: RequestInit) => {
      const nextInit: RequestInit = { ...(init || {}) }
      const headers = new Headers(nextInit.headers as HeadersInit)
      headers.delete('role')
      headers.delete('Role')
      headers.delete('x-postgrest-role')
      nextInit.headers = headers
      return fetch(input, nextInit)
    }

    // Initialize Supabase client (use service role key) and ensure outgoing requests
    // do not contain any role-like headers that PostgREST would treat as SET ROLE.
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { fetch: safeFetch }
    )

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    
    if (authError || !user) {
      throw new Error('Invalid authentication')
    }

    // Verify user is a therapist
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !['therapist', 'supervisor'].includes(profile?.role)) {
      throw new Error('Only therapists can submit supervision requests')
    }

    const body: SupervisionRequest = await req.json()
    const { caseId, supervisorId, title, notes, priority, attachments } = body

    // Verify case access using the permission function
    const { data: hasPermission, error: permError } = await supabaseClient
      .rpc('check_case_permissions', {
        case_id_param: caseId,
        user_id_param: user.id,
        action_param: 'submit_supervision'
      })

    if (permError || !hasPermission) {
      throw new Error('You do not have permission to submit supervision for this case')
    }

    // Get case details for audit logging
    const { data: caseData, error: caseError } = await supabaseClient
      .from('cases')
      .select('case_number, client_id, therapist_id, status')
      .eq('id', caseId)
      .single()

    if (caseError || !caseData) {
      throw new Error('Case not found')
    }

    // Create supervision request
    const { data: supervisionRequest, error: requestError } = await supabaseClient
      .from('supervision_requests')
      .insert({
        case_id: caseId,
        requester_id: user.id,
        supervisor_id: supervisorId || null,
        title: title || `Supervision Request - Case ${caseData.case_number}`,
        notes: notes || null,
        priority: priority || 1,
        status: 'pending'
      })
      .select()
      .single()

    if (requestError) {
      throw new Error('Failed to create supervision request')
    }

    // Handle attachments if provided
    if (attachments && attachments.length > 0) {
      const attachmentInserts = attachments.map(att => ({
        supervision_request_id: supervisionRequest.id,
        filename: att.filename,
        file_path: att.file_path,
        file_size: att.file_size,
        mime_type: att.mime_type,
        uploaded_by: user.id
      }))

      const { error: attachmentError } = await supabaseClient
        .from('supervision_attachments')
        .insert(attachmentInserts)

      if (attachmentError) {
        console.error('Failed to save attachments:', attachmentError)
        // Don't fail the whole request for attachment errors
      }
    }

    // Log the action
    await supabaseClient.rpc('log_case_action', {
      case_id_param: caseId,
      actor_id_param: user.id,
      action_param: 'SUBMIT_SUPERVISION',
      details_param: {
        supervision_request_id: supervisionRequest.id,
        supervisor_id: supervisorId,
        title: title,
        priority: priority,
        attachment_count: attachments?.length || 0
      }
    })

    // Send notification to supervisor (if specified)
    if (supervisorId) {
      // You can implement email/push notifications here
      console.log(`Supervision request created for supervisor: ${supervisorId}`)
    }

    return new Response(
      JSON.stringify({
        success: true,
        supervisionRequestId: supervisionRequest.id,
        message: 'Supervision request submitted successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Submit supervision error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})