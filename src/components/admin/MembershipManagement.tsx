// src/components/admin/MembershipManagement.tsx
import React, { useEffect, useState } from 'react'
import {
  Crown, Plus, Edit, Trash2, Users, DollarSign, TrendingUp, Gift,
  Calendar, AlertTriangle, CheckCircle, Clock, RefreshCw, Download,
  Send, Eye, BarChart3, Settings, Shield, Sparkles
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
  is_active: boolean
  sort_order: number
  created_at: string
}

interface PromoCode {
  id: string
  code: string
  name: string
  description: string
  discount_type: 'percentage' | 'fixed_amount'
  discount_value: number
  min_amount: number | null
  max_discount: number | null
  usage_limit: number | null
  usage_count: number
  applicable_plans: string[] | null
  valid_from: string
  valid_until: string | null
  is_active: boolean
  created_at: string
}

interface MembershipAnalytics {
  total_revenue: number
  total_transactions: number
  successful_transactions: number
  failed_transactions: number
  new_subscriptions: number
  canceled_subscriptions: number
  active_therapists: number
  promo_code_usage: Record<string, number>
  top_plans: Array<{
    plan_name: string
    subscription_count: number
    revenue: number
  }>
  calculated_at: string
}

interface WhishConfig {
  id: string
  website_url: string
  secret_token: string
  success_redirect_url: string
  failure_redirect_url: string
  callback_url: string
  is_sandbox: boolean
  is_active: boolean
  last_tested_at: string | null
}

