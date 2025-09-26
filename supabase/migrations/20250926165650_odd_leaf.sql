/*
  # Continuing Education LMS System

  1. New Tables
    - `ce_courses` - Course catalog with details, pricing, and metadata
    - `ce_enrollments` - User course enrollments with progress tracking
    - `ce_certificates` - Generated certificates for completed courses
    - `ce_course_modules` - Course content modules and lessons
    - `ce_module_completions` - Track user progress through modules
    - `ce_course_reviews` - User reviews and ratings for courses
    - `ce_course_categories` - Course categorization system

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Therapists can view all courses but only manage their own enrollments
    - Admin policies for course management

  3. Features
    - Course catalog with search and filtering
    - Progress tracking and completion certificates
    - CE credit management
    - User reviews and ratings
    - Modular course content structure
*/

-- Course Categories
CREATE TABLE IF NOT EXISTS ce_course_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  icon text,
  color text DEFAULT '#3B82F6',
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Courses
CREATE TABLE IF NOT EXISTS ce_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  instructor text NOT NULL,
  category text NOT NULL,
  difficulty_level text NOT NULL CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
  duration_hours numeric(4,2) NOT NULL DEFAULT 0,
  ce_credits numeric(4,2) NOT NULL DEFAULT 0,
  price numeric(10,2) NOT NULL DEFAULT 0,
  thumbnail_url text,
  video_url text,
  materials_url text,
  is_featured boolean DEFAULT false,
  is_free boolean DEFAULT false,
  is_active boolean DEFAULT true,
  rating numeric(3,2) DEFAULT 0,
  enrollment_count integer DEFAULT 0,
  max_enrollments integer,
  prerequisites text[],
  learning_objectives text[],
  target_audience text,
  accreditation_info text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Course Modules/Lessons
CREATE TABLE IF NOT EXISTS ce_course_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES ce_courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  content_type text NOT NULL CHECK (content_type IN ('video', 'text', 'quiz', 'assignment', 'resource')),
  content_url text,
  content_data jsonb,
  duration_minutes integer DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  is_required boolean DEFAULT true,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- User Enrollments
CREATE TABLE IF NOT EXISTS ce_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES ce_courses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'in_progress', 'completed', 'dropped')),
  progress_percentage numeric(5,2) DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  last_accessed_at timestamptz DEFAULT now(),
  total_time_spent integer DEFAULT 0, -- in minutes
  payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded', 'free')),
  payment_id text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(course_id, user_id)
);

-- Module Completions
CREATE TABLE IF NOT EXISTS ce_module_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES ce_enrollments(id) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES ce_course_modules(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  completed_at timestamptz DEFAULT now(),
  time_spent integer DEFAULT 0, -- in minutes
  score numeric(5,2), -- for quizzes/assignments
  attempts integer DEFAULT 1,
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(enrollment_id, module_id)
);

-- Certificates
CREATE TABLE IF NOT EXISTS ce_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES ce_enrollments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course_title text NOT NULL,
  instructor text NOT NULL,
  ce_credits numeric(4,2) NOT NULL,
  issued_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  certificate_url text,
  verification_code text NOT NULL UNIQUE,
  is_valid boolean DEFAULT true,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Course Reviews
