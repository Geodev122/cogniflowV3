// supabase/functions/admin-payment-request/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface PaymentRequestData {
  targetTherapistId: string
  supervisorContractId?: string
  amount: number
  currency?: string
  description: string
  dueDate?: string
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
    console.info('admin-payment-request incoming headers:', incomingHeaders)
    if (incomingHeaders['role'] || incomingHeaders['x-postgrest-role']) {
      console.warn('Detected role-like header in admin-payment-request; stripping for safety', {
        role: incomingHeaders['role'] ?? null,
        x_postgrest_role: incomingHeaders['x-postgrest-role'] ?? null
      })
    }
  } catch (e) {
    console.warn('Failed to read headers in admin-payment-request debug:', e)
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

    // Verify user is an admin
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || profile?.role !== 'admin') {
      throw new Error('Only admins can create payment requests')
    }

    const body: PaymentRequestData = await req.json()
    const { targetTherapistId, supervisorContractId, amount, currency = 'USD', description, dueDate } = body

    // Verify target therapist exists
    const { data: therapist, error: therapistError } = await supabaseClient
      .from('profiles')
      .select('id, first_name, last_name, email, phone')
      .eq('id', targetTherapistId)
      .eq('role', 'therapist')
      .single()

    if (therapistError || !therapist) {
      throw new Error('Target therapist not found')
    }

    // Create payment request
    const { data: paymentRequest, error: requestError } = await supabaseClient
      .from('payment_requests')
      .insert({
        requester_id: user.id,
        target_therapist_id: targetTherapistId,
        supervisor_contract_id: supervisorContractId,
        amount: amount,
        currency: currency,
        description: description,
        due_date: dueDate,
        status: 'pending'
      })
      .select()
      .single()

    if (requestError) {
      throw new Error('Failed to create payment request')
    }

    // Generate Whish payment for the therapist
    const { data: whishConfig, error: configError } = await supabaseClient
      .from('whish_pay_config')
      .select('*')
      .eq('is_active', true)
      .single()

    if (configError || !whishConfig) {
      throw new Error('Whish Pay not configured')
    }

    const orderId = `ADMIN_${Date.now()}_${paymentRequest.id.slice(0, 8)}`

    // Create Whish transaction for this payment request
    const { data: whishTransaction, error: whishTransactionError } = await supabaseClient
      .from('whish_transactions')
      .insert({
        user_id: targetTherapistId,
        whish_order_id: orderId,
        amount: amount,
        currency: currency,
        status: 'pending',
        final_amount: amount,
        customer_email: therapist.email,
        customer_phone: therapist.phone || '',
        customer_name: `${therapist.first_name} ${therapist.last_name}`,
        metadata: {
          payment_request_id: paymentRequest.id,
          type: 'admin_request',
          description: description
        }
      })
      .select()
      .single()

    if (whishTransactionError) {
      throw new Error('Failed to create Whish transaction')
    }

    // Call Whish Pay API
    const whishPayload = new URLSearchParams({
      website: whishConfig.website_url,
      secret: whishConfig.secret_token,
      order_id: orderId,
      invoice: description,
      amount: amount.toString(),
      currency: currency,
      order_user_email: therapist.email,
      order_billing_phone: therapist.phone || '',
      order_first_name: therapist.first_name || '',
      order_last_name: therapist.last_name || ''
    })

    const whishResponse = await fetch('https://pay.codnloc.com/api.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: whishPayload
    })

    const whishResult: WhishApiResponse = await whishResponse.json()

    // Update transaction with payment URL
    await supabaseClient
      .from('whish_transactions')
      .update({
        payment_url: whishResult.success ? whishResult.message : null,
        whish_response: whishResult,
        updated_at: new Date().toISOString()
      })
      .eq('id', whishTransaction.id)

    // Update payment request with transaction link
    await supabaseClient
      .from('payment_requests')
      .update({
        whish_transaction_id: whishTransaction.id,
        sent_at: new Date().toISOString(),
        status: 'sent',
        updated_at: new Date().toISOString()
      })
      .eq('id', paymentRequest.id)

    if (!whishResult.success) {
      throw new Error(`Whish Pay error: ${whishResult.message}`)
    }

    // Log admin action
    await supabaseClient
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'admin_payment_request_created',
        resource_type: 'payment_request',
        resource_id: paymentRequest.id,
        details: {
          target_therapist_id: targetTherapistId,
          amount: amount,
          description: description,
          payment_url: whishResult.message
        }
      })

    return new Response(
      JSON.stringify({
        success: true,
        paymentRequestId: paymentRequest.id,
        paymentUrl: whishResult.message,
        message: 'Payment request created and sent to therapist'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Admin payment request error:', error)
    
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