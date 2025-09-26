// supabase/functions/whish-payment/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface WhishPaymentRequest {
  planId: string
  promoCode?: string
  userEmail: string
  userPhone: string
  userName?: string
}

interface WhishApiResponse {
  success: boolean
  message: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Temporary: log and inspect incoming headers to detect any 'Role' header that
  // could be interpreted by PostgREST as a SET ROLE instruction (causing
  // errors like: role "therapist" does not exist). We don't forward incoming
  // headers to the Supabase client below; this is only diagnostic logging to
  // confirm whether a problematic header is present in the failing environment.
  try {
    const incomingHeaders: Record<string, string> = {}
    for (const [k, v] of req.headers.entries()) {
      incomingHeaders[k] = v
    }
    console.info('whish-payment incoming headers:', incomingHeaders)
    // Detect common header names that PostgREST recognizes for role switching
    if (incomingHeaders['role'] || incomingHeaders['x-postgrest-role']) {
      console.warn('Detected role-like header in request; will avoid forwarding it to PostgREST.', {
        role: incomingHeaders['role'] ?? null,
        x_postgrest_role: incomingHeaders['x-postgrest-role'] ?? null
      })
    }
  } catch (hdrErr) {
    console.warn('Failed to read incoming headers for whish-payment debug:', hdrErr)
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

    if (profileError || profile?.role !== 'therapist') {
      throw new Error('Only therapists can purchase memberships')
    }

    const body: WhishPaymentRequest = await req.json()
    const { planId, promoCode, userEmail, userPhone, userName } = body

    // Get membership plan details
    const { data: plan, error: planError } = await supabaseClient
      .from('membership_plans')
      .select('*')
      .eq('id', planId)
      .eq('is_active', true)
      .single()

    if (planError || !plan) {
      throw new Error('Invalid membership plan')
    }

    // Calculate pricing with promo code if provided
    let finalAmount = plan.price_usd
    let discountApplied = 0
    let promoCodeUsed = null

    if (promoCode) {
      const { data: discountResult, error: discountError } = await supabaseClient
        .rpc('calculate_promo_discount', {
          p_code: promoCode,
          p_amount: plan.price_usd,
          p_plan_id: planId
        })

      if (discountError) {
        throw new Error('Error calculating discount')
      }

      const discount = discountResult[0]
      if (!discount.is_valid) {
        throw new Error(discount.error_message)
      }

      finalAmount = discount.final_amount
      discountApplied = discount.discount_amount
      promoCodeUsed = promoCode
    }

    // Get Whish Pay configuration
    const { data: whishConfig, error: configError } = await supabaseClient
      .from('whish_pay_config')
      .select('*')
      .eq('is_active', true)
      .single()

    if (configError || !whishConfig) {
      throw new Error('Whish Pay not configured')
    }

    // Generate unique order ID
    const orderId = `THPY_${Date.now()}_${user.id.slice(0, 8)}`

    // Create transaction record
    const { data: transaction, error: transactionError } = await supabaseClient
      .from('whish_transactions')
      .insert({
        user_id: user.id,
        whish_order_id: orderId,
        amount: plan.price_usd,
        currency: 'USD',
        status: 'pending',
        promo_code_used: promoCodeUsed,
        discount_applied: discountApplied,
        final_amount: finalAmount,
        customer_email: userEmail,
        customer_phone: userPhone,
        customer_name: userName,
        metadata: {
          plan_id: planId,
          plan_name: plan.name,
          plan_duration: plan.duration_months
        }
      })
      .select()
      .single()

    if (transactionError) {
      throw new Error('Failed to create transaction record')
    }

    // Prepare Whish Pay API request
    const whishPayload = new URLSearchParams({
      website: whishConfig.website_url,
      secret: whishConfig.secret_token,
      order_id: orderId,
      invoice: `Thera-PY ${plan.name} Subscription`,
      amount: finalAmount.toString(),
      currency: 'USD',
      order_user_email: userEmail,
      order_billing_phone: userPhone,
      order_first_name: userName?.split(' ')[0] || '',
      order_last_name: userName?.split(' ').slice(1).join(' ') || ''
    })

    // Call Whish Pay API
    const whishResponse = await fetch('https://pay.codnloc.com/api.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: whishPayload
    })

    const whishResult: WhishApiResponse = await whishResponse.json()

    // Update transaction with Whish response
    await supabaseClient
      .from('whish_transactions')
      .update({
        payment_url: whishResult.success ? whishResult.message : null,
        whish_response: whishResult,
        updated_at: new Date().toISOString()
      })
      .eq('id', transaction.id)

    if (!whishResult.success) {
      throw new Error(`Whish Pay error: ${whishResult.message}`)
    }

    // Increment promo code usage if applicable
    if (promoCodeUsed) {
      await supabaseClient.rpc('increment_promo_usage', { p_code: promoCodeUsed })
    }

    // Log successful payment initiation
    await supabaseClient
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'payment_initiated',
        resource_type: 'subscription',
        resource_id: transaction.id,
        details: {
          plan_name: plan.name,
          amount: finalAmount,
          promo_code: promoCodeUsed,
          discount_applied: discountApplied
        }
      })

    return new Response(
      JSON.stringify({
        success: true,
        paymentUrl: whishResult.message,
        transactionId: transaction.id,
        finalAmount: finalAmount,
        discountApplied: discountApplied
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Whish payment error:', error)
    
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