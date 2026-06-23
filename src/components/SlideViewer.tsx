import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import confetti from 'canvas-confetti';
import { 
  ChevronLeft, 
  ChevronRight, 
  BookOpen, 
  Clock, 
  StickyNote, 
  CheckCircle2, 
  AlertCircle, 
  Bookmark,
  Layout,
  PlusCircle,
  History,
  Trophy,
  Paperclip,
  Eye,
  Download,
  PlayCircle,
  FileText,
  Image,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';

// Helper to convert YouTube or Vimeo links to embeddable player links
function getEmbedUrl(url: string): string | null {
  if (!url) return null;
  const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^#\&\?]*)/);
  if (ytMatch && ytMatch[1].length === 11) {
    return `https://www.youtube.com/embed/${ytMatch[1]}`;
  }
  const vimeoMatch = url.match(/(?:vimeo\.com\/|player\.vimeo\.com\/video\/)([0-9]+)/);
  if (vimeoMatch && vimeoMatch[1]) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }
  if (url.includes('/embed/')) return url;
  return url;
}

// Helper to format bytes cleanly
function formatBytes(bytes: number, decimals = 1) {
  if (!bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

interface Slide {
  id: string;
  content: string;
  sequence_order: number;
  lesson_id: string;
  lessons?: {
    id?: string;
    title: string;
    video_url?: string | null;
    chapter_id?: string;
    chapters?: {
      title: string;
      major_id?: string;
      majors?: {
        title: string;
      };
    };
  };
}

interface LessonAttachment {
  id: string;
  lesson_id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size: number;
  created_at?: string;
}

interface Exercise {
  id: string;
  question_data: {
    question: string;
    options: string[];
    correct_answer_index: number;
  };
  type: string;
}

export function SlideViewer() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();
  const { user, refreshStreak } = useAuth();

  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [userAnswer, setUserAnswer] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderDate, setReminderDate] = useState('');
  const [reminderDesc, setReminderDesc] = useState('');
  const [notes, setNotes] = useState<{ content: string; lesson_name: string }[]>([]);
  
  // New States for attachments & video handling
  const [attachments, setAttachments] = useState<LessonAttachment[]>([]);
  const [selectedAttachmentForPreview, setSelectedAttachmentForPreview] = useState<LessonAttachment | null>(null);
  const [showVideoMode, setShowVideoMode] = useState(false);
  const [lesson, setLesson] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [velocity, setVelocity] = useState<{
    completed_count: number;
    total_count: number;
    percentage: number;
  } | null>(null);
  const [completedSlidesLocal, setCompletedSlidesLocal] = useState<Set<string>>(new Set());

  const currentSlide = slides[currentSlideIndex];
  const activeLessonInfo = currentSlide?.lessons || lesson;

  const displayPercentage = velocity ? velocity.percentage : 0;
  const displayCompleted = velocity ? velocity.completed_count : 0;
  const displayTotal = velocity ? velocity.total_count : 0;

  useEffect(() => {
    if (lessonId) {
      setErrorMessage(null);
      fetchLessonDetails(lessonId);
      fetchSlides();
      fetchNotes();
      fetchAttachments(lessonId);
    }
  }, [lessonId]);

  useEffect(() => {
    if (slides.length === 0 && activeLessonInfo?.video_url) {
      setShowVideoMode(true);
    }
  }, [slides.length, activeLessonInfo?.video_url]);

  useEffect(() => {
    if (currentSlide) {
      fetchExercise(currentSlide.id);
      markProgress(currentSlide.id);
      setUserAnswer(null);
      setIsCorrect(null);
    }
  }, [currentSlide]);

  const reshapeLessonData = (lessonData: any) => {
    if (!lessonData) return null;
    const chapters = lessonData.chapters;
    if (chapters) {
      const course = chapters.courses;
      const major = course?.majors;
      return {
        ...lessonData,
        chapters: {
          ...chapters,
          majors: major
        }
      };
    }
    return lessonData;
  };

  const fetchStudyVelocity = async (userId: string, targetCourseId: string) => {
    try {
      const { data, error } = await supabase.rpc('get_study_velocity', {
        p_user_id: userId,
        p_course_id: targetCourseId
      });
      if (error) {
        console.warn('get_study_velocity RPC failed:', error);
      } else if (data) {
        setVelocity({
          completed_count: data.completed_count || 0,
          total_count: data.total_count || 0,
          percentage: data.percentage || 0
        });
      }
    } catch (err) {
      console.error('Error fetching study velocity:', err);
    }
  };

  const fetchCompletedSlides = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_progress')
        .select('slide_id')
        .eq('user_id', userId)
        .eq('is_completed', true);
      if (!error && data) {
        setCompletedSlidesLocal(new Set(data.map(p => p.slide_id)));
      }
    } catch (err) {
      console.error('Error fetching completed slides:', err);
    }
  };

  const courseId = activeLessonInfo?.chapters?.course_id;

  useEffect(() => {
    if (user?.id && courseId) {
      fetchStudyVelocity(user.id, courseId);
      fetchCompletedSlides(user.id);
    }
  }, [user?.id, courseId]);

  const fetchLessonDetails = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('lessons')
        .select(`
          id,
          title,
          video_url,
          chapter_id,
          chapters (
            title,
            course_id,
            courses (
              title,
              major_id,
              majors (
                title
              )
            )
          )
        `)
        .eq('id', id)
        .single();
      if (error) {
        console.error('Error fetching lesson details:', error);
        setErrorMessage(prev => prev || `Failed to load lesson Details: ${error.message} (${error.code})`);
      } else if (data) {
        setLesson(reshapeLessonData(data));
      }
    } catch (err: any) {
      console.error('Error fetching lesson details:', err);
      setErrorMessage(prev => prev || err.message || 'Error occurred while loading lesson info.');
    }
  };

  const fetchSlides = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('slides')
        .select(`
          id, 
          content, 
          sequence_order,
          lesson_id,
          lessons (
            id,
            title,
            video_url,
            chapter_id,
            chapters (
              title,
              course_id,
              courses (
                title,
                major_id,
                majors (
                  title
                )
              )
            )
          )
        `)
        .eq('lesson_id', lessonId)
        .order('sequence_order', { ascending: true });

      if (error) {
        console.error('Error fetching slides:', error);
        setErrorMessage(prev => prev || `Failed to load slides: ${error.message} (${error.code})`);
      } else if (data) {
        const reshaped = (data as any[]).map(slide => {
          if (slide.lessons) {
            return {
              ...slide,
              lessons: reshapeLessonData(slide.lessons)
            };
          }
          return slide;
        });
        setSlides(reshaped);
      }
    } catch (err: any) {
      console.error('Error fetching slides:', err);
      setErrorMessage(prev => prev || err.message || 'Error occurred while loading slides.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAttachments = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('lesson_attachments')
        .select('*')
        .eq('lesson_id', id);
      if (!error && data) {
        setAttachments(data);
      }
    } catch (err) {
      console.error('Error fetching attachments:', err);
    }
  };

  const fetchNotes = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('notes')
        .select('content, lessons(title)')
        .eq('user_id', user.id)
        .limit(3);
      
      if (data) {
        setNotes(data.map(n => ({ 
          content: n.content, 
          lesson_name: (n.lessons as any)?.title || 'General' 
        })));
      }
    } catch (err) {
      console.error('Error retrieving notes in slide viewer:', err);
    }
  };

  const fetchExercise = async (slideId: string) => {
    try {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .eq('slide_id', slideId)
        .maybeSingle();

      if (!error) setExercise(data);
      else setExercise(null);
    } catch (err) {
      console.error('Error fetching exercise for slide:', err);
      setExercise(null);
    }
  };

  const markProgress = async (slideId: string) => {
    if (!user) return;

    // Optimistic progress update
    if (!completedSlidesLocal.has(slideId)) {
      setCompletedSlidesLocal(prev => {
        const next = new Set(prev);
        next.add(slideId);
        return next;
      });

      setVelocity(prev => {
        if (!prev) return prev;
        const nextCompleted = prev.completed_count + 1;
        const total = prev.total_count || 1;
        const nextPercentage = Math.min(100, Math.round((nextCompleted / total) * 100));
        return {
          completed_count: nextCompleted,
          total_count: total,
          percentage: nextPercentage
        };
      });
    }

    try {
      await supabase.from('user_progress').upsert({
        user_id: user.id,
        slide_id: slideId,
        is_completed: true,
        completed_at: new Date().toISOString(),
      }, { onConflict: 'user_id,slide_id' });
      // Execute the update_user_streak RPC in the background
      await refreshStreak().catch(e => console.warn(e));
      // Dispatch event to instantly sync streaks client-side
      window.dispatchEvent(new Event('activity-updated'));
    } catch (err) {
      console.error('Could not archive slide progress:', err);
    }
  };

  const handleExerciseSubmit = async (optionIndex: number) => {
    if (!exercise || !user || isCorrect !== null) return;

    const correct = optionIndex === exercise.question_data.correct_answer_index;
    setUserAnswer(optionIndex);
    setIsCorrect(correct);

    if (correct) {
      confetti({
        particleCount: 160,
        spread: 80,
        origin: { y: 0.7 }
      });
    }

    try {
      await supabase.from('user_answers').insert({
        user_id: user.id,
        exercise_id: exercise.id,
        answer_data: { selected_index: optionIndex },
        is_correct: correct,
      });
      // Execute the update_user_streak RPC in the background
      await refreshStreak().catch(e => console.warn(e));
      // Dispatch event to instantly sync streaks client-side
      window.dispatchEvent(new Event('activity-updated'));
    } catch (err) {
      console.error('Could not sync user exercise answer:', err);
    }
  };

  const setReminder = async () => {
    if (!user || !currentSlide || !reminderDate) return;

    try {
      const { error } = await supabase.from('reminders').insert({
        user_id: user.id,
        slide_id: currentSlide.id,
        remind_at: new Date(reminderDate).toISOString(),
        description: reminderDesc || 'Review this slide',
      });

      if (!error) {
        setShowReminderModal(false);
        alert('Reminder set successfully!');
      } else {
        alert(`Failed to set reminder: ${error.message}`);
      }
    } catch (err: any) {
      console.error('Could not insert reminder:', err);
      alert(`Network error saving reminder: ${err?.message || err}`);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-screen bg-slate-50 text-slate-500 text-sm font-medium">Loading Learning Experience...</div>;

  if ((slides.length === 0 && !lesson) || errorMessage) {
    return (
      <div className="p-4 sm:p-8 bg-slate-950 text-slate-100 min-h-screen flex items-center justify-center font-sans">
        <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
             <GraduationCap className="w-32 h-32 text-slate-400" />
          </div>

          <div className="flex items-center gap-3.5 mb-6">
            <div className="p-3 bg-red-950/40 border border-red-900/30 text-red-400 rounded-2xl">
              <AlertCircle className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight">Lesson Information Mismatch</h2>
              <p className="text-xs text-slate-400 mt-1 uppercase font-bold tracking-widest">Diagnostic Support & Sandbox Helper</p>
            </div>
          </div>

          <div className="space-y-5">
            {/* Database Query Sourced Error */}
            {errorMessage ? (
              <div className="p-4 bg-red-950/20 border border-red-900/30 rounded-2xl">
                <span className="text-[10px] font-black text-red-400 uppercase tracking-widest font-mono">SUPABASE DB COMPLAINT</span>
                <p className="text-xs font-mono text-slate-300 mt-1.5 leading-relaxed bg-slate-950/50 p-3 rounded-lg border border-red-950 break-all">
                  {errorMessage}
                </p>
                <p className="text-[11px] text-slate-400 mt-2.5">
                  💡 <b>Are you signed in?</b> RLS configurations on the database tables limit reading material only to authenticated users. Check that you are logged in.
                </p>
              </div>
            ) : (
              <div className="p-4 bg-indigo-950/20 border border-indigo-900/30 rounded-2xl">
                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest font-mono font-bold">MISSING RECORDS OR WRONG HANDLER</span>
                <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                  No slides or lesson metadata have been fetched for this requested sequence.
                </p>
              </div>
            )}

            {/* Current UUID / Diagnostic Metrics */}
            <div className="p-4 bg-slate-950/50 border border-slate-800 rounded-2xl space-y-2">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono block">DIAGNOSTIC TELEMETRY</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 font-bold block">Target Lesson UUID:</span>
                  <span className="font-mono text-[11px] text-indigo-300 select-all break-all">{lessonId || 'Undefined'}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-bold block">Authentication Status:</span>
                  <span className="font-bold text-slate-300">{user ? `Authenticated (${user.email})` : 'Anonymous / Not Logged In'}</span>
                </div>
              </div>
            </div>

            {/* Steps to resolve in Admin Dashboard */}
            <div className="space-y-2.5">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">STEPS TO LINK SLIDES CORRECTLY IN ADMIN PANEL:</span>
              <ol className="text-xs text-slate-400 list-decimal pl-5 space-y-2 leading-relaxed">
                <li>
                  Go to <b className="text-slate-200">Admin Panel</b> and click on <b className="text-slate-200">Content Manager</b> from your side-drawer or dashboard.
                </li>
                <li>
                  Ensure you select the <b className="text-slate-200">Major</b>, the <b className="text-slate-200 text-indigo-400">Course</b>, the <b className="text-slate-200">Chapter</b>, and then select the specific <b className="text-indigo-400">Lesson</b>.
                </li>
                <li>
                  Inside the selected lesson view, look at the <b>Slide Decks in Lesson</b> section. If it is empty, click <b className="text-indigo-400 font-bold">Create Initial Slide</b>.
                </li>
                <li>
                  Click the generated Slide card to open the <b>Slide Editor</b>. Add your interactive markdown/formatted text, then hit <b className="text-green-400 font-bold">Save Changes</b>.
                </li>
              </ol>
            </div>
          </div>

          {/* Controls */}
          <div className="mt-8 pt-5 border-t border-slate-800 flex flex-wrap gap-3 items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
            >
              <ChevronLeft className="w-4 h-4" />
              Go Back
            </button>
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/')}
                className="px-5 py-2.5 bg-slate-950 hover:bg-slate-900 text-slate-400 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer"
              >
                Home Room
              </button>
              <button
                onClick={() => {
                  setErrorMessage(null);
                  if (lessonId) {
                    fetchLessonDetails(lessonId);
                    fetchSlides();
                  }
                }}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer"
              >
                Retry Request
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* Left Sidebar: Content Ladder */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 shadow-xl hidden md:flex shrink-0">
        <div className="p-4 border-b border-slate-800 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center font-bold text-white shrink-0 shadow-lg shadow-blue-500/20">TR</div>
          <div className="overflow-hidden">
            <h1 className="text-lg font-black text-white leading-none tracking-tighter">Tos Rean</h1>
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mt-1">តោះរៀន • Learn</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-4 scrollbar-hide">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-500 uppercase px-2 mb-2 tracking-widest">Navigation</p>
            <div className="bg-slate-800/50 text-white rounded-xl p-3 border border-slate-700/50 flex flex-col gap-2">
              <div className="text-xs font-bold flex items-center justify-between gap-2 overflow-hidden">
                <span className="truncate opacity-80">{activeLessonInfo?.chapters?.title || 'Chapter'}</span>
                <span className="text-[9px] bg-blue-600 px-1.5 py-0.5 rounded-full shrink-0 font-bold">LIVE</span>
              </div>
              <div className="mt-1 space-y-1">
                <div className="text-[11px] py-2 px-3 border-l-2 border-blue-500 bg-blue-500/10 text-blue-100 flex items-center gap-2 font-bold rounded-r-lg">
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
                  <span className="truncate">{activeLessonInfo?.title || 'Lesson'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2 px-2">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active Major</p>
            <div className="group flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800 cursor-pointer transition-all">
              <div className="w-6 h-6 rounded bg-slate-700 flex items-center justify-center group-hover:bg-blue-500 transition-colors">
                <BookOpen className="w-3 h-3 text-slate-400 group-hover:text-white" />
              </div>
              <span className="text-xs font-medium text-slate-400 group-hover:text-white truncate">
                {activeLessonInfo?.chapters?.majors?.title || 'My Course'}
              </span>
            </div>
          </div>
        </nav>

        <div className="p-4 bg-slate-950 border-t border-slate-800 mt-auto">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-black text-blue-400">
              {user?.email?.[0].toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-[11px] font-bold text-white truncate leading-none">{user?.email}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter">Student • Lvl 12</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 bg-white border-b border-slate-100 flex items-center justify-between px-6 shadow-sm shrink-0 z-10">
          <div className="flex items-center gap-4 min-w-0">
            <div className="flex items-center gap-2">
               <button onClick={() => navigate(-1)} className="p-1 hover:bg-slate-50 rounded text-slate-400 transition-colors">
                <Layout className="w-4 h-4" />
              </button>
              <div className="h-4 w-px bg-slate-100 hidden sm:block" />
            </div>
            <div className="flex items-center text-[10px] font-bold text-slate-400 uppercase gap-2 overflow-hidden tracking-wider">
              <span className="truncate max-w-[100px] hover:text-slate-600 transition-colors cursor-pointer">{activeLessonInfo?.chapters?.majors?.title || 'Major'}</span>
              <span className="opacity-30">/</span>
              <span className="truncate max-w-[100px] hover:text-slate-600 transition-colors cursor-pointer">{activeLessonInfo?.chapters?.title || 'Chapter'}</span>
              <span className="opacity-30">/</span>
              <span className="text-slate-900 whitespace-nowrap bg-slate-100 px-2 py-0.5 rounded tracking-normal font-bold">
                {slides.length > 0 ? `Slide ${currentSlideIndex + 1} of ${slides.length}` : 'Lecture Mode'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowReminderModal(true)}
              className="text-[10px] font-bold bg-orange-50 text-orange-700 px-3 py-2 rounded-full border border-orange-100 hover:bg-white hover:border-orange-300 transition-all uppercase tracking-tight"
            >
              Set Reminder
            </button>
            <div className="h-4 w-px bg-slate-100" />
            <div className="flex gap-1">
              {slides.length > 0 && (
                <button 
                  onClick={() => setCurrentSlideIndex(prev => Math.max(0, prev - 1))}
                  disabled={currentSlideIndex === 0}
                  className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-900 disabled:opacity-20 transition-all"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
              {slides.length === 0 || currentSlideIndex === slides.length - 1 ? (
                <button 
                  onClick={() => {
                    // Optimistically increment completed_count if we are finishing the final slide
                    if (slides.length > 0) {
                      const finalSlide = slides[currentSlideIndex];
                      if (finalSlide && !completedSlidesLocal.has(finalSlide.id)) {
                        setCompletedSlidesLocal(prev => {
                          const next = new Set(prev);
                          next.add(finalSlide.id);
                          return next;
                        });
                        setVelocity(prev => {
                          if (!prev) return prev;
                          const nextCompleted = prev.completed_count + 1;
                          const total = prev.total_count || 1;
                          const nextPercentage = Math.min(100, Math.round((nextCompleted / total) * 100));
                          return {
                            completed_count: nextCompleted,
                            total_count: total,
                            percentage: nextPercentage
                          };
                        });
                      }
                    }
                    confetti({
                      particleCount: 180,
                      spread: 85,
                      origin: { y: 0.55 }
                    });
                    setTimeout(() => {
                      confetti({
                        particleCount: 100,
                        spread: 60,
                        origin: { x: 0.35, y: 0.65 }
                      });
                      confetti({
                        particleCount: 100,
                        spread: 60,
                        origin: { x: 0.65, y: 0.65 }
                      });
                    }, 250);
                    setTimeout(() => {
                      navigate(-1);
                    }, 1200);
                  }}
                  className="px-5 py-2 rounded-lg text-xs font-black transition-all active:scale-95 shadow-lg bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-100 uppercase tracking-tight animate-bounce cursor-pointer flex items-center gap-1.5"
                >
                  🏅 Finish Lesson
                </button>
              ) : (
                <button 
                  onClick={() => setCurrentSlideIndex(prev => Math.min(slides.length - 1, prev + 1))}
                  className="px-5 py-2 rounded-lg text-xs font-bold transition-all active:scale-95 shadow-sm uppercase tracking-tight bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200"
                >
                  Next Step
                </button>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 flex gap-6 overflow-hidden flex-col lg:flex-row">
          {/* Slide Section */}
          <section className="flex-1 flex flex-col gap-4 overflow-hidden min-w-0">
            {/* Toggle tabs for Slide notes vs Video Lecture */}
            {activeLessonInfo?.video_url && (
              <div className="flex bg-slate-200/60 p-1 rounded-xl w-fit border border-slate-300/30 shrink-0">
                <button
                  onClick={() => setShowVideoMode(false)}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-tight transition-all flex items-center gap-1.5 cursor-pointer",
                    !showVideoMode
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-900"
                  )}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  Slide Notes
                </button>
                <button
                  onClick={() => setShowVideoMode(true)}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-tight transition-all flex items-center gap-1.5 cursor-pointer",
                    showVideoMode
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-900"
                  )}
                >
                  <PlayCircle className="w-3.5 h-3.5" />
                  Video Lecture
                </button>
              </div>
            )}

            {showVideoMode && activeLessonInfo?.video_url ? (
              <div className="flex-1 bg-slate-950 border border-slate-900 rounded-2xl overflow-hidden relative shadow-inner aspect-video w-full flex items-center justify-center">
                {getEmbedUrl(activeLessonInfo.video_url) ? (
                  <iframe
                    src={getEmbedUrl(activeLessonInfo.video_url)!}
                    className="absolute inset-0 w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    title="Lesson Video Lecture"
                  />
                ) : (
                  <div className="text-slate-500 text-xs font-medium flex flex-col items-center gap-2 text-center p-6">
                    <AlertCircle className="w-8 h-8 text-slate-600" />
                    <span>Invalid or raw video URL format found:</span>
                    <a 
                      href={activeLessonInfo.video_url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-blue-400 font-bold hover:underline break-all max-w-md block"
                    >
                      {activeLessonInfo.video_url}
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 bg-white border border-slate-200 rounded-2xl shadow-sm p-6 md:p-12 overflow-y-auto custom-scrollbar relative">
                <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                   <GraduationCap className="w-24 h-24" />
                </div>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentSlide?.id || 'empty-slide'}
                    initial={{ opacity: 0, scale: 0.99 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.01 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="prose prose-slate max-w-none prose-h2:text-3xl prose-h2:font-black prose-h2:text-slate-900 prose-h2:tracking-tight prose-p:text-slate-600 prose-p:leading-relaxed prose-code:bg-slate-50 prose-code:text-blue-600 prose-code:font-bold prose-code:rounded prose-code:px-1.5 prose-strong:text-slate-900"
                  >
                    <div className="markdown-body font-sans">
                      {slides.length > 0 ? (
                        (currentSlide?.content && (currentSlide.content.trim().startsWith('<') || /<[a-z][\s\S]*>/i.test(currentSlide.content))) ? (
                          <div dangerouslySetInnerHTML={{ __html: currentSlide.content }} />
                        ) : (
                          <ReactMarkdown>{currentSlide?.content || ''}</ReactMarkdown>
                        )
                      ) : (
                        <div className="text-center py-16 text-slate-400">
                          <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-30 text-slate-400" />
                          <h3 className="text-base font-black text-slate-700 uppercase tracking-wide">No Slides Generated</h3>
                          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                            This lesson has no slide presentations yet. Check out the lesson materials or video lecture if available!
                          </p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            )}

            {/* Interactive Exercise Engine */}
            {exercise && (
              <div className="bg-blue-600 rounded-2xl p-6 shadow-xl shadow-blue-100 overflow-hidden relative shrink-0">
                 <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl pointer-events-none" />
                <div className="flex items-center justify-between mb-4 relative z-10">
                  <h3 className="text-[10px] font-black text-blue-100 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Trophy className="w-3.5 h-3.5" />
                    Interactive Lab
                  </h3>
                  <span className="text-[10px] font-black bg-white/20 text-white px-2.5 py-1 rounded-full backdrop-blur-md">10 XP</span>
                </div>
                <p className="text-base font-bold text-white mb-6 leading-snug relative z-10">{exercise.question_data.question}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 relative z-10">
                  {exercise.question_data.options.map((option, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleExerciseSubmit(idx)}
                      disabled={isCorrect !== null}
                      className={cn(
                        "text-left p-4 rounded-xl text-xs font-bold transition-all flex justify-between items-center group backdrop-blur-sm border-2",
                        userAnswer === idx
                          ? isCorrect
                            ? "bg-green-500 border-green-400 text-white"
                            : "bg-red-500 border-red-400 text-white"
                          : isCorrect !== null && idx === exercise.question_data.correct_answer_index
                            ? "bg-green-500/50 border-green-400 text-white"
                            : "bg-white/10 border-white/10 text-blue-50 hover:bg-white/20 hover:border-white/20"
                      )}
                    >
                      <span className="flex-1 opacity-90">{option}</span>
                      {isCorrect !== null && idx === exercise.question_data.correct_answer_index && (
                        <CheckCircle2 className="w-5 h-5 text-white shrink-0 ml-2" />
                      )}
                      {userAnswer === idx && !isCorrect && (
                        <AlertCircle className="w-5 h-5 text-white shrink-0 ml-2 animate-bounce" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Right Sidebar: Analytical Widgets */}
          <aside className="w-full lg:w-72 flex flex-col gap-5 overflow-hidden shrink-0">
            {/* Adaptive Progress Widget */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest flex items-center gap-2">
                <History className="w-3.5 h-3.5" />
                Study Velocity
              </h3>
              <div className="flex items-end justify-between mb-2">
                <span className="text-3xl font-black text-slate-900 tracking-tighter">{displayPercentage}%</span>
                <span className="text-[10px] font-bold text-slate-500 mb-1">{displayCompleted}/{displayTotal} LESSONS</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${displayPercentage}%` }}
                  className="bg-blue-600 h-full rounded-full"
                ></motion.div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span className="text-[9px] font-bold text-slate-500 uppercase">On Track</span>
                </div>
                <span className="text-[9px] font-bold text-blue-600">+2.4% today</span>
              </div>
            </div>

            {/* Lesson Materials / Resource Downloads Widget */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col max-h-[250px] overflow-hidden">
              <h3 className="text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest flex items-center gap-2">
                <Paperclip className="w-3.5 h-3.5 text-blue-500" />
                Lesson Materials
              </h3>
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                {attachments.map((file) => {
                  const isImage = file.file_type === 'image' || file.file_type.startsWith('image/');
                  const isPdf = file.file_type === 'pdf' || file.file_type.includes('pdf') || file.file_name.toLowerCase().endsWith('.pdf');
                  const canPreview = isImage || isPdf;
                  
                  return (
                    <div 
                      key={file.id} 
                      className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-100/80 transition-all flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {isImage ? (
                          <Image className="w-4 h-4 text-emerald-500 shrink-0" />
                        ) : isPdf ? (
                          <FileText className="w-4 h-4 text-rose-500 shrink-0" />
                        ) : (
                          <Paperclip className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                        <div className="overflow-hidden">
                          <p className="text-xs font-bold text-slate-700 truncate" title={file.file_name}>
                            {file.file_name}
                          </p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">
                            {formatBytes(file.file_size)}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-1 shrink-0">
                        {canPreview && (
                          <button
                            onClick={() => setSelectedAttachmentForPreview(file)}
                            className="p-1 px-2 text-[10px] font-extrabold text-blue-600 bg-blue-50 border border-blue-100 rounded-lg hover:bg-blue-100 hover:text-blue-700 transition-colors flex items-center gap-1 cursor-pointer"
                            title="Preview file"
                          >
                            <Eye className="w-3 h-3" />
                            <span>View</span>
                          </button>
                        )}
                        <a
                          href={file.file_url}
                          download={file.file_name}
                          target="_blank"
                          rel="noreferrer referrer"
                          className="p-1 px-2 text-[10px] font-extrabold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors flex items-center gap-1 shadow-sm"
                          title="Download file"
                        >
                          <Download className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  );
                })}
                
                {attachments.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 py-6 text-center">
                    <Paperclip className="w-7 h-7 opacity-20 mb-2" />
                    <p className="text-[9px] font-black uppercase tracking-widest opacity-60">No materials attached</p>
                  </div>
                )}
              </div>
            </div>

            {/* Knowledge Repository (Notes) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex-1 flex flex-col min-h-[300px]">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-50">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Smart Notes</h3>
                <PlusCircle className="w-4 h-4 text-blue-500 cursor-pointer hover:scale-110 transition-transform" />
              </div>
              <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
                {notes.map((note, idx) => (
                  <div key={idx} className="p-3.5 bg-amber-50/50 border border-amber-100 rounded-xl hover:bg-amber-50 transition-all group">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-amber-400 rounded-full" />
                      <span className="text-[9px] font-black text-amber-800 uppercase tracking-tight truncate">{note.lesson_name}</span>
                    </div>
                    <p className="text-[11px] text-amber-900/80 leading-relaxed font-medium line-clamp-4">{note.content}</p>
                    <div className="mt-2 text-[8px] font-bold text-amber-700/50 uppercase opacity-0 group-hover:opacity-100 transition-opacity">Just now</div>
                  </div>
                ))}
                {notes.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 p-4 text-center">
                    <StickyNote className="w-10 h-10 opacity-10 mb-3" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Repository Empty</p>
                    <p className="text-[10px] mt-2 opacity-50 font-medium">Capture insights to reinforce your learning.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Neural Reminder (Spaced Repetition) */}
            <div className="bg-slate-900 rounded-2xl p-5 shadow-2xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-blue-500/20 transition-all" />
              <h3 className="text-[10px] font-black text-blue-400 uppercase mb-4 tracking-widest flex items-center gap-2 relative z-10">
                <Clock className="w-3.5 h-3.5" />
                Spaced Recall
              </h3>
              <div className="space-y-2 relative z-10">
                <div className="flex items-center justify-between bg-slate-800/80 p-3 rounded-xl hover:bg-slate-800 border border-slate-700/50 transition-all cursor-pointer">
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-white text-[11px] font-black tracking-tight truncate">Limit Theory</span>
                    <span className="text-[9px] text-slate-500 font-bold uppercase mt-0.5">Retain in 2h</span>
                  </div>
                  <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-[10px] font-black text-white shadow-lg shadow-blue-500/20">R</div>
                </div>
              </div>
              <p className="text-[9px] text-slate-500 mt-5 font-bold uppercase tracking-tight text-center relative z-10 italic">Recall strength: 82%</p>
            </div>
          </aside>
        </main>
      </div>

      {/* Reminder Modal (Theme Consistent) */}
      {showReminderModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl border border-slate-100"
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-orange-50 rounded-2xl text-orange-600 border border-orange-100 shadow-sm">
                <Bookmark className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tighter leading-none">Schedule Recap</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1.5 tracking-widest">Spaced Repetition</p>
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Trigger Date</label>
                <input 
                  type="datetime-local" 
                  className="w-full border-2 border-slate-50 bg-slate-50 p-3.5 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-white outline-none text-sm font-bold transition-all"
                  value={reminderDate}
                  onChange={(e) => setReminderDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Review Strategy</label>
                <textarea 
                  className="w-full border-2 border-slate-50 bg-slate-50 p-3.5 rounded-xl h-28 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-white outline-none text-xs font-medium resize-none transition-all leading-relaxed"
                  placeholder="E.g., memorize the differentiation rule"
                  value={reminderDesc}
                  onChange={(e) => setReminderDesc(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-4 mt-10">
              <button 
                onClick={() => setShowReminderModal(false)}
                className="flex-1 px-6 py-3 text-[11px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={setReminder}
                disabled={!reminderDate}
                className="flex-1 px-6 py-3 bg-blue-600 text-white text-[11px] font-black rounded-xl hover:bg-blue-700 disabled:opacity-50 shadow-xl shadow-blue-200 transition-all active:scale-95 uppercase tracking-widest"
              >
                Set Recall
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* File Preview Modal */}
      {selectedAttachmentForPreview && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4 lg:p-8">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-slate-100"
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50">
              <div className="flex items-center gap-3 min-w-0">
                <Paperclip className="w-5 h-5 text-blue-500 shrink-0" />
                <div className="min-w-0">
                  <h3 className="text-sm font-black text-slate-900 truncate" title={selectedAttachmentForPreview.file_name}>
                    {selectedAttachmentForPreview.file_name}
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                    Internal Preview • {formatBytes(selectedAttachmentForPreview.file_size)}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedAttachmentForPreview(null)}
                className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-700 transition-colors shrink-0 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Material Viewer Frame */}
            <div className="flex-1 bg-slate-100 p-4 overflow-auto flex items-center justify-center relative">
              {(selectedAttachmentForPreview.file_type === 'image' || selectedAttachmentForPreview.file_type.startsWith('image/')) ? (
                <img 
                  src={selectedAttachmentForPreview.file_url} 
                  alt={selectedAttachmentForPreview.file_name}
                  className="max-w-full max-h-full object-contain rounded-lg shadow"
                  referrerPolicy="no-referrer"
                />
              ) : (selectedAttachmentForPreview.file_type === 'pdf' || selectedAttachmentForPreview.file_type.includes('pdf') || selectedAttachmentForPreview.file_name.toLowerCase().endsWith('.pdf')) ? (
                <iframe 
                  src={`${selectedAttachmentForPreview.file_url}`} 
                  className="w-full h-full border-0 rounded-lg shadow bg-white"
                  title="PDF Viewer"
                />
              ) : (
                <div className="text-center p-8 bg-white border border-slate-200 rounded-2xl max-w-sm shadow-sm">
                  <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
                  <p className="text-xs font-bold text-slate-800">Preview unsupported for this file type</p>
                  <p className="text-[10px] text-slate-400 mt-1 mb-4">Please download to view locally.</p>
                  <a
                    href={selectedAttachmentForPreview.file_url}
                    download={selectedAttachmentForPreview.file_name}
                    target="_blank"
                    rel="noreferrer referrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download File
                  </a>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

// Helper icon not imported but used in JSX
function GraduationCap(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </svg>
  );
}
