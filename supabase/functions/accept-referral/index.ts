import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface AcceptReferralRequest {
  referralId: string
  accept: boolean
  notes?: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
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

    if (profileError || profile?.role !== 'therapist') {
      throw new Error('Only therapists can accept referrals')
    }

    const body: AcceptReferralRequest = await req.json()
    const { referralId, accept, notes } = body

    // Get referral details
    const { data: referral, error: referralError } = await supabaseClient
      .from('case_referrals')
      .select(`
        id, case_id, from_therapist_id, to_therapist_id, status,
        case:cases(id, case_number, client_id, therapist_id, status)
      `)
      .eq('id', referralId)
      .eq('to_therapist_id', user.id)
      .eq('status', 'pending')
      .single()

    if (referralError || !referral) {
      throw new Error('Referral not found or you are not authorized to respond')
    }

    const newStatus = accept ? 'accepted' : 'declined'

    // Update referral status
    const { error: updateError } = await supabaseClient
      .from('case_referrals')
      .update({
        status: newStatus,
        decided_at: new Date().toISOString(),
        notes: notes || null
      })
      .eq('id', referralId)

    if (updateError) {
      throw new Error('Failed to update referral status')
    }

    // If accepted, transfer case ownership
    if (accept) {
      // Update case therapist
      const { error: caseUpdateError } = await supabaseClient
        .from('cases')
        .update({
          therapist_id: user.id,
          status: 'active', // Reactivate case for new therapist
          archived_at: null,
          closed_at: null,
          last_activity_at: new Date().toISOString()
        })
        .eq('id', referral.case_id)

      if (caseUpdateError) {
        throw new Error('Failed to transfer case ownership')
      }

      // Update therapist-client relationship
      const { error: relationError } = await supabaseClient
        .from('therapist_client_relations')
        .upsert({
          therapist_id: user.id,
          client_id: referral.case.client_id,
          status: 'active',
          relationship_type: 'primary',
          assigned_at: new Date().toISOString()
        }, {
          onConflict: 'therapist_id,client_id'
        })

      if (relationError) {
        console.error('Failed to update therapist-client relationship:', relationError)
        // Don't fail the whole operation for this
      }

      // Mark referral as completed
      await supabaseClient
        .from('case_referrals')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', referralId)
    }

    // Log the action
    await supabaseClient.rpc('log_case_action', {
      case_id_param: referral.case_id,
      actor_id_param: user.id,
      action_param: accept ? 'ACCEPT_REFERRAL' : 'DECLINE_REFERRAL',
      details_param: {
        referral_id: referralId,
        from_therapist_id: referral.from_therapist_id,
        decision: accept ? 'accepted' : 'declined',
        notes: notes,
        case_transferred: accept
      }
    })

    // Send notification to referring therapist
    console.log(`Referral ${accept ? 'accepted' : 'declined'} by therapist: ${user.id}`)

    return new Response(
      JSON.stringify({
        success: true,
        referralId: referralId,
        decision: newStatus,
        caseTransferred: accept,
        message: `Referral ${accept ? 'accepted' : 'declined'} successfully`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Accept referral error:', error)
    
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