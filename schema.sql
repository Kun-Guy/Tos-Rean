-- 1. Authentication & Users
-- Extend auth.users with a public users table
CREATE TYPE user_role AS ENUM ('student', 'admin');

CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role user_role DEFAULT 'student',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Content Ladder
CREATE TABLE majors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  major_id UUID REFERENCES majors(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  sequence_order INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  sequence_order INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE slides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  content TEXT NOT NULL, -- Markdown supported
  sequence_order INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slide_id UUID REFERENCES slides(id) ON DELETE CASCADE,
  question_data JSONB NOT NULL, -- { question, options: [], correct_answer_index }
  type TEXT NOT NULL DEFAULT 'multiple_choice',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. User Interaction & Analytics
CREATE TABLE user_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, course_id)
);

CREATE TABLE user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  slide_id UUID REFERENCES slides(id) ON DELETE CASCADE,
  is_completed BOOLEAN DEFAULT TRUE,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, slide_id)
);

CREATE TABLE user_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE,
  answer_data JSONB NOT NULL,
  is_correct BOOLEAN NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Advanced Features (Notes & Reminders)
CREATE TABLE note_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_auto_generated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
  folder_id UUID REFERENCES note_folders(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled Note',
  content TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SUPABASE STORAGE BUCKET: note_images
-- Note: These policies are typically set in the Supabase UI, but here is the SQL reference.
-- INSERT INTO storage.buckets (id, name, public) VALUES ('note_images', 'note_images', true);
-- CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'note_images');
-- CREATE POLICY "Authenticated Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'note_images' AND auth.role() = 'authenticated');

CREATE TABLE reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  slide_id UUID REFERENCES slides(id) ON DELETE CASCADE,
  remind_at TIMESTAMPTZ NOT NULL,
  description TEXT,
  is_triggered BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ROW LEVEL SECURITY (RLS) POLICIES

-- Helper function to check admin role without triggering infinite recursion on users table
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read their own data" ON users;
CREATE POLICY "Users can read their own data" ON users FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "Admins can read all users" ON users;
CREATE POLICY "Admins can read all users" ON users FOR SELECT USING (public.is_admin());
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
CREATE POLICY "Users can insert their own profile" ON users FOR INSERT WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update their own data" ON users;
CREATE POLICY "Users can update their own data" ON users FOR UPDATE USING (auth.uid() = id);
DROP POLICY IF EXISTS "Admins can update all users" ON users;
CREATE POLICY "Admins can update all users" ON users FOR UPDATE USING (public.is_admin());
DROP POLICY IF EXISTS "Admins can insert all users" ON users;
CREATE POLICY "Admins can insert all users" ON users FOR INSERT WITH CHECK (public.is_admin());

-- Content (Publically readable for enrolled, full access for admins)
ALTER TABLE majors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read for majors" ON majors;
CREATE POLICY "Allow public read for majors" ON majors FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admins full access majors" ON majors;
CREATE POLICY "Admins full access majors" ON majors FOR ALL TO authenticated USING (public.is_admin());

ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read for courses" ON courses;
CREATE POLICY "Allow public read for courses" ON courses FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admins full access courses" ON courses;
CREATE POLICY "Admins full access courses" ON courses FOR ALL TO authenticated USING (public.is_admin());

ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read for chapters" ON chapters;
CREATE POLICY "Allow public read for chapters" ON chapters FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admins full access chapters" ON chapters;
CREATE POLICY "Admins full access chapters" ON chapters FOR ALL TO authenticated USING (public.is_admin());

ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read for lessons" ON lessons;
CREATE POLICY "Allow public read for lessons" ON lessons FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admins full access lessons" ON lessons;
CREATE POLICY "Admins full access lessons" ON lessons FOR ALL TO authenticated USING (public.is_admin());

