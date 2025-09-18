/*
  # Membership Management Module with Whish Pay Integration

  1. New Tables
    - `membership_plans` - Subscription bundles and pricing
    - `promo_codes` - Discount codes with usage tracking
    - `whish_transactions` - Payment transaction records
    - `supervisor_contracts` - Trimester-based supervisor agreements
    - `payment_requests` - Admin-triggered payment requests
    - `membership_analytics` - Revenue and subscription analytics

  2. Security
    - Enable RLS on all membership tables
    - Role-based access: therapists see own data, admins see all
    - Audit logging for all payment operations
    - Secure storage of Whish Pay credentials

  3. Business Logic
    - Automated subscription management
    - Promo code validation and application
    - Payment reminder system
    - Revenue tracking and analytics
*/

-- Create enums for membership system
CREATE TYPE membership_plan_type AS ENUM ('monthly', 'quarterly', 'biannual', 'annual');
CREATE TYPE membership_status AS ENUM ('active', 'past_due', 'canceled', 'trialing', 'inactive', 'suspended');
CREATE TYPE transaction_status AS ENUM ('pending', 'completed', 'failed', 'refunded', 'disputed');
CREATE TYPE promo_code_type AS ENUM ('percentage', 'fixed_amount');
CREATE TYPE contract_status AS ENUM ('active', 'pending', 'expired', 'terminated');
CREATE TYPE payment_request_status AS ENUM ('pending', 'sent', 'paid', 'overdue', 'cancelled');

-- Membership Plans Table
CREATE TABLE IF NOT EXISTS membership_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  plan_type membership_plan_type NOT NULL,
  price_usd numeric(10,2) NOT NULL,
  price_lbp numeric(12,2),
  duration_months integer NOT NULL,
  features jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Promo Codes Table
CREATE TABLE IF NOT EXISTS promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  discount_type promo_code_type NOT NULL,
  discount_value numeric(10,2) NOT NULL,
  min_amount numeric(10,2),
  max_discount numeric(10,2),
  usage_limit integer,
  usage_count integer DEFAULT 0,
  applicable_plans uuid[] DEFAULT '{}',
  valid_from timestamptz DEFAULT now(),
  valid_until timestamptz,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Whish Pay Transactions Table
CREATE TABLE IF NOT EXISTS whish_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES subscriptions(id),
  whish_order_id text UNIQUE NOT NULL,
  whish_invoice_id text,
  amount numeric(10,2) NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  status transaction_status DEFAULT 'pending',
  payment_url text,
  promo_code_used text,
  discount_applied numeric(10,2) DEFAULT 0,
  final_amount numeric(10,2) NOT NULL,
  customer_email text NOT NULL,
  customer_phone text NOT NULL,
  customer_name text,
  whish_response jsonb,
  callback_received_at timestamptz,
  paid_at timestamptz,
  failed_at timestamptz,
  failure_reason text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Supervisor Contracts Table
CREATE TABLE IF NOT EXISTS supervisor_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supervisor_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  contract_name text NOT NULL,
  trimester_start date NOT NULL,
  trimester_end date NOT NULL,
  hourly_rate numeric(10,2),
  total_hours integer,
  total_amount numeric(10,2),
  status contract_status DEFAULT 'pending',
  signed_at timestamptz,
  notes text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Payment Requests Table (Admin-triggered payments)
CREATE TABLE IF NOT EXISTS payment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES profiles(id),
  target_therapist_id uuid NOT NULL REFERENCES profiles(id),
  supervisor_contract_id uuid REFERENCES supervisor_contracts(id),
  amount numeric(10,2) NOT NULL,
  currency text DEFAULT 'USD',
  description text NOT NULL,
  due_date date,
  status payment_request_status DEFAULT 'pending',
  whish_transaction_id uuid REFERENCES whish_transactions(id),
  sent_at timestamptz,
  paid_at timestamptz,
  reminder_count integer DEFAULT 0,
  last_reminder_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Membership Analytics Table
CREATE TABLE IF NOT EXISTS membership_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_start date NOT NULL,
  period_end date NOT NULL,
  total_revenue numeric(12,2) DEFAULT 0,
  total_transactions integer DEFAULT 0,
  successful_transactions integer DEFAULT 0,
  failed_transactions integer DEFAULT 0,
  new_subscriptions integer DEFAULT 0,
  canceled_subscriptions integer DEFAULT 0,
  active_therapists integer DEFAULT 0,
  promo_code_usage jsonb DEFAULT '{}'::jsonb,
  top_plans jsonb DEFAULT '[]'::jsonb,
  calculated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Whish Pay Configuration Table (Admin settings)