export const MembershipManagement: React.FC = () => {
  const { profile } = useAuth()
  
  // State management
  const [activeTab, setActiveTab] = useState<'overview' | 'plans' | 'promos' | 'analytics' | 'config'>('overview')
  const [plans, setPlans] = useState<MembershipPlan[]>([])
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([])
  const [analytics, setAnalytics] = useState<MembershipAnalytics | null>(null)
  const [whishConfig, setWhishConfig] = useState<WhishConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modal states
  const [showPlanModal, setShowPlanModal] = useState(false)
  const [showPromoModal, setShowPromoModal] = useState(false)
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [editingPlan, setEditingPlan] = useState<MembershipPlan | null>(null)
  const [editingPromo, setEditingPromo] = useState<PromoCode | null>(null)

  useEffect(() => {
    if (profile?.role === 'admin') {
      loadAllData()
    }
  }, [profile])

  const loadAllData = async () => {
    setLoading(true)
    setError(null)

    try {
      await Promise.all([
        loadPlans(),
        loadPromoCodes(),
        loadAnalytics(),
        loadWhishConfig()
      ])
    } catch (err: any) {
      console.error('Error loading membership data:', err)
      setError(err.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const loadPlans = async () => {
    const { data, error } = await supabase
      .from('membership_plans')
      .select('*')
      .order('sort_order')

    if (error) throw error
    setPlans(data || [])
  }

  const loadPromoCodes = async () => {
    const { data, error } = await supabase
      .from('promo_codes')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    setPromoCodes(data || [])
  }

  const loadAnalytics = async () => {
    const { data, error } = await supabase
      .from('membership_analytics')
      .select('*')
      .order('calculated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error && error.code !== 'PGRST116') throw error
    setAnalytics(data)
  }

  const loadWhishConfig = async () => {
    const { data, error } = await supabase
      .from('whish_pay_config')
      .select('*')
      .eq('is_active', true)
      .maybeSingle()

    if (error && error.code !== 'PGRST116') throw error
    setWhishConfig(data)
  }

  const generateAnalytics = async () => {
    try {
      const startDate = new Date()
      startDate.setDate(1) // First day of current month
      const endDate = new Date()
      endDate.setMonth(endDate.getMonth() + 1, 0) // Last day of current month

      await supabase.rpc('generate_membership_analytics', {
        p_start_date: startDate.toISOString().split('T')[0],
        p_end_date: endDate.toISOString().split('T')[0]
      })

      await loadAnalytics()
    } catch (err: any) {
      console.error('Error generating analytics:', err)
      setError('Failed to generate analytics')
    }
  }

  const sendPaymentReminders = async () => {
    try {
      const { data, error } = await supabase.rpc('send_payment_reminders')
      
      if (error) throw error
      
      alert(`Sent ${data} payment reminder(s)`)
      await loadAllData()
    } catch (err: any) {
      console.error('Error sending reminders:', err)
      setError('Failed to send payment reminders')
    }
  }

  if (!profile || profile.role !== 'admin') {
    return (
      <div className="p-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
          <AlertTriangle className="w-8 h-8 text-red-600 mx-auto mb-2" />
          <h3 className="text-gray-900 font-semibold">Admin access required</h3>
          <p className="text-sm text-gray-600 mt-1">This section is only available to administrators.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-6 grid place-items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Subscribers</p>
              <p className="text-3xl font-bold text-green-600">{analytics?.active_therapists || 0}</p>
            </div>
            <Users className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
              <p className="text-3xl font-bold text-blue-600">${analytics?.total_revenue || 0}</p>
            </div>
            <DollarSign className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Success Rate</p>
              <p className="text-3xl font-bold text-purple-600">
                {analytics?.total_transactions ? 
                  Math.round((analytics.successful_transactions / analytics.total_transactions) * 100) : 0}%
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Promos</p>
              <p className="text-3xl font-bold text-amber-600">
                {promoCodes.filter(p => p.is_active).length}
              </p>
            </div>
            <Gift className="w-8 h-8 text-amber-600" />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => setShowPlanModal(true)}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
          >
            <Plus className="w-6 h-6 text-blue-600 mb-2" />
            <div className="font-medium text-gray-900">Create Plan</div>
            <div className="text-sm text-gray-600">Add new membership plan</div>
          </button>

          <button
            onClick={() => setShowPromoModal(true)}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
          >
            <Gift className="w-6 h-6 text-amber-600 mb-2" />
            <div className="font-medium text-gray-900">Create Promo</div>
            <div className="text-sm text-gray-600">Generate discount code</div>
          </button>

          <button
            onClick={sendPaymentReminders}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
          >
            <Send className="w-6 h-6 text-purple-600 mb-2" />
            <div className="font-medium text-gray-900">Send Reminders</div>
            <div className="text-sm text-gray-600">Notify overdue payments</div>
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
          <button
            onClick={generateAnalytics}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Analytics
          </button>
        </div>

        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Top Performing Plans</h4>
              <div className="space-y-2">
                {analytics.top_plans?.map((plan, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900">{plan.plan_name}</div>
                      <div className="text-sm text-gray-600">{plan.subscription_count} subscriptions</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-600">${plan.revenue}</div>
                    </div>
                  </div>
                )) || []}
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-3">Promo Code Usage</h4>
              <div className="space-y-2">
                {Object.entries(analytics.promo_code_usage || {}).map(([code, count]) => (
                  <div key={code} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="font-medium text-gray-900">{code}</div>
                    <div className="text-sm text-gray-600">{count} uses</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )

  const renderPlansManagement = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Membership Plans</h3>
        <button
          onClick={() => {
            setEditingPlan(null)
            setShowPlanModal(true)
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Add Plan
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {plans.map((plan) => (
          <div key={plan.id} className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h4 className="font-semibold text-gray-900">{plan.name}</h4>
                <p className="text-sm text-gray-600">{plan.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setEditingPlan(plan)
                    setShowPlanModal(true)
                  }}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => deletePlan(plan.id)}
                  className="p-1 text-gray-400 hover:text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Price:</span>
                <span className="font-bold text-gray-900">${plan.price_usd}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Duration:</span>
                <span className="text-sm text-gray-900">{plan.duration_months} months</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Status:</span>
                <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                  plan.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                }`}>
                  {plan.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            <div className="mt-4">
              <div className="text-sm text-gray-600 mb-2">Features:</div>
              <div className="space-y-1">
                {plan.features.slice(0, 3).map((feature, index) => (
                  <div key={index} className="flex items-center gap-2 text-xs text-gray-700">
                    <CheckCircle className="w-3 h-3 text-green-600" />
                    {feature}
                  </div>
                ))}
                {plan.features.length > 3 && (
                  <div className="text-xs text-gray-500">+{plan.features.length - 3} more</div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const renderPromosManagement = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Promo Codes</h3>
        <button
          onClick={() => {
            setEditingPromo(null)
            setShowPromoModal(true)
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
        >
          <Gift className="w-4 h-4" />
          Create Promo
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Discount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usage</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valid Until</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {promoCodes.map((promo) => (
                <tr key={promo.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{promo.code}</div>
                    <div className="text-sm text-gray-600">{promo.name}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {promo.discount_type === 'percentage' 
                      ? `${promo.discount_value}%` 
                      : `$${promo.discount_value}`}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {promo.usage_count}/{promo.usage_limit || '∞'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {promo.valid_until ? new Date(promo.valid_until).toLocaleDateString() : 'No expiry'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                      promo.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {promo.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingPromo(promo)
                          setShowPromoModal(true)
                        }}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deletePromoCode(promo.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )

  const renderAnalytics = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Revenue Analytics</h3>
        <button
          onClick={generateAnalytics}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <BarChart3 className="w-4 h-4" />
          Generate Report
        </button>
      </div>

      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h4 className="font-semibold text-gray-900 mb-4">Transaction Summary</h4>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Transactions:</span>
                <span className="font-medium">{analytics.total_transactions}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Successful:</span>
                <span className="font-medium text-green-600">{analytics.successful_transactions}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Failed:</span>
                <span className="font-medium text-red-600">{analytics.failed_transactions}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Success Rate:</span>
                <span className="font-medium">
                  {analytics.total_transactions ? 
                    Math.round((analytics.successful_transactions / analytics.total_transactions) * 100) : 0}%
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h4 className="font-semibold text-gray-900 mb-4">Subscription Metrics</h4>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">New Subscriptions:</span>
                <span className="font-medium text-green-600">{analytics.new_subscriptions}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Cancellations:</span>
                <span className="font-medium text-red-600">{analytics.canceled_subscriptions}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Active Therapists:</span>
                <span className="font-medium">{analytics.active_therapists}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Revenue:</span>
                <span className="font-bold text-blue-600">${analytics.total_revenue}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  const renderWhishConfig = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Whish Pay Configuration</h3>
        <button
          onClick={() => setShowConfigModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Settings className="w-4 h-4" />
          Configure
        </button>
      </div>

      {whishConfig ? (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Website URL</label>
                <div className="mt-1 text-sm text-gray-900">{whishConfig.website_url}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Environment</label>
                <div className="mt-1">
                  <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                    whishConfig.is_sandbox ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                  }`}>
                    {whishConfig.is_sandbox ? 'Sandbox' : 'Production'}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Status</label>
                <div className="mt-1">
                  <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                    whishConfig.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {whishConfig.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Success URL</label>
                <div className="mt-1 text-sm text-gray-900 break-all">{whishConfig.success_redirect_url}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Failure URL</label>
                <div className="mt-1 text-sm text-gray-900 break-all">{whishConfig.failure_redirect_url}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Callback URL</label>
                <div className="mt-1 text-sm text-gray-900 break-all">{whishConfig.callback_url}</div>
              </div>
            </div>
          </div>

          {whishConfig.last_tested_at && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-600">
                Last tested: {new Date(whishConfig.last_tested_at).toLocaleString()}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
          <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">Whish Pay Not Configured</h4>
          <p className="text-gray-600 mb-4">Set up your Whish Pay integration to accept payments</p>
          <button
            onClick={() => setShowConfigModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Settings className="w-4 h-4" />
            Configure Now
          </button>
        </div>
      )}
    </div>
  )

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Crown className="w-6 h-6 text-blue-600" />
            Membership Management
          </h2>
          <p className="text-gray-600 mt-1">Manage plans, promo codes, and Whish Pay integration</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', name: 'Overview', icon: BarChart3 },
            { id: 'plans', name: 'Plans', icon: Crown },
            { id: 'promos', name: 'Promo Codes', icon: Gift },
            { id: 'analytics', name: 'Analytics', icon: TrendingUp },
            { id: 'config', name: 'Whish Config', icon: Settings }
          ].map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.name}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'plans' && renderPlansManagement()}
      {activeTab === 'promos' && renderPromosManagement()}
      {activeTab === 'analytics' && renderAnalytics()}
      {activeTab === 'config' && renderWhishConfig()}

      {/* Modals would go here - PlanModal, PromoModal, ConfigModal */}
    </div>
  )
}

export default MembershipManagement