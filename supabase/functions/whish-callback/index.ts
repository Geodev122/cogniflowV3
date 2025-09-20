// supabase/functions/whish-callback/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface WhishCallback {
  order_id: string
  status: 'success' | 'failed'
  amount: string
  currency: string
  transaction_id?: string
  failure_reason?: string
  timestamp: string
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
    console.info('whish-callback incoming headers:', incomingHeaders)
    if (incomingHeaders['role'] || incomingHeaders['x-postgrest-role']) {
      console.warn('Detected role-like header in whish-callback; stripping for safety', {
        role: incomingHeaders['role'] ?? null,
        x_postgrest_role: incomingHeaders['x-postgrest-role'] ?? null
      })
    }
  } catch (e) {
    console.warn('Failed to read headers in whish-callback debug:', e)
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

    // Parse callback data
    const callbackData: WhishCallback = await req.json()
    const { order_id, status, amount, currency, transaction_id, failure_reason, timestamp } = callbackData

    console.log('Whish callback received:', callbackData)

    // Find the transaction record
    const { data: transaction, error: transactionError } = await supabaseClient
      .from('whish_transactions')
      .select('*')
      .eq('whish_order_id', order_id)
      .single()

    if (transactionError || !transaction) {
      console.error('Transaction not found:', order_id)
      return new Response('Transaction not found', { status: 404 })
    }

    // Update transaction status
    const updateData: any = {
      status: status === 'success' ? 'completed' : 'failed',
      whish_invoice_id: transaction_id,
      callback_received_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    if (status === 'success') {
      updateData.paid_at = new Date().toISOString()
    } else {
      updateData.failed_at = new Date().toISOString()
      updateData.failure_reason = failure_reason
    }

    const { error: updateError } = await supabaseClient
      .from('whish_transactions')
      .update(updateData)
      .eq('id', transaction.id)

    if (updateError) {
      throw new Error('Failed to update transaction')
    }

    // If payment successful, create/update subscription
    if (status === 'success') {
      const planMetadata = transaction.metadata as any
      const startDate = new Date()
      const endDate = new Date()
      endDate.setMonth(endDate.getMonth() + planMetadata.plan_duration)

      // Create or update subscription
      const { error: subscriptionError } = await supabaseClient
        .from('subscriptions')
        .upsert({
          user_id: transaction.user_id,
          plan_name: planMetadata.plan_name,
          plan_price: transaction.final_amount,
          billing_interval: planMetadata.plan_duration === 1 ? 'monthly' : 
                           planMetadata.plan_duration === 3 ? 'quarterly' :
                           planMetadata.plan_duration === 6 ? 'biannual' : 'annual',
          status: 'active',
          current_period_start: startDate.toISOString(),
          current_period_end: endDate.toISOString(),
          cancel_at_period_end: false
        }, {
          onConflict: 'user_id'
        })

      if (subscriptionError) {
        console.error('Failed to create subscription:', subscriptionError)
      }

      // Update profile verification if this is first payment
      await supabaseClient
        .from('profiles')
        .update({
          verification_status: 'verified',
          updated_at: new Date().toISOString()
        })
        .eq('id', transaction.user_id)

      // Log successful payment
      await supabaseClient
        .from('audit_logs')
        .insert({
          user_id: transaction.user_id,
          action: 'payment_completed',
          resource_type: 'subscription',
          resource_id: transaction.id,
          details: {
            whish_order_id: order_id,
            whish_transaction_id: transaction_id,
            amount: transaction.final_amount,
            plan_name: planMetadata.plan_name,
            promo_code: transaction.promo_code_used,
            discount_applied: transaction.discount_applied
          }
        })

      console.log('Payment completed successfully for user:', transaction.user_id)
    } else {
      // Log failed payment
      await supabaseClient
        .from('audit_logs')
        .insert({
          user_id: transaction.user_id,
          action: 'payment_failed',
          resource_type: 'subscription',
          resource_id: transaction.id,
          details: {
            whish_order_id: order_id,
            failure_reason: failure_reason,
            amount: transaction.final_amount
          }
        })

      console.log('Payment failed for user:', transaction.user_id, 'Reason:', failure_reason)
    }

    // Refresh membership analytics
    await supabaseClient.rpc('refresh_membership_analytics')

    return new Response('OK', { 
      status: 200,
      headers: corsHeaders 
    })

  } catch (error) {
    console.error('Whish callback error:', error)
    
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})