import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface ReferralRequest {
  caseId: string
  toTherapistId: string
  reason?: string
  notes?: string
  handoffData?: any
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
      throw new Error('Only therapists can request referrals')
    }

    const body: ReferralRequest = await req.json()
    const { caseId, toTherapistId, reason, notes, handoffData } = body

    // Verify case access
    const { data: hasPermission, error: permError } = await supabaseClient
      .rpc('check_case_permissions', {
        case_id_param: caseId,
        user_id_param: user.id,
        action_param: 'refer'
      })

    if (permError || !hasPermission) {
      throw new Error('You do not have permission to refer this case')
    }

    // Verify target therapist exists and is active
    const { data: targetTherapist, error: therapistError } = await supabaseClient
      .from('profiles')
      .select('id, first_name, last_name, email, role, is_active')
      .eq('id', toTherapistId)
      .eq('role', 'therapist')
      .eq('is_active', true)
      .single()

    if (therapistError || !targetTherapist) {
      throw new Error('Target therapist not found or inactive')
    }

    // Get case details
    const { data: caseData, error: caseError } = await supabaseClient
      .from('cases')
      .select('case_number, client_id, therapist_id, status')
      .eq('id', caseId)
      .single()

    if (caseError || !caseData) {
      throw new Error('Case not found')
    }

    // Verify case is not already being referred
    const { data: existingReferral, error: existingError } = await supabaseClient
      .from('case_referrals')
      .select('id, status')
      .eq('case_id', caseId)
      .eq('status', 'pending')
      .maybeSingle()

    if (existingError) {
      throw new Error('Error checking existing referrals')
    }

    if (existingReferral) {
      throw new Error('This case already has a pending referral')
    }

    // Create referral request
    const { data: referral, error: referralError } = await supabaseClient
      .from('case_referrals')
      .insert({
        case_id: caseId,
        from_therapist_id: user.id,
        to_therapist_id: toTherapistId,
        reason: reason || null,
        notes: notes || null,
        handoff_data: handoffData || {},
        status: 'pending'
      })
      .select()
      .single()

    if (referralError) {
      throw new Error('Failed to create referral request')
    }

    // Log the action
    await supabaseClient.rpc('log_case_action', {
      case_id_param: caseId,
      actor_id_param: user.id,
      action_param: 'REQUEST_REFERRAL',
      details_param: {
        referral_id: referral.id,
        to_therapist_id: toTherapistId,
        to_therapist_name: `${targetTherapist.first_name} ${targetTherapist.last_name}`,
        reason: reason
      }
    })

    // Send notification to target therapist
    // You can implement email/push notifications here
    console.log(`Referral request sent to therapist: ${targetTherapist.email}`)

    return new Response(
      JSON.stringify({
        success: true,
        referralId: referral.id,
        targetTherapist: {
          id: targetTherapist.id,
          name: `${targetTherapist.first_name} ${targetTherapist.last_name}`,
          email: targetTherapist.email
        },
        message: 'Referral request sent successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Request referral error:', error)
    
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