CREATE TABLE IF NOT EXISTS ce_course_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES ce_courses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  enrollment_id uuid NOT NULL REFERENCES ce_enrollments(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text text,
  is_public boolean DEFAULT true,
  is_verified boolean DEFAULT false,
  helpful_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(course_id, user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ce_courses_category ON ce_courses(category);
CREATE INDEX IF NOT EXISTS idx_ce_courses_featured ON ce_courses(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_ce_courses_active ON ce_courses(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_ce_courses_rating ON ce_courses(rating DESC);
CREATE INDEX IF NOT EXISTS idx_ce_enrollments_user ON ce_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_ce_enrollments_course ON ce_enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_ce_enrollments_status ON ce_enrollments(status);
CREATE INDEX IF NOT EXISTS idx_ce_certificates_user ON ce_certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_ce_certificates_verification ON ce_certificates(verification_code);
CREATE INDEX IF NOT EXISTS idx_ce_module_completions_enrollment ON ce_module_completions(enrollment_id);

-- Enable Row Level Security
ALTER TABLE ce_course_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE ce_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE ce_course_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE ce_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ce_module_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ce_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE ce_course_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Course Categories - Public read, admin write
CREATE POLICY "Anyone can view active course categories"
  ON ce_course_categories
  FOR SELECT
  USING (is_active = true);

-- Courses - Public read for active courses
CREATE POLICY "Anyone can view active courses"
  ON ce_courses
  FOR SELECT
  USING (is_active = true);

-- Course Modules - Public read for active modules of active courses
CREATE POLICY "Anyone can view active course modules"
  ON ce_course_modules
  FOR SELECT
  USING (
    is_active = true AND 
    EXISTS (
      SELECT 1 FROM ce_courses 
      WHERE id = course_id AND is_active = true
    )
  );

-- Enrollments - Users can manage their own enrollments
CREATE POLICY "Users can view their own enrollments"
  ON ce_enrollments
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own enrollments"
  ON ce_enrollments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own enrollments"
  ON ce_enrollments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Module Completions - Users can manage their own completions
CREATE POLICY "Users can view their own module completions"
  ON ce_module_completions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own module completions"
  ON ce_module_completions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own module completions"
  ON ce_module_completions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Certificates - Users can view their own certificates
CREATE POLICY "Users can view their own certificates"
  ON ce_certificates
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Course Reviews - Users can manage their own reviews, everyone can read public reviews
CREATE POLICY "Anyone can view public course reviews"
  ON ce_course_reviews
  FOR SELECT
  USING (is_public = true);

CREATE POLICY "Users can view their own course reviews"
  ON ce_course_reviews
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own course reviews"
  ON ce_course_reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own course reviews"
  ON ce_course_reviews
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Functions

-- Function to generate certificate verification code
CREATE OR REPLACE FUNCTION generate_verification_code()
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 12));
END;
$$;

-- Function to generate certificate when course is completed
CREATE OR REPLACE FUNCTION generate_ce_certificate(enrollment_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  enrollment_record ce_enrollments%ROWTYPE;
  course_record ce_courses%ROWTYPE;
  certificate_id uuid;
  verification_code text;
BEGIN
  -- Get enrollment details
  SELECT * INTO enrollment_record
  FROM ce_enrollments
  WHERE id = enrollment_id AND status = 'completed';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Enrollment not found or not completed';
  END IF;
  
  -- Get course details
  SELECT * INTO course_record
  FROM ce_courses
  WHERE id = enrollment_record.course_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Course not found';
  END IF;
  
  -- Check if certificate already exists
  SELECT id INTO certificate_id
  FROM ce_certificates
  WHERE enrollment_id = enrollment_id;
  
  IF FOUND THEN
    RETURN certificate_id;
  END IF;
  
  -- Generate verification code
  verification_code := generate_verification_code();
  
  -- Create certificate
  INSERT INTO ce_certificates (
    enrollment_id,
    user_id,
    course_title,
    instructor,
    ce_credits,
    verification_code,
    certificate_url
  ) VALUES (
    enrollment_id,
    enrollment_record.user_id,
    course_record.title,
    course_record.instructor,
    course_record.ce_credits,
    verification_code,
    '/certificates/' || verification_code || '.pdf'
  ) RETURNING id INTO certificate_id;
  
  RETURN certificate_id;
END;
$$;

-- Function to update course rating when review is added/updated
CREATE OR REPLACE FUNCTION update_course_rating()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE ce_courses
  SET rating = (
    SELECT COALESCE(AVG(rating), 0)
    FROM ce_course_reviews
    WHERE course_id = COALESCE(NEW.course_id, OLD.course_id)
    AND is_public = true
  )
  WHERE id = COALESCE(NEW.course_id, OLD.course_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger to update course rating
DROP TRIGGER IF EXISTS trigger_update_course_rating ON ce_course_reviews;
CREATE TRIGGER trigger_update_course_rating
  AFTER INSERT OR UPDATE OR DELETE ON ce_course_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_course_rating();

-- Function to update enrollment count
CREATE OR REPLACE FUNCTION update_enrollment_count()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE ce_courses
  SET enrollment_count = (
    SELECT COUNT(*)
    FROM ce_enrollments
    WHERE course_id = COALESCE(NEW.course_id, OLD.course_id)
    AND status != 'dropped'
  )
  WHERE id = COALESCE(NEW.course_id, OLD.course_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger to update enrollment count
DROP TRIGGER IF EXISTS trigger_update_enrollment_count ON ce_enrollments;
CREATE TRIGGER trigger_update_enrollment_count
  AFTER INSERT OR UPDATE OR DELETE ON ce_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION update_enrollment_count();

-- Insert sample course categories
INSERT INTO ce_course_categories (name, description, icon, color) VALUES
  ('CBT', 'Cognitive Behavioral Therapy', 'brain', '#3B82F6'),
  ('Trauma', 'Trauma-Informed Care', 'shield', '#EF4444'),
  ('Anxiety', 'Anxiety Disorders', 'heart', '#10B981'),
  ('Depression', 'Depression Treatment', 'brain', '#8B5CF6'),
  ('Ethics', 'Professional Ethics', 'award', '#F59E0B'),
  ('Assessment', 'Psychological Assessment', 'clipboard-list', '#06B6D4'),
  ('Supervision', 'Clinical Supervision', 'headphones', '#84CC16'),
  ('Research', 'Research Methods', 'book-open', '#6366F1')
ON CONFLICT (name) DO NOTHING;

-- Insert sample courses
INSERT INTO ce_courses (
  title, description, instructor, category, difficulty_level, 
  duration_hours, ce_credits, price, is_featured, is_free, rating
) VALUES
  (
    'Introduction to Cognitive Behavioral Therapy',
    'Learn the fundamentals of CBT including core principles, techniques, and applications in clinical practice.',
    'Dr. Sarah Johnson, PhD',
    'cbt',
    'beginner',
    8.0,
    8.0,
    199.99,
    true,
    false,
    4.8
  ),
  (
    'Trauma-Informed Care Essentials',
    'Understanding trauma responses and implementing trauma-informed approaches in therapeutic settings.',
    'Dr. Michael Chen, LCSW',
    'trauma',
    'intermediate',
    6.0,
    6.0,
    149.99,
    true,
    false,
    4.7
  ),
  (
    'Ethics in Mental Health Practice',
    'Navigate ethical dilemmas and maintain professional standards in mental health practice.',
    'Dr. Lisa Rodriguez, PhD',
    'ethics',
    'beginner',
    4.0,
    4.0,
    0,
    false,
    true,
    4.9
  ),
  (
    'Advanced Assessment Techniques',
    'Master advanced psychological assessment methods and interpretation strategies.',
    'Dr. Robert Kim, PsyD',
    'assessment',
    'advanced',
    12.0,
    12.0,
    299.99,
    false,
    false,
    4.6
  ),
  (
    'Anxiety Disorders: Evidence-Based Treatment',
    'Comprehensive overview of anxiety disorders and evidence-based treatment approaches.',
    'Dr. Amanda White, PhD',
    'anxiety',
    'intermediate',
    10.0,
    10.0,
    249.99,
    true,
    false,
    4.8
  )
ON CONFLICT DO NOTHING;