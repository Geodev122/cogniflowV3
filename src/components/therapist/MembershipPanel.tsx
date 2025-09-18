// src/components/therapist/MembershipPanel.tsx
import React, { useEffect, useState } from 'react'
import { 
  CreditCard, Crown, Gift, Calendar, DollarSign, CheckCircle, 
  Clock, AlertTriangle, Loader2, Star, Zap, Shield, Sparkles,
  ExternalLink, Copy, RefreshCw
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

interface MembershipPlan {
  id: string
  name: string
  description: string
  plan_type: 'monthly' | 'quarterly' | 'biannual' | 'annual'
  price_usd: number
  price_lbp: number
  duration_months: number
  features: string[]
  sort_order: number
}

interface PromoCode {
  code: string
  name: string
  description: string
  discount_type: 'percentage' | 'fixed_amount'
  discount_value: number
  min_amount?: number
  max_discount?: number
}

interface Subscription {
  id: string
  plan_name: string
  plan_price: number
  billing_interval: string
  status: 'active' | 'past_due' | 'canceled' | 'trialing' | 'inactive'
  current_period_start: string
  current_period_end: string
  cancel_at_period_end: boolean
  canceled_at: string | null
}

interface WhishTransaction {
  id: string
  whish_order_id: string
  amount: number
  final_amount: number
  currency: string
  status: 'pending' | 'completed' | 'failed' | 'refunded'
  promo_code_used: string | null
  discount_applied: number
  payment_url: string | null
  paid_at: string | null
  created_at: string
}

interface PaymentRequest {
  id: string
  amount: number
  currency: string
  description: string
  due_date: string | null
  status: 'pending' | 'sent' | 'paid' | 'overdue' | 'cancelled'
  sent_at: string | null
  paid_at: string | null
  reminder_count: number
  whish_transaction_id: string | null
  created_at: string
}

export const MembershipPanel: React.FC = () => {
  const { user, profile, loading: authLoading } = useAuth()
  
  // State management
  const [plans, setPlans] = useState<MembershipPlan[]>([])
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [transactions, setTransactions] = useState<WhishTransaction[]>([])
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Payment flow state
  const [selectedPlan, setSelectedPlan] = useState<MembershipPlan | null>(null)
  const [promoCode, setPromoCode] = useState('')
  const [promoApplied, setPromoApplied] = useState<{
    code: string
    discount: number
    finalAmount: number
  } | null>(null)
  const [processingPayment, setProcessingPayment] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)

  // Load data
  useEffect(() => {
    if (profile?.role === 'therapist') {
      loadMembershipData()
    }
  }, [profile])

  const loadMembershipData = async () => {
    if (!user) return
    
    setLoading(true)
    setError(null)
    
    try {
      // Load membership plans
      const { data: plansData, error: plansError } = await supabase
        .from('membership_plans')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')

      if (plansError) throw plansError
      setPlans(plansData || [])

      // Load current subscription
      const { data: subData, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (subError && subError.code !== 'PGRST116') throw subError
      setSubscription(subData)

      // Load transaction history
      const { data: transData, error: transError } = await supabase
        .from('whish_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (transError) throw transError
      setTransactions(transData || [])

      // Load payment requests (admin-triggered)
      const { data: requestsData, error: requestsError } = await supabase
        .from('payment_requests')
        .select('*')
        .eq('target_therapist_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5)

      if (requestsError) throw requestsError
      setPaymentRequests(requestsData || [])

    } catch (err: any) {
      console.error('Error loading membership data:', err)
      setError(err.message || 'Failed to load membership data')
    } finally {
      setLoading(false)
    }
  }

  const validatePromoCode = async (code: string, planId: string) => {
    if (!code.trim()) {
      setPromoApplied(null)
      return
    }

    try {
      const plan = plans.find(p => p.id === planId)
      if (!plan) return

      const { data, error } = await supabase
        .rpc('calculate_promo_discount', {
          p_code: code.trim().toUpperCase(),
          p_amount: plan.price_usd,
          p_plan_id: planId
        })

      if (error) throw error

      const result = data[0]
      if (result.is_valid) {
        setPromoApplied({
          code: code.trim().toUpperCase(),
          discount: result.discount_amount,
          finalAmount: result.final_amount
        })
        setError(null)
      } else {
        setPromoApplied(null)
        setError(result.error_message)
      }
    } catch (err: any) {
      console.error('Promo validation error:', err)
      setPromoApplied(null)
      setError('Failed to validate promo code')
    }
  }

  const initiatePayment = async (plan: MembershipPlan) => {
    if (!user || !profile) return

    setProcessingPayment(true)
    setError(null)

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whish-payment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          planId: plan.id,
          promoCode: promoApplied?.code,
          userEmail: profile.email,
          userPhone: profile.phone || profile.whatsapp_number || '',
          userName: `${profile.first_name} ${profile.last_name}`
        })
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Payment initiation failed')
      }

      // Redirect to Whish Pay
      window.open(result.paymentUrl, '_blank', 'noopener,noreferrer')
      
      // Close modal and refresh data
      setShowPaymentModal(false)
      setSelectedPlan(null)
      setPromoCode('')
      setPromoApplied(null)
      
      // Refresh data after a delay to catch callback
      setTimeout(() => {
        loadMembershipData()
      }, 2000)

    } catch (err: any) {
      console.error('Payment initiation error:', err)
      setError(err.message || 'Failed to initiate payment')
    } finally {
      setProcessingPayment(false)
    }
  }

  const payRequest = async (request: PaymentRequest) => {
    if (!request.whish_transaction_id) return

    try {
      const { data: transaction, error } = await supabase
        .from('whish_transactions')
        .select('payment_url')
        .eq('id', request.whish_transaction_id)
        .single()

      if (error || !transaction?.payment_url) {
        throw new Error('Payment URL not available')
      }

      window.open(transaction.payment_url, '_blank', 'noopener,noreferrer')
    } catch (err: any) {
      console.error('Error opening payment:', err)
      setError('Failed to open payment link')
    }
  }

  const getPlanIcon = (planType: string) => {
    switch (planType) {
      case 'monthly': return <Calendar className="w-5 h-5 text-blue-600" />
      case 'quarterly': return <Zap className="w-5 h-5 text-purple-600" />
      case 'biannual': return <Star className="w-5 h-5 text-amber-600" />
      case 'annual': return <Crown className="w-5 h-5 text-emerald-600" />
      default: return <CreditCard className="w-5 h-5 text-gray-600" />
    }
  }

  const getPlanBadge = (planType: string) => {
    switch (planType) {
      case 'quarterly': return <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">Save 11%</span>
      case 'biannual': return <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">Save 17%</span>
      case 'annual': return <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-medium">Best Value - Save 25%</span>
      default: return null
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-700 bg-green-100 border-green-200'
      case 'past_due': return 'text-amber-700 bg-amber-100 border-amber-200'
      case 'canceled': return 'text-red-700 bg-red-100 border-red-200'
      case 'trialing': return 'text-blue-700 bg-blue-100 border-blue-200'
      case 'completed': return 'text-green-700 bg-green-100 border-green-200'
      case 'pending': return 'text-blue-700 bg-blue-100 border-blue-200'
      case 'failed': return 'text-red-700 bg-red-100 border-red-200'
      case 'sent': return 'text-purple-700 bg-purple-100 border-purple-200'
      case 'overdue': return 'text-red-700 bg-red-100 border-red-200'
      default: return 'text-gray-700 bg-gray-100 border-gray-200'
    }
  }

  if (authLoading || loading) {
    return (
      <div className="p-6 grid place-items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!user || profile?.role !== 'therapist') {
    return (
      <div className="p-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
          <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto mb-2" />
          <h3 className="text-gray-900 font-semibold">Therapist access only</h3>
          <p className="text-sm text-gray-600 mt-1">Membership management is available for therapists only.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Crown className="w-6 h-6 text-blue-600" />
            Membership & Billing
          </h2>
          <p className="text-gray-600 mt-1">Manage your Thera-PY subscription and billing</p>
        </div>
        <button
          onClick={loadMembershipData}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-gray-50"
          title="Refresh data"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      {/* Current Subscription Status */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Subscription</h3>
        
        {subscription ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="text-sm text-gray-600">Plan</div>
              <div className="font-semibold text-gray-900">{subscription.plan_name}</div>
              <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(subscription.status)}`}>
                {subscription.status === 'active' && <CheckCircle className="w-3 h-3 mr-1" />}
                {subscription.status === 'past_due' && <Clock className="w-3 h-3 mr-1" />}
                {subscription.status.replace('_', ' ')}
              </span>
            </div>
            
            <div className="space-y-2">
              <div className="text-sm text-gray-600">Billing</div>
              <div className="font-semibold text-gray-900">${subscription.plan_price}/month</div>
              <div className="text-xs text-gray-500 capitalize">{subscription.billing_interval} billing</div>
            </div>
            
            <div className="space-y-2">
              <div className="text-sm text-gray-600">Next Billing</div>
              <div className="font-semibold text-gray-900">
                {new Date(subscription.current_period_end).toLocaleDateString()}
              </div>
              {subscription.cancel_at_period_end && (
                <div className="text-xs text-amber-600">Cancels at period end</div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <Crown className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No Active Subscription</h4>
            <p className="text-gray-600 mb-4">Choose a plan below to get started with Thera-PY</p>
          </div>
        )}
      </div>

      {/* Membership Plans */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Available Plans</h3>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Shield className="w-4 h-4" />
            <span>Powered by Whish Pay</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((plan) => {
            const isCurrentPlan = subscription?.plan_name === plan.name
            const monthlyPrice = plan.price_usd / plan.duration_months
            const savings = plan.duration_months > 1 ? Math.round((1 - monthlyPrice / 15) * 100) : 0

            return (
              <div
                key={plan.id}
                className={`relative border-2 rounded-xl p-6 transition-all hover:shadow-lg ${
                  isCurrentPlan 
                    ? 'border-blue-500 bg-blue-50' 
                    : plan.plan_type === 'annual'
                    ? 'border-emerald-500 bg-gradient-to-br from-emerald-50 to-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                {plan.plan_type === 'annual' && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      BEST VALUE
                    </span>
                  </div>
                )}

                <div className="text-center">
                  <div className="flex justify-center mb-3">
                    {getPlanIcon(plan.plan_type)}
                  </div>
                  
                  <h4 className="text-lg font-semibold text-gray-900 mb-1">{plan.name}</h4>
                  <p className="text-sm text-gray-600 mb-4">{plan.description}</p>
                  
                  <div className="mb-4">
                    <div className="text-3xl font-bold text-gray-900">${plan.price_usd}</div>
                    <div className="text-sm text-gray-600">
                      {plan.duration_months === 1 ? 'per month' : `for ${plan.duration_months} months`}
                    </div>
                    {savings > 0 && (
                      <div className="text-xs text-emerald-600 font-medium mt-1">
                        Save {savings}% vs monthly
                      </div>
                    )}
                  </div>

                  {getPlanBadge(plan.plan_type)}

                  <div className="mt-4 space-y-2 text-left">
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                        <span className="text-gray-700">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => {
                      setSelectedPlan(plan)
                      setShowPaymentModal(true)
                      setPromoCode('')
                      setPromoApplied(null)
                      setError(null)
                    }}
                    disabled={isCurrentPlan || processingPayment}
                    className={`w-full mt-6 py-3 px-4 rounded-lg font-medium transition-all ${
                      isCurrentPlan
                        ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                        : plan.plan_type === 'annual'
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {isCurrentPlan ? 'Current Plan' : 'Choose Plan'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Payment Requests from Admin */}
      {paymentRequests.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-amber-600" />
            Payment Requests
          </h3>
          
          <div className="space-y-3">
            {paymentRequests.map((request) => (
              <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">{request.description}</div>
                    <div className="text-sm text-gray-600">
                      ${request.amount} {request.currency}
                      {request.due_date && (
                        <span className="ml-2">• Due: {new Date(request.due_date).toLocaleDateString()}</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Created: {new Date(request.created_at).toLocaleDateString()}
                      {request.reminder_count > 0 && (
                        <span className="ml-2">• {request.reminder_count} reminder(s) sent</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(request.status)}`}>
                      {request.status}
                    </span>
                    
                    {request.status === 'sent' && request.whish_transaction_id && (
                      <button
                        onClick={() => payRequest(request)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Pay Now
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transaction History */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Transaction History</h3>
        
        {transactions.length === 0 ? (
          <div className="text-center py-8">
            <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600">No transactions yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Discount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {new Date(transaction.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-700">
                      {transaction.whish_order_id}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <div>${transaction.final_amount}</div>
                      {transaction.amount !== transaction.final_amount && (
                        <div className="text-xs text-gray-500 line-through">${transaction.amount}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {transaction.discount_applied > 0 ? (
                        <div className="text-emerald-600 font-medium">
                          -${transaction.discount_applied}
                          {transaction.promo_code_used && (
                            <div className="text-xs text-gray-500">{transaction.promo_code_used}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(transaction.status)}`}>
                        {transaction.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {transaction.status === 'pending' && transaction.payment_url && (
                        <button
                          onClick={() => window.open(transaction.payment_url!, '_blank', 'noopener,noreferrer')}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Complete Payment
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedPlan && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="fixed inset-0 bg-gray-900/50" onClick={() => setShowPaymentModal(false)} />
            
            <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Complete Purchase</h3>
                  <button
                    onClick={() => setShowPaymentModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Plan Summary */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-2">
                      {getPlanIcon(selectedPlan.plan_type)}
                      <div>
                        <div className="font-medium text-gray-900">{selectedPlan.name}</div>
                        <div className="text-sm text-gray-600">{selectedPlan.description}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-sm text-gray-600">Subtotal:</span>
                      <span className="font-medium">${selectedPlan.price_usd}</span>
                    </div>
                    
                    {promoApplied && (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-emerald-600">Discount ({promoApplied.code}):</span>
                          <span className="font-medium text-emerald-600">-${promoApplied.discount}</span>
                        </div>
                        <div className="border-t pt-2 mt-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-gray-900">Total:</span>
                            <span className="font-bold text-lg text-gray-900">${promoApplied.finalAmount}</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Promo Code */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Promo Code (Optional)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                        placeholder="Enter promo code"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <button
                        onClick={() => validatePromoCode(promoCode, selectedPlan.id)}
                        disabled={!promoCode.trim()}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                      >
                        Apply
                      </button>
                    </div>
                    {promoApplied && (
                      <div className="mt-2 text-sm text-emerald-600 flex items-center gap-1">
                        <Gift className="w-4 h-4" />
                        Promo code applied: {promoApplied.code}
                      </div>
                    )}
                  </div>

                  {/* Payment Button */}
                  <button
                    onClick={() => initiatePayment(selectedPlan)}
                    disabled={processingPayment}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {processingPayment ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Shield className="w-4 h-4" />
                        Pay with Whish
                      </>
                    )}
                  </button>

                  <div className="text-xs text-gray-500 text-center">
                    Secure payment powered by Whish Pay. You'll be redirected to complete your payment.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MembershipPanel