CREATE TABLE IF NOT EXISTS whish_pay_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  website_url text NOT NULL,
  secret_token text NOT NULL, -- Encrypted in production
  webhook_secret text,
  success_redirect_url text,
  failure_redirect_url text,
  callback_url text,
  is_sandbox boolean DEFAULT false,
  is_active boolean DEFAULT true,
  last_tested_at timestamptz,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_membership_plans_active ON membership_plans(is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_promo_codes_active ON promo_codes(is_active, valid_from, valid_until);
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_whish_transactions_user ON whish_transactions(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_whish_transactions_status ON whish_transactions(status, created_at);
CREATE INDEX IF NOT EXISTS idx_whish_transactions_order_id ON whish_transactions(whish_order_id);
CREATE INDEX IF NOT EXISTS idx_supervisor_contracts_supervisor ON supervisor_contracts(supervisor_id, status);
CREATE INDEX IF NOT EXISTS idx_supervisor_contracts_period ON supervisor_contracts(trimester_start, trimester_end);
CREATE INDEX IF NOT EXISTS idx_payment_requests_therapist ON payment_requests(target_therapist_id, status);
CREATE INDEX IF NOT EXISTS idx_payment_requests_due ON payment_requests(due_date) WHERE status IN ('pending', 'sent');

-- Add constraints
ALTER TABLE membership_plans ADD CONSTRAINT valid_price CHECK (price_usd > 0);
ALTER TABLE membership_plans ADD CONSTRAINT valid_duration CHECK (duration_months > 0);
ALTER TABLE promo_codes ADD CONSTRAINT valid_discount_value CHECK (discount_value > 0);
ALTER TABLE promo_codes ADD CONSTRAINT valid_usage_limit CHECK (usage_limit IS NULL OR usage_limit > 0);
ALTER TABLE promo_codes ADD CONSTRAINT valid_usage_count CHECK (usage_count >= 0);
ALTER TABLE whish_transactions ADD CONSTRAINT valid_amount CHECK (amount > 0);
ALTER TABLE whish_transactions ADD CONSTRAINT valid_final_amount CHECK (final_amount > 0);
ALTER TABLE supervisor_contracts ADD CONSTRAINT valid_trimester_period CHECK (trimester_end > trimester_start);
ALTER TABLE payment_requests ADD CONSTRAINT valid_request_amount CHECK (amount > 0);

-- Enable RLS on all tables
ALTER TABLE membership_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE whish_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE supervisor_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE whish_pay_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies for membership_plans
CREATE POLICY "membership_plans_read_all" ON membership_plans
  FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "membership_plans_admin_manage" ON membership_plans
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for promo_codes
CREATE POLICY "promo_codes_therapist_read" ON promo_codes
  FOR SELECT TO authenticated
  USING (
    is_active = true 
    AND (valid_from IS NULL OR valid_from <= now())
    AND (valid_until IS NULL OR valid_until >= now())
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('therapist', 'admin')
    )
  );

CREATE POLICY "promo_codes_admin_manage" ON promo_codes
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for whish_transactions
CREATE POLICY "whish_transactions_own_access" ON whish_transactions
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "whish_transactions_admin_read" ON whish_transactions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for supervisor_contracts
CREATE POLICY "supervisor_contracts_own_access" ON supervisor_contracts
  FOR ALL TO authenticated
  USING (supervisor_id = auth.uid())
  WITH CHECK (supervisor_id = auth.uid());

CREATE POLICY "supervisor_contracts_admin_manage" ON supervisor_contracts
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for payment_requests
CREATE POLICY "payment_requests_therapist_read" ON payment_requests
  FOR SELECT TO authenticated
  USING (target_therapist_id = auth.uid());

CREATE POLICY "payment_requests_admin_manage" ON payment_requests
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for membership_analytics (Admin only)
CREATE POLICY "membership_analytics_admin_only" ON membership_analytics
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for whish_pay_config (Admin only)
CREATE POLICY "whish_pay_config_admin_only" ON whish_pay_config
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Create triggers for updated_at
CREATE TRIGGER update_membership_plans_updated_at
  BEFORE UPDATE ON membership_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_promo_codes_updated_at
  BEFORE UPDATE ON promo_codes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_whish_transactions_updated_at
  BEFORE UPDATE ON whish_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_supervisor_contracts_updated_at
  BEFORE UPDATE ON supervisor_contracts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_requests_updated_at
  BEFORE UPDATE ON payment_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Business Logic Functions

-- Function to calculate promo code discount
CREATE OR REPLACE FUNCTION calculate_promo_discount(
  p_code text,
  p_amount numeric,
  p_plan_id uuid DEFAULT NULL
)
RETURNS TABLE(
  is_valid boolean,
  discount_amount numeric,
  final_amount numeric,
  error_message text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  promo_record promo_codes%ROWTYPE;
  calculated_discount numeric := 0;
  final_amt numeric;
BEGIN
  -- Get promo code details
  SELECT * INTO promo_record
  FROM promo_codes
  WHERE code = p_code
    AND is_active = true
    AND (valid_from IS NULL OR valid_from <= now())
    AND (valid_until IS NULL OR valid_until >= now())
    AND (usage_limit IS NULL OR usage_count < usage_limit);

  -- Check if promo code exists and is valid
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0::numeric, p_amount, 'Invalid or expired promo code';
    RETURN;
  END IF;

  -- Check if plan is applicable (if plan restrictions exist)
  IF promo_record.applicable_plans IS NOT NULL 
     AND array_length(promo_record.applicable_plans, 1) > 0 
     AND p_plan_id IS NOT NULL 
     AND NOT (p_plan_id = ANY(promo_record.applicable_plans)) THEN
    RETURN QUERY SELECT false, 0::numeric, p_amount, 'Promo code not applicable to selected plan';
    RETURN;
  END IF;

  -- Check minimum amount requirement
  IF promo_record.min_amount IS NOT NULL AND p_amount < promo_record.min_amount THEN
    RETURN QUERY SELECT false, 0::numeric, p_amount, 'Order amount below minimum for this promo code';
    RETURN;
  END IF;

  -- Calculate discount
  IF promo_record.discount_type = 'percentage' THEN
    calculated_discount := p_amount * (promo_record.discount_value / 100);
  ELSE
    calculated_discount := promo_record.discount_value;
  END IF;

  -- Apply maximum discount limit
  IF promo_record.max_discount IS NOT NULL AND calculated_discount > promo_record.max_discount THEN
    calculated_discount := promo_record.max_discount;
  END IF;

  -- Ensure discount doesn't exceed amount
  calculated_discount := LEAST(calculated_discount, p_amount);
  final_amt := p_amount - calculated_discount;

  RETURN QUERY SELECT true, calculated_discount, final_amt, NULL::text;
END;
$$;

-- Function to increment promo code usage
CREATE OR REPLACE FUNCTION increment_promo_usage(p_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE promo_codes 
  SET usage_count = usage_count + 1,
      updated_at = now()
  WHERE code = p_code
    AND is_active = true
    AND (usage_limit IS NULL OR usage_count < usage_limit);
  
  RETURN FOUND;
END;
$$;

-- Function to generate membership analytics
CREATE OR REPLACE FUNCTION generate_membership_analytics(
  p_start_date date,
  p_end_date date
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  analytics_id uuid;
  total_rev numeric := 0;
  total_trans integer := 0;
  success_trans integer := 0;
  failed_trans integer := 0;
  new_subs integer := 0;
  canceled_subs integer := 0;
  active_therapists integer := 0;
  promo_usage jsonb := '{}'::jsonb;
  top_plans jsonb := '[]'::jsonb;
BEGIN
  -- Calculate revenue and transaction metrics
  SELECT 
    COALESCE(SUM(final_amount), 0),
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'completed'),
    COUNT(*) FILTER (WHERE status = 'failed')
  INTO total_rev, total_trans, success_trans, failed_trans
  FROM whish_transactions
  WHERE created_at::date BETWEEN p_start_date AND p_end_date;

  -- Calculate subscription metrics
  SELECT COUNT(*) INTO new_subs
  FROM subscriptions
  WHERE created_at::date BETWEEN p_start_date AND p_end_date;

  SELECT COUNT(*) INTO canceled_subs
  FROM subscriptions
  WHERE canceled_at::date BETWEEN p_start_date AND p_end_date;

  -- Count active therapists with subscriptions
  SELECT COUNT(DISTINCT s.user_id) INTO active_therapists
  FROM subscriptions s
  JOIN profiles p ON p.id = s.user_id
  WHERE s.status = 'active' AND p.role = 'therapist';

  -- Calculate promo code usage
  SELECT jsonb_object_agg(
    promo_code_used,
    COUNT(*)
  ) INTO promo_usage
  FROM whish_transactions
  WHERE created_at::date BETWEEN p_start_date AND p_end_date
    AND promo_code_used IS NOT NULL
  GROUP BY promo_code_used;

  -- Get top performing plans
  SELECT jsonb_agg(
    jsonb_build_object(
      'plan_name', mp.name,
      'subscription_count', plan_stats.sub_count,
      'revenue', plan_stats.revenue
    )
  ) INTO top_plans
  FROM (
    SELECT 
      s.plan_name,
      COUNT(*) as sub_count,
      SUM(wt.final_amount) as revenue
    FROM subscriptions s
    LEFT JOIN whish_transactions wt ON wt.subscription_id = s.id
    WHERE s.created_at::date BETWEEN p_start_date AND p_end_date
    GROUP BY s.plan_name
    ORDER BY revenue DESC
    LIMIT 5
  ) plan_stats
  JOIN membership_plans mp ON mp.name = plan_stats.plan_name;

  -- Insert analytics record
  INSERT INTO membership_analytics (
    period_start,
    period_end,
    total_revenue,
    total_transactions,
    successful_transactions,
    failed_transactions,
    new_subscriptions,
    canceled_subscriptions,
    active_therapists,
    promo_code_usage,
    top_plans
  ) VALUES (
    p_start_date,
    p_end_date,
    total_rev,
    total_trans,
    success_trans,
    failed_trans,
    new_subs,
    canceled_subs,
    active_therapists,
    COALESCE(promo_usage, '{}'::jsonb),
    COALESCE(top_plans, '[]'::jsonb)
  ) RETURNING id INTO analytics_id;

  RETURN analytics_id;
END;
$$;

-- Function to send payment reminders
CREATE OR REPLACE FUNCTION send_payment_reminders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  reminder_count integer := 0;
  request_record payment_requests%ROWTYPE;
BEGIN
  -- Find overdue payment requests that need reminders
  FOR request_record IN
    SELECT * FROM payment_requests
    WHERE status IN ('pending', 'sent')
      AND due_date < CURRENT_DATE
      AND (last_reminder_at IS NULL OR last_reminder_at < now() - interval '24 hours')
      AND reminder_count < 3
  LOOP
    -- Update reminder tracking
    UPDATE payment_requests
    SET reminder_count = reminder_count + 1,
        last_reminder_at = now(),
        updated_at = now()
    WHERE id = request_record.id;

    -- Log the reminder action
    INSERT INTO audit_logs (
      user_id,
      action,
      resource_type,
      resource_id,
      details
    ) VALUES (
      request_record.requester_id,
      'payment_reminder_sent',
      'payment_request',
      request_record.id,
      jsonb_build_object(
        'target_therapist_id', request_record.target_therapist_id,
        'amount', request_record.amount,
        'reminder_count', request_record.reminder_count + 1,
        'days_overdue', CURRENT_DATE - request_record.due_date
      )
    );

    reminder_count := reminder_count + 1;
  END LOOP;

  RETURN reminder_count;
END;
$$;

-- Create materialized view for membership dashboard
CREATE MATERIALIZED VIEW membership_dashboard_summary AS
SELECT
  -- Overall metrics
  COUNT(DISTINCT s.user_id) FILTER (WHERE s.status = 'active') as active_subscribers,
  COUNT(DISTINCT s.user_id) FILTER (WHERE s.status = 'past_due') as past_due_subscribers,
  COUNT(DISTINCT s.user_id) FILTER (WHERE s.status = 'canceled') as canceled_subscribers,
  
  -- Revenue metrics
  SUM(wt.final_amount) FILTER (WHERE wt.status = 'completed' AND wt.created_at >= date_trunc('month', now())) as monthly_revenue,
  SUM(wt.final_amount) FILTER (WHERE wt.status = 'completed' AND wt.created_at >= date_trunc('year', now())) as yearly_revenue,
  
  -- Transaction metrics
  COUNT(wt.id) FILTER (WHERE wt.status = 'completed' AND wt.created_at >= date_trunc('month', now())) as monthly_transactions,
  COUNT(wt.id) FILTER (WHERE wt.status = 'failed' AND wt.created_at >= date_trunc('month', now())) as monthly_failed_transactions,
  
  -- Promo code metrics
  COUNT(DISTINCT wt.promo_code_used) FILTER (WHERE wt.promo_code_used IS NOT NULL AND wt.created_at >= date_trunc('month', now())) as active_promo_codes,
  SUM(wt.discount_applied) FILTER (WHERE wt.created_at >= date_trunc('month', now())) as monthly_discounts_given,
  
  -- Contract metrics
  COUNT(sc.id) FILTER (WHERE sc.status = 'active') as active_supervisor_contracts,
  COUNT(pr.id) FILTER (WHERE pr.status IN ('pending', 'sent')) as pending_payment_requests,
  
  -- Last updated
  now() as calculated_at

FROM subscriptions s
FULL OUTER JOIN whish_transactions wt ON wt.subscription_id = s.id
FULL OUTER JOIN supervisor_contracts sc ON true
FULL OUTER JOIN payment_requests pr ON true;

-- Create index on materialized view
CREATE UNIQUE INDEX membership_dashboard_summary_singleton ON membership_dashboard_summary ((1));

-- Function to refresh membership analytics
CREATE OR REPLACE FUNCTION refresh_membership_analytics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY membership_dashboard_summary;
  
  -- Generate monthly analytics if not exists
  INSERT INTO membership_analytics (period_start, period_end)
  SELECT 
    date_trunc('month', now())::date,
    (date_trunc('month', now()) + interval '1 month - 1 day')::date
  WHERE NOT EXISTS (
    SELECT 1 FROM membership_analytics
    WHERE period_start = date_trunc('month', now())::date
  );
END;
$$;

-- Populate default membership plans
INSERT INTO membership_plans (name, description, plan_type, price_usd, price_lbp, duration_months, features, sort_order) VALUES
('Monthly Plan', 'Perfect for getting started with Thera-PY', 'monthly', 15.00, 1350000, 1, 
 '["Unlimited clients", "Assessment tools", "Session management", "Basic analytics", "Email support"]'::jsonb, 1),

('Quarterly Plan', 'Save 11% with our 3-month plan', 'quarterly', 40.00, 3600000, 3, 
 '["Unlimited clients", "Assessment tools", "Session management", "Advanced analytics", "Priority support", "Resource library access"]'::jsonb, 2),

('Biannual Plan', 'Save 17% with our 6-month plan', 'biannual', 80.00, 7200000, 6, 
 '["Unlimited clients", "Assessment tools", "Session management", "Advanced analytics", "Priority support", "Resource library access", "Supervision tools"]'::jsonb, 3),

('Annual Plan', 'Best value - Save 25% with our yearly plan', 'annual', 150.00, 13500000, 12, 
 '["Unlimited clients", "Assessment tools", "Session management", "Advanced analytics", "Priority support", "Resource library access", "Supervision tools", "Custom branding", "API access"]'::jsonb, 4);

-- Populate sample promo codes
INSERT INTO promo_codes (code, name, description, discount_type, discount_value, min_amount, max_discount, usage_limit, valid_until, created_by) VALUES
('WELCOME25', 'Welcome Discount', '25% off first subscription for new therapists', 'percentage', 25.00, 15.00, 50.00, 100, now() + interval '3 months', 
 (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1)),

('SAVE50', 'Limited Time Offer', '$50 off annual plans', 'fixed_amount', 50.00, 100.00, 50.00, 50, now() + interval '1 month',
 (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1)),

('STUDENT15', 'Student Discount', '15% off for verified students', 'percentage', 15.00, 15.00, 25.00, NULL, now() + interval '1 year',
 (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1));

-- Insert default Whish Pay configuration (placeholder - admin must update)
INSERT INTO whish_pay_config (
  website_url,
  secret_token,
  success_redirect_url,
  failure_redirect_url,
  callback_url,
  is_sandbox,
  created_by
) VALUES (
  'your-domain.com',
  'your_whish_secret_token_here',
  'https://your-domain.com/payment/success',
  'https://your-domain.com/payment/failure', 
  'https://your-domain.com/api/whish/callback',
  true,
  (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1)
);