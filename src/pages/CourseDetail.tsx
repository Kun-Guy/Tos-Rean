import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Play, 
  CheckCircle2, 
  Lock, 
  ChevronRight, 
  ArrowLeft,
  FileText,
  Library,
  StickyNote,
  Clock,
  User as UserIcon,
  BarChart3,
  BookX,
  Star,
  Flame
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import LearningPathMap from '../components/LearningPathMap';
import confetti from 'canvas-confetti';

export default function CourseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('syllabus');
  const [major, setMajor] = useState<any>(null);
  const [chapters, setChapters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Gamification & Real-Time states
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [averageRating, setAverageRating] = useState<number>(4.6);
  const [reviewCount, setReviewCount] = useState<number>(0);
  const [studentCount, setStudentCount] = useState<number>(120);
  const [liveStudyingCount, setLiveStudyingCount] = useState<number>(120);

  // Sync live counting on load / updates
  useEffect(() => {
    setLiveStudyingCount(studentCount);
  }, [studentCount]);

  // Simulate concurrent students actively studying this course live
  useEffect(() => {
    const timer = setInterval(() => {
      setLiveStudyingCount(prev => {
        const delta = Math.floor(Math.random() * 5) - 2; // -2, -1, 0, +1, or +2
        const nextVal = prev + delta;
        const minVal = Math.max(1, studentCount - 5);
        const maxVal = studentCount + 5;
        if (nextVal < minVal) return minVal;
        if (nextVal > maxVal) return maxVal;
        return nextVal;
      });
    }, 4500 + Math.random() * 3500);

    return () => clearInterval(timer);
  }, [studentCount]);

  // Fetch course rating statistics and live enrollment count via RPC
  const fetchRatingStats = async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase
        .rpc('get_course_stats', { course_id: id });

      if (!error && data) {
        const parsed = typeof data === 'string' ? JSON.parse(data) : data;
        setAverageRating(parsed.average_rating !== null ? Number(parsed.average_rating) : 4.6);
        setReviewCount(parsed.review_count !== null ? Number(parsed.review_count) : 0);
        setStudentCount((parsed.enrolled_count !== null ? Number(parsed.enrolled_count) : 0) + 120);
      } else {
        // Fallback robust calculation
        const { data: ratingsQuery } = await supabase
          .from('course_ratings')
          .select('rating')
          .eq('course_id', id);

        if (ratingsQuery) {
          const count = ratingsQuery.length;
          const sum = ratingsQuery.reduce((acc, r) => acc + r.rating, 0);
          setAverageRating(count > 0 ? Number((sum / count).toFixed(1)) : 4.6);
          setReviewCount(count);
        }

        const { count: enrollCount } = await supabase
          .from('user_courses')
          .select('*', { count: 'exact', head: true })
          .eq('course_id', id);

        if (enrollCount !== null) {
          setStudentCount(enrollCount + 120);
        }
      }
    } catch (err) {
      console.error('Error loading statistics:', err);
    }
  };

  // Submit course rating stars
  const submitRating = async (ratingVal: number) => {
    if (!user || !id || !isEnrolled) return;
    setIsSubmittingRating(true);
    try {
      const { error } = await supabase
        .from('course_ratings')
        .upsert(
          {
            user_id: user.id,
            course_id: id,
            rating: ratingVal,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'user_id,course_id' }
        );

      if (!error) {
        setUserRating(ratingVal);
        await fetchRatingStats();
        confetti({
          particleCount: 140,
          spread: 80,
          origin: { y: 0.6 }
        });
      } else {
        console.error('Failed to submit course rating:', error);
      }
    } catch (err) {
      console.error('Rating submission exception:', err);
    } finally {
      setIsSubmittingRating(false);
    }
  };

  useEffect(() => {
    async function fetchCourseDetails() {
      if (!id) return;
      setLoading(true);
      try {
        // 1. Fetch Course details
        const { data: courseData, error: courseError } = await supabase
          .from('courses')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (courseError) {
          console.error("Error fetching course details:", courseError);
        } else if (courseData) {
          setMajor(courseData);
        }

        // 2. Fetch enrollment status & user's specific course rating
        if (user) {
          const { data: enrollment } = await supabase
            .from('user_courses')
            .select('id')
            .eq('user_id', user.id)
            .eq('course_id', id)
            .maybeSingle();
          setIsEnrolled(!!enrollment);

          const { data: userRatingRecord } = await supabase
            .from('course_ratings')
            .select('rating')
            .eq('user_id', user.id)
            .eq('course_id', id)
            .maybeSingle();
          if (userRatingRecord) {
            setUserRating(userRatingRecord.rating);
          }
        }

        // 3. Fetch collective rating statistics & enrollment headcount via RPC
        await fetchRatingStats();

        // 5. Fetch User Progress (Slide completions)
        let completedSlideIds = new Set<string>();
        if (user) {
          const { data: progressData } = await supabase
            .from('user_progress')
            .select('slide_id')
            .eq('user_id', user.id);
          
          if (progressData) {
            completedSlideIds = new Set(progressData.map(p => p.slide_id));
          }
        }

        // 6. Fetch Chapters strictly belonging to this course
        const { data: chaptersData, error: chaptersError } = await supabase
          .from('chapters')
          .select(`
            id,
            title,
            sequence_order,
            lessons (
              id,
              title,
              sequence_order,
              slides (
                id
              )
            )
          `)
          .eq('course_id', id)
          .order('sequence_order', { ascending: true });

        if (chaptersError) {
          console.error("Error fetching chapters:", chaptersError);
        } else if (chaptersData) {
          const processedChapters = chaptersData.map((chap: any) => {
            const sortedLessons = (chap.lessons || []).sort((a: any, b: any) => a.sequence_order - b.sequence_order);
            
            const lessonsWithStatus = sortedLessons.map((lesson: any) => {
              const totalSlides = lesson.slides?.length || 0;
              const completedSlides = lesson.slides?.filter((sl: any) => completedSlideIds.has(sl.id)).length || 0;
              
              let status: 'completed' | 'current' | 'locked' = 'locked';
              if (totalSlides > 0 && completedSlides === totalSlides) {
                status = 'completed';
              } else if (completedSlides > 0) {
                status = 'current';
              } else {
                status = 'current';
              }

              return {
                ...lesson,
                status,
                duration: `${10 + (lesson.title.length % 5) * 5}m`
              };
            });

            return {
              ...chap,
              lessons: lessonsWithStatus
            };
          });

          setChapters(processedChapters);
        }
      } catch (err) {
        console.error("Failed to load course details:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchCourseDetails();

    // 7. Subscribe to real-time events for students counting and course ratings
    const enrollmentChannel = supabase
      .channel(`course-details-realtime-${id}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'user_courses', 
          filter: `course_id=eq.${id}` 
        },
        async () => {
          // Re-fetch aggregate stats via RPC
          await fetchRatingStats();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'course_ratings',
          filter: `course_id=eq.${id}`
        },
        async () => {
          // Re-fetch aggregate stats via RPC
          await fetchRatingStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(enrollmentChannel);
    };
  }, [id, user]);

  const activeLesson = chapters.flatMap(c => c.lessons).find(l => l.status === 'current') || chapters[0]?.lessons[0];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4 animate-pulse">
        <div className="w-16 h-16 bg-slate-100 rounded-full"></div>
        <div className="h-6 bg-slate-100 rounded w-1/4"></div>
        <div className="h-4 bg-slate-100 rounded w-1/3"></div>
      </div>
    );
  }

  if (!major) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <BookX className="w-16 h-16 text-slate-300 mb-4" />
        <h3 className="text-xl font-bold text-slate-700">Course Not Found</h3>
        <p className="text-sm text-slate-500 mt-2">The selected major may have been archived or removed.</p>
        <button onClick={() => navigate('/courses')} className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all">
          Back to Courses
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      {/* Header / Back Button */}
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </button>

      {/* Hero Header */}
      <section className="bg-white border border-slate-100 rounded-[2.5rem] p-8 md:p-12 shadow-sm relative overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-8">
        <div className="relative z-10 flex-1 space-y-6">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-100">
              Digital Economy Major
            </span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter leading-tight max-w-2xl">
            {major.title}
          </h1>

          {major.description && (
            <p className="text-sm font-medium text-slate-505 leading-relaxed text-slate-500 max-w-xl">
              {major.description}
            </p>
          )}

          {/* Course Rating Star Interactions Widget */}
          <div className="flex flex-col gap-2.5 p-5 bg-gradient-to-r from-slate-50 to-slate-100/50 rounded-3xl border border-slate-100/80 max-w-md">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                {isEnrolled ? "Rating feedback" : "Secure Course Enrollment Required"}
              </span>
              <div className="flex items-center gap-1 text-xs font-black text-slate-850">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span>{averageRating} ({reviewCount} reviews)</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div 
                onMouseLeave={() => setHoveredStar(null)}
                className="flex gap-1"
              >
                {[1, 2, 3, 4, 5].map((star) => {
                  const currentHighlight = hoveredStar !== null ? hoveredStar : userRating;
                  const isStarred = currentHighlight !== null && star <= currentHighlight;
                  return (
                    <button
                      key={star}
                      disabled={!isEnrolled || isSubmittingRating}
                      onMouseEnter={() => isEnrolled && setHoveredStar(star)}
                      onClick={() => submitRating(star)}
                      title={!isEnrolled ? "You must be enrolled to rate this course." : `Rate ${star} Stars`}
                      className={cn(
                        "p-1 transition-all duration-200 outline-none",
                        isEnrolled 
                          ? "cursor-pointer hover:scale-125 focus:scale-110 text-amber-500" 
                          : "opacity-45 cursor-not-allowed text-slate-300",
                        isStarred ? "text-amber-500" : "text-slate-300"
                      )}
                    >
                      <Star className={cn("w-6 h-6 transition-transform duration-100", isStarred ? "fill-amber-500 text-amber-500" : "fill-transparent")} />
                    </button>
                  );
                })}
              </div>
              {userRating !== null ? (
                <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-xl uppercase tracking-tight">
                  Rated {userRating} Stars
                </span>
              ) : (
                <span className="text-[10px] font-bold text-slate-450">
                  {isEnrolled ? "Cast star review" : "Enroll in this Major to rate"}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center gap-8 pt-4">
            <div className="flex-1 max-w-xs">
              <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                <span>Units Complete</span>
                <span className="text-blue-600">Active</span>
              </div>
              <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                <div className="h-full bg-blue-600 w-[15%] rounded-full shadow-sm shadow-blue-200"></div>
              </div>
            </div>
            
            <div className="flex gap-4">
               <div className="flex flex-col">
                 <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Chapters</span>
                 <span className="text-lg font-black text-slate-900">{chapters.length} Units</span>
               </div>
               <div className="w-px h-8 bg-slate-100 self-center"></div>
               <div className="flex flex-col">
                 <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Live Enrollment</span>
                 <span className="text-md font-black text-rose-600 flex items-center gap-1.5" id="live_enrollment_counter">
                    <span className="relative flex h-2 w-2 mr-0.5 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                    </span>
                   <Flame className="w-4 h-4 text-rose-500 fill-rose-500 animate-pulse shrink-0" />
                   {liveStudyingCount.toLocaleString()} studying
                 </span>
               </div>
            </div>
          </div>

          {activeLesson ? (
            <button 
              onClick={() => navigate(`/lesson/${activeLesson.id}`)}
              className="px-10 py-5 bg-slate-900 text-white rounded-3xl font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-slate-200 hover:bg-black transition-all active:scale-95 flex items-center gap-3"
            >
              <Play className="w-5 h-5 fill-white" />
              Continue Lesson
            </button>
          ) : (
            <div className="text-sm font-bold text-slate-400 max-w-md">Chapters and lessons are being published by our authors soon. Check back shortly!</div>
          )}
        </div>

        {/* Course Cover Image */}
        <div className="w-full lg:w-80 h-48 lg:h-64 rounded-3xl overflow-hidden shrink-0 bg-slate-100 relative shadow-lg">
          <img 
            src={major.cover_image_url || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=600&auto=format&fit=crop'} 
            alt={major.title}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=600&auto=format&fit=crop';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
        </div>
      </section>

      {/* Tabs */}
      <div className="flex gap-8 border-b border-slate-100 px-4">
        {[
          { id: 'syllabus', label: 'Syllabus', icon: Library },
          { id: 'notes', label: 'My Notes', icon: StickyNote },
          { id: 'resources', label: 'Resources', icon: FileText },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "pb-4 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 transition-all relative",
              activeTab === tab.id ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {activeTab === tab.id && (
              <motion.div 
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full"
              />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'syllabus' && (
          <div className="space-y-6">
            {chapters.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-20 bg-slate-50/50 border-2 border-dashed border-slate-200 rounded-[2.5rem] text-center">
                <BookX className="w-16 h-16 text-slate-300 mb-4" />
                <p className="text-sm font-bold text-slate-600 uppercase tracking-widest">No Curriculum Published</p>
                <p className="text-xs text-slate-400 mt-2 max-w-xs mx-auto">Syllabus is being prepared for this major. Please check back later!</p>
              </div>
            ) : (
              <LearningPathMap chapters={chapters} />
            )}
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="flex flex-col items-center justify-center p-20 bg-amber-50/30 border-2 border-dashed border-amber-100 rounded-[2.5rem] text-center">
             <StickyNote className="w-16 h-16 text-amber-200 mb-4" />
             <p className="text-sm font-bold text-amber-700 uppercase tracking-widest">No Lecture Notes Yet</p>
             <p className="text-xs text-amber-600/70 mt-2 max-w-xs mx-auto">Start viewing slides to capture key insights and build your repository.</p>
          </div>
        )}

        {activeTab === 'resources' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { title: 'Lecture Slides PDF', size: '2.4 MB', type: 'document' },
              { title: 'Case Study: Data Governance', size: '1.1 MB', type: 'document' },
              { title: 'Unit 01 Exam Prep', size: '0.5 MB', type: 'document' },
            ].map((res, i) => (
              <div key={i} className="bg-white p-5 rounded-2xl border border-slate-100 flex items-center justify-between group cursor-pointer hover:border-blue-100 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-50 flex items-center justify-center rounded-xl text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-slate-900 tracking-tight">{res.title}</h5>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{res.size}</span>
                  </div>
                </div>
                <button className="text-[10px] font-black text-blue-600 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Download</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
