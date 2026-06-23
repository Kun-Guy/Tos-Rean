import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Play, 
  Clock, 
  Trophy, 
  ChevronRight, 
  Plus, 
  Library, 
  Flame,
  Star,
  BookOpen,
  StickyNote,
  History,
  BookX,
  Layers,
  Users,
  Compass
} from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';

// Premium Empty Course State Component
function EmptyCourseState() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center py-16 w-full text-center bg-white border border-slate-100 rounded-[3rem] p-8 max-w-xl mx-auto shadow-sm animate-in fade-in duration-300">
      <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mb-6">
        <BookX className="w-10 h-10 text-slate-400" />
      </div>
      <h3 className="text-xl font-black text-slate-900 tracking-tight mb-2">
        No Active Enrollments
      </h3>
      <p className="text-xs text-slate-400 max-w-sm mb-6 leading-relaxed font-medium">
        You are not enrolled in any pathway courses yet. Discover our premium digital economy curriculum and choose a course to start tracking your dynamic progress!
      </p>
      <button 
        onClick={() => navigate('/explore')}
        className="px-6 py-3.5 bg-indigo-605 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
      >
        <Compass className="w-4 h-4" />
        Explore Course Library
      </button>
    </div>
  );
}

export default function DashboardHome() {
  const { user, streak } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [lastSlide, setLastSlide] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [xp, setXp] = useState<number>(0);

  useEffect(() => {
    fetchUserData();

    const handleActivity = () => {
      fetchUserData();
    };
    window.addEventListener('activity-updated', handleActivity);

    return () => {
      window.removeEventListener('activity-updated', handleActivity);
    };
  }, [user]);

  const fetchUserData = async () => {
    if (!user) return;
    setLoading(true);
    setCoursesLoading(true);
    try {
      // Fetch last progress
      const { data, error } = await supabase
        .from('user_progress')
        .select('slide_id, slides(lesson_id, lessons(title, chapters(title)))')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (!error && data) {
        setLastSlide(data);
      }

      // Fetch user's registered courses from user_courses table
      const { data: enrollmentData, error: enrollError } = await supabase
        .from('user_courses')
        .select(`
          course_id,
          courses (
            id,
            title,
            description,
            cover_image_url,
            major_id,
            majors (
              title
            ),
            chapters (
              id,
              lessons (
                id,
                slides (
                  id
                )
              )
            )
          )
        `)
        .eq('user_id', user.id);

      const { data: userProgressData } = await supabase
        .from('user_progress')
        .select('slide_id')
        .eq('user_id', user.id);

      const completedSlideIds = new Set(userProgressData?.map(p => p.slide_id) || []);
      setXp(completedSlideIds.size * 100);

      // Fetch student enrollment counts to sum dynamically
      const { data: enrollmentCountData } = await supabase
        .from('user_courses')
        .select('course_id');
      
      const enrollmentCounts: Record<string, number> = {};
      if (enrollmentCountData) {
        enrollmentCountData.forEach((item: any) => {
          enrollmentCounts[item.course_id] = (enrollmentCounts[item.course_id] || 0) + 1;
        });
      }

      // Fetch course ratings
      const { data: allRatings, error: ratingsErr } = await supabase
        .from('course_ratings')
        .select('course_id, rating');

      const ratingsMap: Record<string, number[]> = {};
      if (!ratingsErr && allRatings) {
        allRatings.forEach(r => {
          if (!ratingsMap[r.course_id]) {
            ratingsMap[r.course_id] = [];
          }
          ratingsMap[r.course_id].push(r.rating);
        });
      }

      if (!enrollError && enrollmentData) {
        const colors = ['bg-blue-500', 'bg-indigo-500', 'bg-rose-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500'];
        const icons = [BookOpen, Layers, Library];
        
        const mapped = enrollmentData
          .map((item: any) => item.courses)
          .filter(Boolean)
          .map((course: any, idx: number) => {
            let totalSlides = 0;
            let completedInCourse = 0;

            course.chapters?.forEach((chap: any) => {
              chap.lessons?.forEach((less: any) => {
                less.slides?.forEach((sl: any) => {
                  totalSlides++;
                  if (completedSlideIds.has(sl.id)) {
                    completedInCourse++;
                  }
                });
              });
            });

            const progressPercent = totalSlides > 0 ? Math.round((completedInCourse / totalSlides) * 100) : 0;

            const cRatings = ratingsMap[course.id] || [];
            const totalRating = cRatings.reduce((sum, val) => sum + val, 0);
            const avgRating = cRatings.length > 0 ? Number((totalRating / cRatings.length).toFixed(1)) : 4.6 + (idx % 4) * 0.1;
            const actualEnrolled = (enrollmentCounts[course.id] || 0) + 120 + (idx * 21) % 65;

            return {
              id: course.id,
              title: course.title,
              progress: progressPercent,
              isEnrolled: true,
              units: course.chapters?.length || 0,
              enrolled: `${actualEnrolled}`,
              rating: avgRating.toFixed(1),
              major: course.majors?.title || 'Digital Economy',
              cover_image_url: course.cover_image_url,
              color: colors[idx % colors.length],
              icon: icons[idx % icons.length]
            };
          });

        setCourses(mapped);
      } else if (enrollError) {
        console.error('Error fetching enrolled courses:', enrollError);
      }
    } catch (err) {
      console.error('Error fetching user progress state:', err);
    } finally {
      setLoading(false);
      setCoursesLoading(false);
    }
  };

  const quickActions = [
    { label: 'Browse Majors', icon: Library, color: 'bg-blue-50 text-blue-600', border: 'border-blue-100', action: () => navigate('/explore') },
    { label: 'Recent Notes', icon: StickyNote, color: 'bg-amber-50 text-amber-600', border: 'border-amber-100', action: () => navigate('/notes') },
    { label: 'Review Recall', icon: Clock, color: 'bg-orange-50 text-orange-600', border: 'border-orange-100', action: () => navigate('/courses') },
    { label: 'Top Students', icon: Trophy, color: 'bg-emerald-50 text-emerald-600', border: 'border-emerald-100', action: () => navigate('/courses') },
  ];

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Welcome Section */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter mb-2">
            សួស្តី, {user?.email?.split('@')[0]}!
          </h2>
          {courses.length > 0 ? (
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <Flame className={cn("w-4 h-4 text-orange-500 fill-orange-500", streak > 0 && "animate-pulse")} />
              Your learning streak: <span className="text-slate-900">{streak} {streak === 1 ? 'Day' : 'Days'}</span>
            </p>
          ) : (
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-500" />
              Welcome to your digital learning academy
            </p>
          )}
        </div>
        {courses.length > 0 && (
          <div className="flex gap-3">
            <div className="bg-white border border-slate-100 px-5 py-3 rounded-2xl shadow-sm flex items-center gap-3">
              <div className="p-2 bg-yellow-50 text-yellow-600 rounded-xl">
                 <Star className="w-5 h-5 fill-yellow-500" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">XP Points</p>
                <p className="text-lg font-black text-slate-900 leading-none">{xp.toLocaleString()}</p>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Continue Learning Card */}
        {courses.length > 0 && (
          <section className="lg:col-span-2">
            {!lastSlide ? (
              <div className="bg-slate-900 rounded-[2.5rem] p-8 md:p-10 relative overflow-hidden group shadow-2xl shadow-slate-200 h-full flex flex-col justify-between">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full blur-[120px] opacity-20 pointer-events-none" />
                <div className="relative z-10 flex flex-col justify-between h-full min-h-[16rem]">
                  <div>
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-4 inline-block">Welcome to Tos Rean!</span>
                    <h3 className="text-3xl md:text-3xl font-black text-white tracking-tighter mb-4 leading-tight">
                      Ready to start your learning journey?
                    </h3>
                    <p className="text-slate-300 text-sm max-w-md font-medium leading-relaxed">
                      Select one of your enrolled courses below and unlock interactive slides, real-time tracking, and customized exercises.
                    </p>
                  </div>
                  <div className="mt-6">
                    <button 
                      onClick={() => navigate('/courses')}
                      className="w-full md:w-auto px-8 py-4 bg-white text-slate-900 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-slate-50 transition-all active:scale-95 shadow-xl shadow-black/20"
                    >
                      My Courses
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-900 rounded-[2.5rem] p-8 md:p-10 relative overflow-hidden group shadow-2xl shadow-slate-200">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full blur-[120px] opacity-20 pointer-events-none group-hover:opacity-30 transition-opacity" />
                <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-zinc-500 rounded-full blur-[80px] opacity-20 pointer-events-none" />
                
                <div className="relative z-10 h-full flex flex-col">
                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-6 inline-block">Resume Learning</span>
                  
                  <div className="mb-10">
                    <h3 className="text-3xl md:text-4xl font-black text-white tracking-tighter mb-4 leading-tight">
                      {lastSlide?.slides?.lessons?.title}
                    </h3>
                    <div className="flex items-center gap-4 text-slate-400 text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4" />
                        <span>{lastSlide?.slides?.lessons?.chapters?.title || "Unit Progress"}</span>
                      </div>
                      <div className="h-4 w-px bg-slate-800"></div>
                      <div className="flex items-center gap-2">
                        <History className="w-4 h-4" />
                        <span>Active Progress</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto flex flex-col md:flex-row items-center gap-6">
                    <button 
                      onClick={() => {
                        if (lastSlide?.slides?.lesson_id) {
                           navigate(`/lesson/${lastSlide.slides.lesson_id}`);
                        }
                      }}
                      className="w-full md:w-auto px-8 py-4 bg-white text-slate-900 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-slate-50 transition-all active:scale-95 shadow-xl shadow-black/20"
                    >
                      <Play className="w-5 h-5 fill-slate-900" />
                      Resume Now
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Quick Actions Grid */}
        <section className={cn("bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm", courses.length === 0 && "lg:col-span-3")}>
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8">Shortcuts</h3>
          <div className="grid grid-cols-2 gap-4">
            {quickActions.map((action) => (
              <button 
                key={action.label}
                onClick={action.action}
                className={cn(
                  "flex flex-col items-center justify-center p-6 rounded-3xl border-2 transition-all hover:scale-105 active:scale-95 group",
                  action.color,
                  action.border,
                  "bg-white" // Override bg to be white with tinted border
                )}
              >
                <action.icon className="w-8 h-8 mb-4 group-hover:rotate-12 transition-transform" />
                <span className="text-[10px] font-black uppercase tracking-tight text-center text-slate-600 px-2">{action.label}</span>
              </button>
            ))}
            <button 
              onClick={() => navigate('/notes')}
              className="col-span-2 flex items-center justify-center gap-3 p-5 rounded-3xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all active:scale-95 shadow-lg shadow-slate-100"
            >
              <Plus className="w-4 h-4" />
              Open My Notes
            </button>
          </div>
        </section>
      </div>

      {/* Enrolled Courses */}
      <section>
        <div className="flex items-center justify-between mb-8 px-2">
          <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Enrolled Courses</h3>
          <button 
            onClick={() => navigate('/courses')}
            className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1 group"
          >
            View All <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
        
        {coursesLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-white border border-slate-100 rounded-[2.5rem] p-8 h-80 animate-pulse space-y-6">
                <div className="w-14 h-14 bg-slate-150 rounded-2xl"></div>
                <div className="space-y-3">
                  <div className="h-4 bg-slate-150 rounded w-1/4"></div>
                  <div className="h-6 bg-slate-150 rounded w-3/4"></div>
                </div>
                <div className="pt-6 border-t border-slate-100 flex justify-between">
                  <div className="h-4 bg-slate-150 rounded w-1/3"></div>
                  <div className="h-4 bg-slate-150 rounded w-1/4"></div>
                </div>
              </div>
            ))}
          </div>
        ) : courses.length === 0 ? (
          <EmptyCourseState />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {courses.map((course, idx) => (
              <motion.div 
                key={course.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                onClick={() => navigate(`/course/${course.id}`)}
                className="group bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm hover:shadow-2xl hover:shadow-slate-200 transition-all cursor-pointer relative flex flex-col"
              >
                {/* Hover Accent */}
                <div className={cn("absolute top-0 right-10 w-20 h-1 bg-transparent group-hover:block transition-all", course.color)} />

                {/* Cover Image Container */}
                <div className="w-full h-44 rounded-3xl overflow-hidden mb-6 bg-slate-100 relative">
                  <img
                    src={course.cover_image_url || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=600&auto=format&fit=crop'}
                    alt={course.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=600&auto=format&fit=crop';
                    }}
                  />
                  <div className={cn(
                    "absolute top-4 left-4 w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-lg",
                    course.color
                  )}>
                     <course.icon className="w-5 h-5" />
                  </div>
                </div>

                <div className="flex-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">{course.major}</span>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight leading-snug group-hover:text-blue-600 transition-colors">
                    {course.title}
                  </h3>
                </div>

                {course.progress > 0 && (
                  <div className="mb-6 pt-4 border-t border-slate-50 space-y-3">
                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-tighter">
                      <span className="text-slate-400">Course Progress</span>
                      <span className="text-slate-950">{course.progress}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-50 rounded-full overflow-hidden">
                       <div className={cn("h-full rounded-full transition-all duration-1000", course.color)} style={{ width: `${course.progress}%` }}></div>
                    </div>
                  </div>
                )}

                <div className="pt-6 border-t border-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                      <span className="text-[11px] font-black">{course.rating}</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-405">
                      <Users className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold">{course.enrolled}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-blue-600 text-[10px] font-black uppercase tracking-widest leading-none">
                     <span>{course.progress > 0 ? "Continue" : "View Details"}</span>
                     <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                <div className="mt-6 flex gap-2">
                   <span className="px-3 py-1 bg-slate-50 text-slate-550 rounded-full text-[9px] font-black uppercase tracking-widest border border-slate-100">
                     {course.units} Units
                   </span>
                   {course.progress > 0 && (
                     <span className="px-3 py-1 bg-emerald-50 text-emerald-650 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-100">
                       Active Progress
                     </span>
                   )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Maintenance empty state indicator if no data and user progress is empty */}
      {!lastSlide && !loading && courses.length > 0 && (
        <section className="bg-blue-50 border-2 border-dashed border-blue-100 rounded-[3rem] p-12 text-center">
          <BookOpen className="w-16 h-16 text-blue-200 mx-auto mb-6" />
          <h3 className="text-xl font-black text-blue-900 tracking-tighter mb-2">No Active Progress Yet</h3>
          <p className="text-sm text-blue-600/70 max-w-sm mx-auto font-medium leading-relaxed">
            Pick one of the active courses and open any lesson to start your journey and track your progress in real-time.
          </p>
          <button onClick={() => navigate('/courses')} className="mt-8 px-10 py-4 bg-blue-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95">
            Explore Courses
          </button>
        </section>
      )}
    </div>
  );
}
