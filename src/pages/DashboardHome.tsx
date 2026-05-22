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
  History
} from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';

export default function DashboardHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [lastSlide, setLastSlide] = useState<any>(null);

  useEffect(() => {
    fetchUserData();
  }, [user]);

  const fetchUserData = async () => {
    if (!user) return;
    setLoading(true);
    
    // Fetch last progress
    const { data } = await supabase
      .from('user_progress')
      .select('slide_id, slides(lesson_id, lessons(title, chapters(title)))')
      .eq('user_id', user.id)
      .order('completed_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (data) setLastSlide(data);
    setLoading(false);
  };

  const quickActions = [
    { label: 'Browse Majors', icon: Library, color: 'bg-blue-50 text-blue-600', border: 'border-blue-100' },
    { label: 'Recent Notes', icon: StickyNote, color: 'bg-amber-50 text-amber-600', border: 'border-amber-100' },
    { label: 'Review Recall', icon: Clock, color: 'bg-orange-50 text-orange-600', border: 'border-orange-100' },
    { label: 'Top Students', icon: Trophy, color: 'bg-emerald-50 text-emerald-600', border: 'border-emerald-100' },
  ];

  const dummyCourses = [
    { id: 'econ-101', title: 'Microeconomics & Macroeconomics', progress: 24, major: 'Digital Economy', color: 'bg-blue-500' },
    { id: 'fin-102', title: 'Fundamentals of Finance & Financial Risk', progress: 45, major: 'Digital Economy', color: 'bg-indigo-500' },
    { id: 'data-103', title: 'Data Management & Information Systems', progress: 12, major: 'Digital Economy', color: 'bg-rose-500' },
    { id: 'res-104', title: 'Research Methodology', progress: 0, major: 'Digital Economy', color: 'bg-emerald-500' },
  ];

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Welcome Section */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter mb-2">
            សួស្តី, {user?.email?.split('@')[0]}!
          </h2>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
            Your learning streak: <span className="text-slate-900">12 Days</span>
          </p>
        </div>
        <div className="flex gap-3">
          <div className="bg-white border border-slate-100 px-5 py-3 rounded-2xl shadow-sm flex items-center gap-3">
            <div className="p-2 bg-yellow-50 text-yellow-600 rounded-xl">
               <Star className="w-5 h-5 fill-yellow-500" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">XP Points</p>
              <p className="text-lg font-black text-slate-900 leading-none">2,450</p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Continue Learning Card */}
        <section className="lg:col-span-2">
          <div className="bg-slate-900 rounded-[2.5rem] p-8 md:p-10 relative overflow-hidden group shadow-2xl shadow-slate-200">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full blur-[120px] opacity-20 pointer-events-none group-hover:opacity-30 transition-opacity" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-indigo-500 rounded-full blur-[80px] opacity-20 pointer-events-none" />
            
            <div className="relative z-10 h-full flex flex-col">
              <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mb-6 inline-block">Resume Learning</span>
              
              <div className="mb-10">
                <h3 className="text-3xl md:text-4xl font-black text-white tracking-tighter mb-4 leading-tight">
                  {lastSlide?.slides?.lessons?.title || "Data Management & Information Systems"}
                </h3>
                <div className="flex items-center gap-4 text-slate-400 text-sm font-medium">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    <span>{lastSlide?.slides?.lessons?.chapters?.title || "Unit 01: Relational Databases"}</span>
                  </div>
                  <div className="h-4 w-px bg-slate-800"></div>
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4" />
                    <span>Slide 04/12</span>
                  </div>
                </div>
              </div>

              <div className="mt-auto flex flex-col md:flex-row items-center gap-6">
                <button 
                  onClick={() => {
                    if (lastSlide?.slides?.lesson_id) {
                       navigate(`/lesson/${lastSlide.slides.lesson_id}`);
                    } else {
                       navigate(`/course/data-103`);
                    }
                  }}
                  className="w-full md:w-auto px-8 py-4 bg-white text-slate-900 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-blue-50 transition-all active:scale-95 shadow-xl shadow-black/20"
                >
                  <Play className="w-5 h-5 fill-slate-900" />
                  Resume Now
                </button>
                <div className="w-full md:w-64">
                   <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                     <span>Course Progress</span>
                     <span className="text-white">24%</span>
                   </div>
                   <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                     <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: '24%' }}
                        className="h-full bg-blue-500 rounded-full"
                     />
                   </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Actions Grid */}
        <section className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8">Shortcuts</h3>
          <div className="grid grid-cols-2 gap-4">
            {quickActions.map((action) => (
              <button 
                key={action.label}
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
              className="col-span-2 flex items-center justify-center gap-3 p-5 rounded-3xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all active:scale-95 shadow-lg shadow-slate-100"
            >
              <Plus className="w-4 h-4" />
              Custom Note Folder
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
            className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1 group"
          >
            View All <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {dummyCourses.map((course, idx) => (
            <motion.div 
              key={course.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              onClick={() => navigate(`/course/${course.id}`)}
              className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:shadow-slate-200 transition-all group cursor-pointer"
            >
              <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-6 text-white shadow-lg", course.color)}>
                 <Library className="w-6 h-6" />
              </div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">{course.major}</span>
              <h4 className="text-xl font-black text-slate-900 tracking-tighter mb-6 leading-tight group-hover:text-blue-600 transition-colors">
                {course.title}
              </h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-tighter">
                  <span className="text-slate-400">Chapters</span>
                  <span className="text-slate-900">08/12</span>
                </div>
                <div className="flex items-center gap-3">
                   <div className="flex-1 h-1.5 bg-slate-50 rounded-full overflow-hidden">
                     <div className={cn("h-full rounded-full transition-all duration-1000", course.color)} style={{ width: `${course.progress}%` }}></div>
                   </div>
                   <span className="text-[10px] font-black text-slate-900 w-8">{course.progress}%</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Maintenance empty state indicator if no data */}
      {!lastSlide && !loading && (
        <section className="bg-blue-50 border-2 border-dashed border-blue-100 rounded-[3rem] p-12 text-center">
          <BookOpen className="w-16 h-16 text-blue-200 mx-auto mb-6" />
          <h3 className="text-xl font-black text-blue-900 tracking-tighter mb-2">No Active Courses Yet</h3>
          <p className="text-sm text-blue-600/70 max-w-sm mx-auto font-medium leading-relaxed">
            Enroll in a major to start your learning ladder and track your progress in real-time.
          </p>
          <button className="mt-8 px-10 py-4 bg-blue-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95">
            Explore Courses
          </button>
        </section>
      )}
    </div>
  );
}