ALTER TABLE slides ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read for slides" ON slides;
CREATE POLICY "Allow public read for slides" ON slides FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admins full access slides" ON slides;
CREATE POLICY "Admins full access slides" ON slides FOR ALL TO authenticated USING (public.is_admin());

ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read for exercises" ON exercises;
CREATE POLICY "Allow public read for exercises" ON exercises FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admins full access exercises" ON exercises;
CREATE POLICY "Admins full access exercises" ON exercises FOR ALL TO authenticated USING (public.is_admin());

-- Interactions (User specific)
ALTER TABLE user_courses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users access own enrollments" ON user_courses;
CREATE POLICY "Users access own enrollments" ON user_courses FOR ALL TO authenticated USING (auth.uid() = user_id);

ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users access own progress" ON user_progress;
CREATE POLICY "Users access own progress" ON user_progress FOR ALL TO authenticated USING (auth.uid() = user_id);

ALTER TABLE user_answers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users access own answers" ON user_answers;
CREATE POLICY "Users access own answers" ON user_answers FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Notes & Reminders
ALTER TABLE note_folders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users access own folders" ON note_folders;
CREATE POLICY "Users access own folders" ON note_folders FOR ALL TO authenticated USING (auth.uid() = user_id);

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users access own notes" ON notes;
CREATE POLICY "Users access own notes" ON notes FOR ALL TO authenticated USING (auth.uid() = user_id);

ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users access own reminders" ON reminders;
CREATE POLICY "Users access own reminders" ON reminders FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Trigger for users table on auth.users creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, full_name, email, avatar_url, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url',
    'student'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Course Ratings
CREATE TABLE course_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, course_id)
);

ALTER TABLE course_ratings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users access own course ratings" ON course_ratings;
CREATE POLICY "Users access own course ratings" ON course_ratings FOR ALL TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Allow public read for course ratings" ON course_ratings;
CREATE POLICY "Allow public read for course ratings" ON course_ratings FOR SELECT TO authenticated USING (true);

-- Enable Supabase Realtime for user_courses (enrollments) and courses/course_ratings
ALTER PUBLICATION supabase_realtime ADD TABLE user_courses;

-- RPC Stats Engine for Course Details
CREATE OR REPLACE FUNCTION get_course_stats(course_id UUID)
RETURNS JSON AS $$
DECLARE
  enrolled_count INT;
  average_rating NUMERIC;
  review_count INT;
  result JSON;
