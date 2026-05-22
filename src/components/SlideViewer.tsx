import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
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
  Trophy
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';

interface Slide {
  id: string;
  content: string;
  sequence_order: number;
  lesson_id: string;
  lessons?: {
    title: string;
    chapters?: {
      title: string;
      majors?: {
        title: string;
      };
    };
  };
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
  const { user } = useAuth();

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

  const currentSlide = slides[currentSlideIndex];

  useEffect(() => {
    if (lessonId) {
      fetchSlides();
      fetchNotes();
    }
  }, [lessonId]);

  useEffect(() => {
    if (currentSlide) {
      fetchExercise(currentSlide.id);
      markProgress(currentSlide.id);
      setUserAnswer(null);
      setIsCorrect(null);
    }
  }, [currentSlide]);

  const fetchSlides = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('slides')
      .select(`
        id, 
        content, 
        sequence_order,
        lesson_id,
        lessons (
          title,
          chapter_id,
          chapters (
            title,
            major_id,
            majors (
              title
            )
          )
        )
      `)
      .eq('lesson_id', lessonId)
      .order('sequence_order', { ascending: true });

    if (!error && data) {
      setSlides(data as any[]);
    }
    setLoading(false);
  };

  const fetchNotes = async () => {
    if (!user) return;
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
  };

  const fetchExercise = async (slideId: string) => {
    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .eq('slide_id', slideId)
      .maybeSingle();

    if (!error) setExercise(data);
    else setExercise(null);
  };

  const markProgress = async (slideId: string) => {
    if (!user) return;
    await supabase.from('user_progress').upsert({
      user_id: user.id,
      slide_id: slideId,
      is_completed: true,
      completed_at: new Date().toISOString(),
    }, { onConflict: 'user_id,slide_id' });
  };

  const handleExerciseSubmit = async (optionIndex: number) => {
    if (!exercise || !user || isCorrect !== null) return;

    const correct = optionIndex === exercise.question_data.correct_answer_index;
    setUserAnswer(optionIndex);
    setIsCorrect(correct);

    await supabase.from('user_answers').insert({
      user_id: user.id,
      exercise_id: exercise.id,
      answer_data: { selected_index: optionIndex },
      is_correct: correct,
    });
  };

  const setReminder = async () => {
    if (!user || !currentSlide || !reminderDate) return;

    const { error } = await supabase.from('reminders').insert({
      user_id: user.id,
      slide_id: currentSlide.id,
      remind_at: new Date(reminderDate).toISOString(),
      description: reminderDesc || 'Review this slide',
    });

    if (!error) {
      setShowReminderModal(false);
      alert('Reminder set successfully!');
    }
  };

  if (loading) return <div className="flex items-center justify-center h-screen bg-slate-50 text-slate-500 text-sm font-medium">Loading Learning Experience...</div>;
  if (slides.length === 0) return <div className="p-8 text-center bg-slate-50 min-h-screen flex items-center justify-center">No slides found for this lesson.</div>;

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
                <span className="truncate opacity-80">{currentSlide?.lessons?.chapters?.title || 'Chapter'}</span>
                <span className="text-[9px] bg-blue-600 px-1.5 py-0.5 rounded-full shrink-0 font-bold">LIVE</span>
              </div>
              <div className="mt-1 space-y-1">
                <div className="text-[11px] py-2 px-3 border-l-2 border-blue-500 bg-blue-500/10 text-blue-100 flex items-center gap-2 font-bold rounded-r-lg">
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
                  <span className="truncate">{currentSlide?.lessons?.title || 'Lesson'}</span>
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
                {currentSlide?.lessons?.chapters?.majors?.title || 'My Course'}
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
              <span className="truncate max-w-[100px] hover:text-slate-600 transition-colors cursor-pointer">{currentSlide?.lessons?.chapters?.majors?.title || 'Major'}</span>
              <span className="opacity-30">/</span>
              <span className="truncate max-w-[100px] hover:text-slate-600 transition-colors cursor-pointer">{currentSlide?.lessons?.chapters?.title || 'Chapter'}</span>
              <span className="opacity-30">/</span>
              <span className="text-slate-900 whitespace-nowrap bg-slate-100 px-2 py-0.5 rounded tracking-normal font-bold">Slide {currentSlideIndex + 1} of {slides.length}</span>
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
              <button 
                onClick={() => setCurrentSlideIndex(prev => Math.max(0, prev - 1))}
                disabled={currentSlideIndex === 0}
                className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-900 disabled:opacity-20 transition-all"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setCurrentSlideIndex(prev => Math.min(slides.length - 1, prev + 1))}
                disabled={currentSlideIndex === slides.length - 1}
                className={cn(
                  "px-5 py-2 rounded-lg text-xs font-bold transition-all active:scale-95 shadow-sm uppercase tracking-tight",
                  currentSlideIndex === slides.length - 1
                    ? "bg-slate-50 text-slate-300 cursor-not-allowed"
                    : "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200"
                )}
              >
                Next Step
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 flex gap-6 overflow-hidden flex-col lg:flex-row">
          {/* Slide Section */}
          <section className="flex-1 flex flex-col gap-5 overflow-hidden min-w-0">
            <div className="flex-1 bg-white border border-slate-200 rounded-2xl shadow-sm p-6 md:p-12 overflow-y-auto custom-scrollbar relative">
              <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                 <GraduationCap className="w-24 h-24" />
              </div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentSlide?.id}
                  initial={{ opacity: 0, scale: 0.99 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.01 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="prose prose-slate max-w-none prose-h2:text-3xl prose-h2:font-black prose-h2:text-slate-900 prose-h2:tracking-tight prose-p:text-slate-600 prose-p:leading-relaxed prose-code:bg-slate-50 prose-code:text-blue-600 prose-code:font-bold prose-code:rounded prose-code:px-1.5 prose-strong:text-slate-900"
                >
                  <div className="markdown-body font-sans">
                    <ReactMarkdown>{currentSlide?.content || ''}</ReactMarkdown>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

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
                <span className="text-3xl font-black text-slate-900 tracking-tighter">24%</span>
                <span className="text-[10px] font-bold text-slate-500 mb-1">12/50 LESSONS</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '24%' }}
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
