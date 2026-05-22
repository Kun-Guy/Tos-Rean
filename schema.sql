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

CREATE TABLE chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  major_id UUID REFERENCES majors(id) ON DELETE CASCADE,
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
CREATE TABLE user_majors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  major_id UUID REFERENCES majors(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, major_id)
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

-- Users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read their own data" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can read all users" ON users FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Content (Publically readable for enrolled, full access for admins)
ALTER TABLE majors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read for majors" ON majors FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins full access majors" ON majors ALL TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read for chapters" ON chapters FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins full access chapters" ON chapters ALL TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read for lessons" ON lessons FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins full access lessons" ON lessons ALL TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

ALTER TABLE slides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read for slides" ON slides FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins full access slides" ON slides ALL TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read for exercises" ON exercises FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins full access exercises" ON exercises ALL TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Interactions (User specific)
ALTER TABLE user_majors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access own enrollments" ON user_majors ALL TO authenticated USING (auth.uid() = user_id);

ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access own progress" ON user_progress ALL TO authenticated USING (auth.uid() = user_id);

ALTER TABLE user_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access own answers" ON user_answers ALL TO authenticated USING (auth.uid() = user_id);

-- Notes & Reminders
ALTER TABLE note_folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access own folders" ON note_folders ALL TO authenticated USING (auth.uid() = user_id);

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access own notes" ON notes ALL TO authenticated USING (auth.uid() = user_id);

ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access own reminders" ON reminders ALL TO authenticated USING (auth.uid() = user_id);

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