BEGIN
  -- Count total enrollments from user_courses
  SELECT COUNT(*) INTO enrolled_count
  FROM user_courses
  WHERE user_courses.course_id = get_course_stats.course_id;

  -- Count and average ratings from course_ratings
  SELECT 
    COALESCE(ROUND(AVG(rating)::numeric, 1), 4.6), 
    COUNT(*) INTO average_rating, review_count
  FROM course_ratings
  WHERE course_ratings.course_id = get_course_stats.course_id;

  -- If average_rating is 4.6 and review_count is 0, we can default review_count to a nice number, or keep it 0 as required
  -- Let's construct the final JSON response
  result := json_build_object(
    'enrolled_count', enrolled_count,
    'average_rating', average_rating,
    'review_count', review_count
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- --- UPGRADE FOR LESSON MULTI-ASSET ATTACHMENTS & VIDEO SYSTEM ---

-- Alter lessons table to support external video URL
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Create lesson_attachments table
CREATE TABLE IF NOT EXISTS lesson_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security and setup policies
ALTER TABLE lesson_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read for lesson attachments" ON lesson_attachments;
CREATE POLICY "Allow public read for lesson attachments" 
  ON lesson_attachments FOR SELECT 
  TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated inserts for lesson attachments" ON lesson_attachments;
CREATE POLICY "Allow authenticated inserts for lesson attachments" 
  ON lesson_attachments FOR INSERT 
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated deletes for lesson attachments" ON lesson_attachments;
CREATE POLICY "Allow authenticated deletes for lesson attachments" 
  ON lesson_attachments FOR DELETE 
  TO authenticated USING (true);


-- Define Storage bucket for lesson_assets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('lesson_assets', 'lesson_assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for lesson_assets bucket
DROP POLICY IF EXISTS "Allow authenticated inserts into lesson_assets" ON storage.objects;
CREATE POLICY "Allow authenticated inserts into lesson_assets" 
  ON storage.objects FOR INSERT 
  TO authenticated WITH CHECK (bucket_id = 'lesson_assets');

DROP POLICY IF EXISTS "Allow public select from lesson_assets" ON storage.objects;
CREATE POLICY "Allow public select from lesson_assets" 
  ON storage.objects FOR SELECT 
  TO public USING (bucket_id = 'lesson_assets');

DROP POLICY IF EXISTS "Allow authenticated deletes from lesson_assets" ON storage.objects;
CREATE POLICY "Allow authenticated deletes from lesson_assets" 
  ON storage.objects FOR DELETE 
  TO authenticated USING (bucket_id = 'lesson_assets');


-- --- UPGRADE FOR DAILY LEARNING STREAK SYSTEM ---

-- We track user activity directly on their profile.
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS current_streak INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_study_date DATE;

-- Create Supabase RPC named update_user_streak
CREATE OR REPLACE FUNCTION public.update_user_streak(user_id UUID)
RETURNS VOID AS $$
DECLARE
  today DATE;
  yesterday DATE;
  last_date DATE;
BEGIN
  -- Obtain Cambodia local date ('Asia/Phnom_Penh' timezone) to preserve consistency for local timezone studies
  today := (timezone('Asia/Phnom_Penh', now())::date);
  yesterday := today - 1;

  -- Load user's last recorded study date
  SELECT last_study_date INTO last_date
  FROM public.users
  WHERE id = update_user_streak.user_id;

  IF last_date IS NULL THEN
    -- First time study action
    UPDATE public.users
    SET current_streak = 1,
        last_study_date = today
    WHERE id = update_user_streak.user_id;
  ELSIF last_date = yesterday THEN
    -- Continued streak sequence on consecutive day
    UPDATE public.users
    SET current_streak = current_streak + 1,
        last_study_date = today
    WHERE id = update_user_streak.user_id;
  ELSIF last_date < yesterday THEN
    -- Streak was broken, reset to a count of 1
    UPDATE public.users
    SET current_streak = 1,
        last_study_date = today
    WHERE id = update_user_streak.user_id;
  -- ELSIF last_date = today THEN do nothing (already maintained today)
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- --- STUDY VELOCITY PROGRESS RPC ENGINE ---
CREATE OR REPLACE FUNCTION public.get_study_velocity(p_user_id UUID, p_course_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_completed_count INT := 0;
  v_total_count INT := 0;
  v_percentage INT := 0;
BEGIN
  -- Count total slides in the course (by joining chapters -> lessons -> slides)
  SELECT COUNT(s.id) INTO v_total_count
  FROM public.slides s
  JOIN public.lessons l ON s.lesson_id = l.id
  JOIN public.chapters c ON l.chapter_id = c.id
  WHERE c.course_id = p_course_id;

  -- Count completed slides for the user in the course using user_progress
  SELECT COUNT(up.id) INTO v_completed_count
  FROM public.user_progress up
  JOIN public.slides s ON up.slide_id = s.id
  JOIN public.lessons l ON s.lesson_id = l.id
  JOIN public.chapters c ON l.chapter_id = c.id
  WHERE up.user_id = p_user_id 
    AND up.is_completed = true
    AND c.course_id = p_course_id;

  -- Calculate percentage, rounding to the nearest whole number. Handle potential division by zero.
  IF v_total_count > 0 THEN
    v_percentage := ROUND((v_completed_count::FLOAT / v_total_count::FLOAT) * 100);
  ELSE
    v_percentage := 0;
  END IF;

  RETURN jsonb_build_object(
    'completed_count', v_completed_count,
    'total_count', v_total_count,
    'percentage', v_percentage
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;




