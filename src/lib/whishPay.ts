// src/lib/whishPay.ts
import { supabase } from './supabase'

export interface WhishPaymentRequest {
  planId: string
  promoCode?: string
  userEmail: string
  userPhone: string
  userName?: string
}

export interface WhishPaymentResponse {
  success: boolean
  paymentUrl?: string
  transactionId?: string
  finalAmount?: number
  discountApplied?: number
  error?: string
}

export interface AdminPaymentRequest {
  targetTherapistId: string
  supervisorContractId?: string
  amount: number
  currency?: string
  description: string
  dueDate?: string
}

export class WhishPayService {
  private static async getAuthToken(): Promise<string> {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      throw new Error('No authentication token available')
    }
    return session.access_token
  }

  /**
   * Initiate a membership payment for a therapist
   */
  static async initiatePayment(request: WhishPaymentRequest): Promise<WhishPaymentResponse> {
    try {
      const token = await this.getAuthToken()
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whish-payment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      return result
    } catch (error) {
      console.error('Whish payment initiation error:', error)
      throw error
    }
  }

  /**
   * Create an admin-triggered payment request
   */
  static async createAdminPaymentRequest(request: AdminPaymentRequest): Promise<WhishPaymentResponse> {
    try {
      const token = await this.getAuthToken()
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-payment-request`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      return result
    } catch (error) {
      console.error('Admin payment request error:', error)
      throw error
    }
  }

  /**
   * Validate a promo code
   */
  static async validatePromoCode(code: string, amount: number, planId?: string): Promise<{
    isValid: boolean
    discountAmount: number
    finalAmount: number
    errorMessage?: string
  }> {
    try {
      const { data, error } = await supabase
        .rpc('calculate_promo_discount', {
          p_code: code.toUpperCase(),
          p_amount: amount,
          p_plan_id: planId || null
        })

      if (error) throw error

      const result = data[0]
      return {
        isValid: result.is_valid,
        discountAmount: result.discount_amount,
        finalAmount: result.final_amount,
        errorMessage: result.error_message
      }
    } catch (error) {
      console.error('Promo validation error:', error)
      return {
        isValid: false,
        discountAmount: 0,
        finalAmount: amount,
        errorMessage: 'Failed to validate promo code'
      }
    }
  }

  /**
   * Get membership plans
   */
  static async getMembershipPlans(): Promise<any[]> {
    const { data, error } = await supabase
      .from('membership_plans')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')

    if (error) throw error
    return data || []
  }

  /**
   * Get user's current subscription
   */
  static async getCurrentSubscription(userId: string): Promise<any | null> {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error && error.code !== 'PGRST116') throw error
    return data
  }

  /**
   * Get transaction history
   */
  static async getTransactionHistory(userId: string, limit = 10): Promise<any[]> {
    const { data, error } = await supabase
      .from('whish_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  }

  /**
   * Get payment requests for a therapist
   */
  static async getPaymentRequests(therapistId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('payment_requests')
      .select('*')
      .eq('target_therapist_id', therapistId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  /**
   * Send payment reminders (admin only)
   */
  static async sendPaymentReminders(): Promise<number> {
    const { data, error } = await supabase.rpc('send_payment_reminders')
    
    if (error) throw error
    return data || 0
  }

  /**
   * Generate membership analytics (admin only)
   */
  static async generateAnalytics(startDate: string, endDate: string): Promise<string> {
    const { data, error } = await supabase.rpc('generate_membership_analytics', {
      p_start_date: startDate,
      p_end_date: endDate
    })

    if (error) throw error
    return data
  }

  /**
   * Refresh analytics views
   */
  static async refreshAnalytics(): Promise<void> {
    const { error } = await supabase.rpc('refresh_membership_analytics')
    if (error) throw error
  }
}

export default WhishPayService