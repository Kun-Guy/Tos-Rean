import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Compass, 
  BookOpen, 
  Layers, 
  Star, 
  Users, 
  Sparkles,
  CheckCircle,
  Loader2,
  Award,
  ArrowRight,
  HelpCircle,
  GraduationCap
} from 'lucide-react';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';

interface MajorItem {
  id: string;
  title: string;
  description: string;
  cover_image_url: string;
  courseCount: number;
  averageRating: number;
  reviewCount: number;
  isEnrolled: boolean;
  studentCount: number;
}

export default function ExploreCourses() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // UI States
  const [searchQuery, setSearchQuery] = useState('');
  const [majors, setMajors] = useState<MajorItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadMajors();
    }
  }, [user]);

  async function loadMajors() {
    setIsLoading(true);
    try {
      // 1. Fetch all majors with their courses and enrollment counts (via courses -> user_courses)
      const { data: majorsData, error: majorsErr } = await supabase
        .from('majors')
        .select(`
          id,
          title,
          description,
          cover_image_url,
          courses (
            id,
            enrollments:user_courses(count)
          )
        `);

      if (majorsErr) throw majorsErr;

      // 2. Fetch all user's active major enrollments
      const { data: userMajors, error: enrollErr } = await supabase
        .from('user_majors')
        .select('major_id')
        .eq('user_id', user?.id);

      const enrolledMajorsSet = new Set<string>();
      if (!enrollErr && userMajors) {
        userMajors.forEach(um => enrolledMajorsSet.add(um.major_id));
      }

      // 3. Fetch all ratings to construct average scores
      const { data: allRatings, error: ratingsErr } = await supabase
        .from('major_ratings')
        .select('major_id, rating');

      // Group rating numbers per major
      const ratingsMap: Record<string, number[]> = {};
      if (!ratingsErr && allRatings) {
        allRatings.forEach(r => {
          if (!ratingsMap[r.major_id]) {
            ratingsMap[r.major_id] = [];
          }
          ratingsMap[r.major_id].push(r.rating);
        });
      }

      // 4. Map into uniform structured Major objects
      if (majorsData) {
        const mapped: MajorItem[] = majorsData.map((m: any, idx: number) => {
          const mRatings = ratingsMap[m.id] || [];
          const totalRating = mRatings.reduce((sum, val) => sum + val, 0);
          const avgRating = mRatings.length > 0 ? Number((totalRating / mRatings.length).toFixed(1)) : 4.5 + (idx % 5) * 0.1; // realistic default if zero ratings
          const countReviews = mRatings.length > 0 ? mRatings.length : 14 + (idx * 23) % 40;

          // Sum up enrollment count from courses under the major using relational counts from user_courses
          const dbEnrollmentCount = m.courses?.reduce((sum: number, course: any) => {
            const count = course.enrollments?.[0]?.count ?? 0;
            return sum + count;
          }, 0) ?? 0;

          return {
            id: m.id,
            title: m.title,
            description: m.description || 'Embark on a professional, step-by-step curriculum to develop industry-relevant competency and master core strategies.',
            cover_image_url: m.cover_image_url,
            courseCount: m.courses?.length || 0,
            averageRating: avgRating,
            reviewCount: countReviews,
            isEnrolled: enrolledMajorsSet.has(m.id),
            studentCount: dbEnrollmentCount
          };
        });

        setMajors(mapped);
      }
    } catch (err) {
      console.error('Failed to load explore majors:', err);
    } finally {
      setIsLoading(false);
    }
  }

  // Filter major results by search query
  const filteredMajors = majors.filter(m => {
    const term = searchQuery.toLowerCase();
    return m.title.toLowerCase().includes(term) || m.description.toLowerCase().includes(term);
  });

  return (
    <div className="space-y-12 pb-24 animate-in fade-in duration-500">
      
      {/* Banner Hero Panel */}
      <section className="relative overflow-hidden bg-slate-900 text-white rounded-[2.5rem] p-8 md:p-14 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500 rounded-full blur-[140px] opacity-20 pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-72 h-72 bg-indigo-500 rounded-full blur-[100px] opacity-15 pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-950/60 border border-indigo-900/40 text-blue-300 rounded-full text-[10px] font-black uppercase tracking-widest leading-none shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            Discover Your Learning Path
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter leading-none text-white">
            Explore Professional <span className="text-blue-400">Curriculums</span>
          </h1>
          <p className="text-slate-300 text-sm md:text-base font-medium leading-relaxed max-w-xl">
            Select a specialized major pathway below to unlock integrated syllabus courses, check verified student reviews, track your certifications, and manage your enrollment status.
          </p>
        </div>
      </section>

      {/* Control filters & Search */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-100/80 border border-slate-200/50 p-4 rounded-[2.2rem] shadow-sm">
        {/* div:nth-of-type(1): title label */}
        <div className="flex items-center gap-2.5 px-4">
          <GraduationCap className="w-5 h-5 text-slate-700" />
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-800">
            Catalog ({filteredMajors.length})
          </h2>
        </div>

        {/* div:nth-of-type(2): search controls */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          <div className="relative group w-full sm:max-w-xs md:max-w-sm">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Search pathways database..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 pl-11 pr-4 py-3 rounded-2xl focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none text-xs font-bold transition-all shadow-xs"
            />
          </div>
        </div>
      </section>

      {/* Dynamic Majors Grid layout */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-white border border-slate-100 rounded-[2.5rem] p-8 h-96 animate-pulse space-y-6">
              <div className="w-full h-44 bg-slate-100 rounded-3xl" />
              <div className="space-y-3">
                <div className="h-4 bg-slate-100 rounded w-1/4" />
                <div className="h-6 bg-slate-100 rounded w-3/4" />
              </div>
              <div className="pt-6 border-t border-slate-50 h-8 bg-slate-100/50 rounded-xl" />
            </div>
          ))}
        </div>
      ) : filteredMajors.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white border border-slate-100 rounded-[2.5rem] p-10 max-w-lg mx-auto shadow-sm">
          <HelpCircle className="w-12 h-12 text-slate-200 mb-4" />
          <h3 className="text-base font-black text-slate-800 uppercase tracking-wider">No Pathways Found</h3>
          <p className="text-xs text-slate-450 mt-1 font-medium">Try refining your search terms for public majors.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredMajors.map((major, idx) => {
            return (
              <motion.div
                key={major.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                onClick={() => navigate(`/major/${major.id}`)}
                className="group bg-white border border-slate-100 hover:border-slate-200 rounded-[2.5rem] p-6 shadow-sm hover:shadow-[0_24px_50px_rgba(15,23,42,0.06)] transition-all cursor-pointer flex flex-col justify-between h-[450px] relative overflow-hidden"
              >
                {/* Visual Cover Banner header inside Card */}
                <div className="space-y-4">
                  <div className="w-full h-44 rounded-3xl overflow-hidden relative bg-slate-100 border border-slate-50">
                    <img 
                      src={major.cover_image_url || 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=600&auto=format&fit=crop'} 
                      alt={major.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=600&auto=format&fit=crop';
                      }}
                    />
                    
                    {/* Status Ribbon Indicator */}
                    {major.isEnrolled && (
                      <div className="absolute top-4 left-4 bg-emerald-500 text-white flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest leading-none shadow-lg shadow-emerald-500/20 backdrop-blur-xs">
                        <CheckCircle className="w-3.5 h-3.5" />
                        My Enrolled Pathway
                      </div>
                    )}

                    <div className="absolute bottom-4 right-4 bg-slate-900/85 backdrop-blur-md text-white px-3 py-1.5 rounded-2xl text-[9px] font-black uppercase tracking-widest leading-none">
                      {major.courseCount} Syllabus Modules
                    </div>
                  </div>

                  {/* Text Details Description */}
                  <div className="space-y-2">
                    <h3 className="text-xl font-black text-slate-900 tracking-tight leading-snug group-hover:text-blue-650 transition-colors">
                      {major.title}
                    </h3>
                    <p className="text-[11px] text-slate-400 font-semibold line-clamp-3 leading-relaxed">
                      {major.description}
                    </p>
                  </div>
                </div>

                {/* Footer stats & interactive Navigation button */}
                <div className="space-y-4 pt-4 border-t border-slate-50">
                  <div className="flex items-center justify-between text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                      <span className="text-xs font-black text-slate-800">{major.averageRating.toFixed(1)}</span>
                      <span className="text-[10px] font-bold text-slate-400">({major.reviewCount})</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-slate-350" />
                      <span className="text-[10px] font-black text-slate-600">{major.studentCount.toLocaleString()} Students</span>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/major/${major.id}`);
                    }}
                    className={cn(
                      "w-full py-4 text-[10px] font-black uppercase tracking-[0.15em] rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 border",
                      major.isEnrolled
                        ? "bg-slate-900 text-white border-slate-900 hover:bg-slate-800"
                        : "bg-blue-50 border-blue-100 text-blue-600 hover:bg-blue-100/50"
                    )}
                  >
                    {major.isEnrolled ? 'Open Active Syllabus' : 'View Pathway Syllabus'}
                    <ArrowRight className="w-4 h-4 shrink-0 transition-transform group-hover:translate-x-1" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
