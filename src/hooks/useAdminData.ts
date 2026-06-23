import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface Major {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  created_at: string;
}

export interface Course {
  id: string;
  major_id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  created_at: string;
}

export interface Chapter {
  id: string;
  course_id: string;
  title: string;
  sequence_order: number;
  created_at: string;
}

export interface Lesson {
  id: string;
  chapter_id: string;
  title: string;
  sequence_order: number;
  video_url?: string | null;
  created_at: string;
}

export interface Slide {
  id: string;
  lesson_id: string;
  content: string;
  sequence_order: number;
  created_at: string;
}

export interface Exercise {
  id: string;
  slide_id: string;
  question_data: {
    question: string;
    options?: string[];
    correct_answer?: string | number; // options index or text match
  };
  type: 'single_choice' | 'multiple_choice' | 'short_answer' | 'paragraph';
  created_at: string;
}

export interface StudentProgress {
  id: string;
  full_name: string;
  email: string;
  role: string;
  enrolled_courses_ids: string[];
  enrolled_courses_titles: string[];
  completion_percentage: number;
  last_active: string | null;
}

export function useAdminData() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async <T>(promise: Promise<{ data: T | null; error: any }>): Promise<T | null> => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await promise;
      if (err) {
        console.error('Supabase Admin Error:', err);
        setError(err.message || 'Operation failed');
        return null;
      }
      return data;
    } catch (e: any) {
      console.error('Unhandled Admin Exception:', e);
      setError(e.message || 'Unknown error occurred');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // --- MAJORS ---
  const fetchMajors = useCallback(async () => {
    const res = await supabase.from('majors').select('*').order('created_at', { ascending: false });
    return res.data as Major[] || [];
  }, []);

  const createMajor = useCallback(async (title: string, description: string, cover_image_url?: string) => {
    const res = await supabase.from('majors').insert({ title, description, cover_image_url }).select().single();
    return execute<Major>(Promise.resolve(res));
  }, [execute]);

  const updateMajor = useCallback(async (id: string, title: string, description: string, cover_image_url?: string) => {
    const res = await supabase.from('majors').update({ title, description, cover_image_url }).eq('id', id).select().single();
    return execute<Major>(Promise.resolve(res));
  }, [execute]);

  const deleteMajor = useCallback(async (id: string) => {
    const { error: err } = await supabase.from('majors').delete().eq('id', id);
    if (err) {
      setError(err.message);
      return false;
    }
    return true;
  }, []);

  // --- COURSES ---
  const fetchCourses = useCallback(async () => {
    const res = await supabase.from('courses').select('*, majors(title)').order('created_at', { ascending: false });
    return res.data as (Course & { majors: { title: string } })[] || [];
  }, []);

  const fetchCoursesByMajor = useCallback(async (majorId: string) => {
    const res = await supabase.from('courses').select('*').eq('major_id', majorId).order('created_at', { ascending: false });
    return res.data as Course[] || [];
  }, []);

  const createCourse = useCallback(async (majorId: string, title: string, description: string, cover_image_url?: string) => {
    const res = await supabase.from('courses').insert({ major_id: majorId, title, description, cover_image_url }).select().single();
    return execute<Course>(Promise.resolve(res));
  }, [execute]);

  const updateCourse = useCallback(async (id: string, majorId: string, title: string, description: string, cover_image_url?: string) => {
    const res = await supabase.from('courses').update({ major_id: majorId, title, description, cover_image_url }).eq('id', id).select().single();
    return execute<Course>(Promise.resolve(res));
  }, [execute]);

  const deleteCourse = useCallback(async (id: string) => {
    const { error: err } = await supabase.from('courses').delete().eq('id', id);
    if (err) {
      setError(err.message);
      return false;
    }
    return true;
  }, []);

  // --- CHAPTERS ---
  const fetchChapters = useCallback(async (courseId: string) => {
    const res = await supabase.from('chapters').select('*').eq('course_id', courseId).order('sequence_order', { ascending: true });
    return res.data as Chapter[] || [];
  }, []);

  const createChapter = useCallback(async (courseId: string, title: string, sequence_order: number) => {
    const res = await supabase.from('chapters').insert({ course_id: courseId, title, sequence_order }).select().single();
    return execute<Chapter>(Promise.resolve(res));
  }, [execute]);

  const updateChapter = useCallback(async (id: string, title: string, sequence_order: number) => {
    const res = await supabase.from('chapters').update({ title, sequence_order }).eq('id', id).select().single();
    return execute<Chapter>(Promise.resolve(res));
  }, [execute]);

  const deleteChapter = useCallback(async (id: string) => {
    const { error: err } = await supabase.from('chapters').delete().eq('id', id);
    if (err) {
      setError(err.message);
      return false;
    }
    return true;
  }, []);

  // --- LESSONS ---
  const fetchLessons = useCallback(async (chapterId: string) => {
    const res = await supabase.from('lessons').select('*').eq('chapter_id', chapterId).order('sequence_order', { ascending: true });
    return res.data as Lesson[] || [];
  }, []);

  const createLesson = useCallback(async (chapterId: string, title: string, sequence_order: number, video_url?: string | null) => {
    const res = await supabase.from('lessons').insert({ chapter_id: chapterId, title, sequence_order, video_url }).select().single();
    return execute<Lesson>(Promise.resolve(res));
  }, [execute]);

  const updateLesson = useCallback(async (id: string, title: string, sequence_order: number, video_url?: string | null) => {
    const res = await supabase.from('lessons').update({ title, sequence_order, video_url }).eq('id', id).select().single();
    return execute<Lesson>(Promise.resolve(res));
  }, [execute]);

  const deleteLesson = useCallback(async (id: string) => {
    const { error: err } = await supabase.from('lessons').delete().eq('id', id);
    if (err) {
      setError(err.message);
      return false;
    }
    return true;
  }, []);

  // --- SLIDES ---
  const fetchSlides = useCallback(async (lessonId: string) => {
    const res = await supabase.from('slides').select('*').eq('lesson_id', lessonId).order('sequence_order', { ascending: true });
    return res.data as Slide[] || [];
  }, []);

  const createSlide = useCallback(async (lessonId: string, content: string, sequence_order: number) => {
    const res = await supabase.from('slides').insert({ lesson_id: lessonId, content, sequence_order }).select().single();
    return execute<Slide>(Promise.resolve(res));
  }, [execute]);

  const updateSlide = useCallback(async (id: string, content: string, sequence_order: number) => {
    const res = await supabase.from('slides').update({ content, sequence_order }).eq('id', id).select().single();
    return execute<Slide>(Promise.resolve(res));
  }, [execute]);

  const deleteSlide = useCallback(async (id: string) => {
    const { error: err } = await supabase.from('slides').delete().eq('id', id);
    if (err) {
      setError(err.message);
      return false;
    }
    return true;
  }, []);

  // --- EXERCISES ---
  const fetchExercisesForSlide = useCallback(async (slideId: string) => {
    const res = await supabase.from('exercises').select('*').eq('slide_id', slideId).order('created_at', { ascending: true });
    return res.data as Exercise[] || [];
  }, []);

  const saveExercise = useCallback(async (id: string | null, slideId: string, type: string, questionData: any) => {
    let res;
    if (id) {
      res = await supabase.from('exercises').update({ question_data: questionData, type }).eq('id', id).select().single();
    } else {
      res = await supabase.from('exercises').insert({ slide_id: slideId, question_data: questionData, type }).select().single();
    }
    return execute<Exercise>(Promise.resolve(res));
  }, [execute]);

  const deleteExercise = useCallback(async (id: string) => {
    const { error: err } = await supabase.from('exercises').delete().eq('id', id);
    if (err) {
      setError(err.message);
      return false;
    }
    return true;
  }, []);

  // --- IMAGE UPLOADS ---
  const uploadAsset = useCallback(async (file: File, bucketName: string = 'note_images') => {
    setLoading(true);
    setError(null);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `admin_uploads/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (err: any) {
      console.error('Image upload failed:', err);
      setError(err.message || 'Image upload error');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // --- STUDENT PROGRESS & ANALYTICS ---
  const fetchStudentProgress = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch all students (role === 'student' or all users actually)
      const { data: usersData, error: usersErr } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (usersErr) throw usersErr;

      // Fetch user_courses enrollments and progress to compute enrollment percentages
      const { data: enrollmentsData, error: enrollmentsErr } = await supabase
        .from('user_courses')
        .select('*, courses(title)');

      if (enrollmentsErr) throw enrollmentsErr;

      // Fetch slide progress to compute Completion percentages
      const { data: progressData, error: progressErr } = await supabase
        .from('user_progress')
        .select('*');

      if (progressErr) throw progressErr;

      // Get count of total slides to calculate individual percentage
      const { count: totalSlides, error: countErr } = await supabase
        .from('slides')
        .select('*', { count: 'exact', head: true });

      if (countErr) throw countErr;

      const totalSlidesCount = totalSlides || 1; // avoid divide by zero

      const students: StudentProgress[] = (usersData || []).map((u: any) => {
        // Enrolled courses
        const userEnrollments = (enrollmentsData || []).filter((e: any) => e.user_id === u.id);
        const enrolled_courses_ids = userEnrollments.map((e: any) => e.course_id);
        const enrolled_courses_titles = userEnrollments
          .map((e: any) => e.courses?.title || 'Unknown Course')
          .filter(Boolean);

        // Completion percentage: slides completed by user / total slides in system (or user's enrolled majors' slides, standard system completion works great)
        const completedSlidesCount = (progressData || []).filter(
          (p: any) => p.user_id === u.id && p.is_completed
        ).length;

        const completion_percentage = Math.floor(
          (completedSlidesCount / totalSlidesCount) * 100
        );

        // Find last active date: can be latest progress entry, latest answers entry, or user creation
        const userProgressEntries = (progressData || []).filter((p: any) => p.user_id === u.id);
        const dates = userProgressEntries
          .map((p: any) => new Date(p.completed_at || p.created_at).getTime())
          .filter(Boolean);

        let last_active = u.created_at;
        if (dates.length > 0) {
          last_active = new Date(Math.max(...dates)).toISOString();
        }

        return {
          id: u.id,
          full_name: u.full_name || 'Anonymous Student',
          email: u.email,
          role: u.role,
          enrolled_courses_ids,
          enrolled_courses_titles,
          completion_percentage: Math.min(100, completion_percentage),
          last_active,
        };
      });

      return students;
    } catch (err: any) {
      console.error('Error in fetchStudentProgress:', err);
      setError(err.message || 'Error compiling analytics');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    fetchMajors,
    createMajor,
    updateMajor,
    deleteMajor,
    fetchCourses,
    fetchCoursesByMajor,
    createCourse,
    updateCourse,
    deleteCourse,
    fetchChapters,
    createChapter,
    updateChapter,
    deleteChapter,
    fetchLessons,
    createLesson,
    updateLesson,
    deleteLesson,
    fetchSlides,
    createSlide,
    updateSlide,
    deleteSlide,
    fetchExercisesForSlide,
    saveExercise,
    deleteExercise,
    uploadAsset,
    fetchStudentProgress,
  };
}
