// src/hooks/useMembership.ts
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './useAuth'
import { WhishPayService } from '../lib/whishPay'

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

export const useMembership = () => {
  const { user, profile } = useAuth()
  
  const [plans, setPlans] = useState<MembershipPlan[]>([])
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [transactions, setTransactions] = useState<WhishTransaction[]>([])
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadMembershipData = useCallback(async () => {
    if (!user || !profile) return

    setLoading(true)
    setError(null)

    try {
      // Load membership plans
      const plansData = await WhishPayService.getMembershipPlans()
      setPlans(plansData)

      // Load current subscription (therapists only)
      if (profile.role === 'therapist') {
        const subData = await WhishPayService.getCurrentSubscription(user.id)
        setSubscription(subData)

        // Load transaction history
        const transData = await WhishPayService.getTransactionHistory(user.id)
        setTransactions(transData)

        // Load payment requests
        const requestsData = await WhishPayService.getPaymentRequests(user.id)
        setPaymentRequests(requestsData)
      }
    } catch (err: any) {
      console.error('Error loading membership data:', err)
      setError(err.message || 'Failed to load membership data')
    } finally {
      setLoading(false)
    }
  }, [user, profile])

  useEffect(() => {
    if (user && profile) {
      loadMembershipData()
    }
  }, [user, profile, loadMembershipData])

  const initiatePayment = useCallback(async (
    planId: string,
    promoCode?: string
  ): Promise<{ success: boolean; paymentUrl?: string; error?: string }> => {
    if (!user || !profile) {
      return { success: false, error: 'User not authenticated' }
    }

    try {
      const result = await WhishPayService.initiatePayment({
        planId,
        promoCode,
        userEmail: profile.email,
        userPhone: profile.phone || profile.whatsapp_number || '',
        userName: `${profile.first_name} ${profile.last_name}`
      })

      if (result.success && result.paymentUrl) {
        // Refresh data after payment initiation
        setTimeout(() => {
          loadMembershipData()
        }, 1000)

        return {
          success: true,
          paymentUrl: result.paymentUrl
        }
      } else {
        return {
          success: false,
          error: result.error || 'Payment initiation failed'
        }
      }
    } catch (err: any) {
      console.error('Payment initiation error:', err)
      return {
        success: false,
        error: err.message || 'Payment initiation failed'
      }
    }
  }, [user, profile, loadMembershipData])

  const validatePromoCode = useCallback(async (
    code: string,
    planId: string
  ): Promise<{
    isValid: boolean
    discountAmount: number
    finalAmount: number
    errorMessage?: string
  }> => {
    const plan = plans.find(p => p.id === planId)
    if (!plan) {
      return {
        isValid: false,
        discountAmount: 0,
        finalAmount: 0,
        errorMessage: 'Plan not found'
      }
    }

    return await WhishPayService.validatePromoCode(code, plan.price_usd, planId)
  }, [plans])

  const cancelSubscription = useCallback(async (): Promise<boolean> => {
    if (!subscription) return false

    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({
          cancel_at_period_end: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', subscription.id)

      if (error) throw error

      await loadMembershipData()
      return true
    } catch (err: any) {
      console.error('Error canceling subscription:', err)
      setError(err.message || 'Failed to cancel subscription')
      return false
    }
  }, [subscription, loadMembershipData])

  const reactivateSubscription = useCallback(async (): Promise<boolean> => {
    if (!subscription) return false

    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({
          cancel_at_period_end: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', subscription.id)

      if (error) throw error

      await loadMembershipData()
      return true
    } catch (err: any) {
      console.error('Error reactivating subscription:', err)
      setError(err.message || 'Failed to reactivate subscription')
      return false
    }
  }, [subscription, loadMembershipData])

  return {
    // Data
    plans,
    subscription,
    transactions,
    paymentRequests,
    loading,
    error,

    // Actions
    loadMembershipData,
    initiatePayment,
    validatePromoCode,
    cancelSubscription,
    reactivateSubscription,

    // Computed values
    isSubscribed: !!subscription && subscription.status === 'active',
    isPastDue: !!subscription && subscription.status === 'past_due',
    isCanceled: !!subscription && subscription.status === 'canceled',
    daysUntilRenewal: subscription 
      ? Math.ceil((new Date(subscription.current_period_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null,
    hasPaymentRequests: paymentRequests.some(r => r.status === 'sent'),
  }
}

export default useMembership