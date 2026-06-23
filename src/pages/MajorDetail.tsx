import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  BookOpen, 
  CheckCircle, 
  Clock, 
  Compass, 
  Layers, 
  Loader2, 
  Star, 
  TrendingUp, 
  Trash2, 
  Users,
  AlertTriangle,
  Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';

interface Major {
  id: string;
  title: string;
  description: string;
  cover_image_url: string;
  created_at?: string;
}

interface CourseItem {
  id: string;
  title: string;
  description: string;
  cover_image_url: string;
}

export default function MajorDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Primary states
  const [major, setMajor] = useState<Major | null>(null);
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [averageRating, setAverageRating] = useState<number>(0);
  const [reviewCount, setReviewCount] = useState<number>(0);
  const [userRating, setUserRating] = useState<number | null>(null);
  
  // Interactive UI States
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [showDropModal, setShowDropModal] = useState(false);

  useEffect(() => {
    if (id && user) {
      loadMajorDetailAndEnrollment();
    }
  }, [id, user]);

  const loadMajorDetailAndEnrollment = async () => {
    setLoading(true);
    try {
      // 1. Fetch Major Data
      const { data: majorData, error: majorErr } = await supabase
        .from('majors')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (majorErr) throw majorErr;
      if (!majorData) {
        setLoading(false);
        return;
      }
      setMajor(majorData);

      // 2. Fetch Courses belonging to this Major
      const { data: coursesData } = await supabase
        .from('courses')
        .select('id, title, description, cover_image_url')
        .eq('major_id', id);

      if (coursesData) {
        setCourses(coursesData);
      }

      // 3. Fetch User's Enrollment in this Major
      const { data: enrollData } = await supabase
        .from('user_majors')
        .select('id')
        .eq('user_id', user?.id)
        .eq('major_id', id)
        .maybeSingle();

      setIsEnrolled(!!enrollData);

      // 4. Fetch User's personal rating for this Major
      const { data: ratingData } = await supabase
        .from('major_ratings')
        .select('rating')
        .eq('user_id', user?.id)
        .eq('major_id', id)
        .maybeSingle();

      if (ratingData) {
        setUserRating(ratingData.rating);
      }

      // 5. Fetch Global Stats for this Major
      await fetchGlobalStats();

    } catch (err) {
      console.error('Failed to load major details:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchGlobalStats = async () => {
    try {
      // Try calling the customized RPC function if deployed
      const { data: rpcStats, error: rpcError } = await supabase
        .rpc('get_major_stats', { target_major_id: id });

      if (!rpcError && rpcStats && rpcStats.length > 0) {
        setAverageRating(Number(rpcStats[0].average_rating) || 0);
        setReviewCount(Number(rpcStats[0].total_reviews) || 0);
      } else {
        // Fallback: Query major_ratings directly to calculate client side
        const { data: ratingQuery, error: qError } = await supabase
          .from('major_ratings')
          .select('rating')
          .eq('major_id', id);

        if (!qError && ratingQuery) {
          const count = ratingQuery.length;
          const sum = ratingQuery.reduce((sum, r) => sum + r.rating, 0);
          setAverageRating(count > 0 ? Number((sum / count).toFixed(1)) : 0);
          setReviewCount(count);
        }
      }
    } catch (e) {
      console.warn('Stats aggregation fallback activated:', e);
    }
  };

  // 1. Enrollment Handlers
  const handleEnroll = async () => {
    if (!user || !id) return;
    setIsEnrolling(true);
    try {
      const { error } = await supabase
        .from('user_majors')
        .insert({
          user_id: user.id,
          major_id: id
        });

      if (!error) {
        setIsEnrolled(true);
        // Auto-enroll the user into courses under this major for cohesive student journey
        if (courses.length > 0) {
          try {
            const courseInserts = courses.map(c => ({
              user_id: user.id,
              course_id: c.id
            }));
            await supabase.from('user_courses').insert(courseInserts);
          } catch (e) {
            console.warn('Auto enrollment into courses failed silently:', e);
          }
        }
      } else {
        console.error('Database enrollment error:', error);
      }
    } catch (err) {
      console.error('Enrollment transaction exception:', err);
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleDrop = async () => {
    if (!user || !id) return;
    setIsEnrolling(true);
    try {
      const { error } = await supabase
        .from('user_majors')
        .delete()
        .eq('user_id', user.id)
        .eq('major_id', id);

      if (!error) {
        setIsEnrolled(false);
        setUserRating(null); // Clear rating
        setShowDropModal(false);
        // Optionally drop courses corresponding to this major
        if (courses.length > 0) {
          const courseIds = courses.map(c => c.id);
          await supabase
            .from('user_courses')
            .delete()
            .eq('user_id', user.id)
            .in('course_id', courseIds);
        }
        await fetchGlobalStats();
      } else {
        console.error('Failed to desert major:', error);
      }
    } catch (err) {
      console.error('Desert transaction exception:', err);
    } finally {
      setIsEnrolling(false);
    }
  };

  // 2. Click Rating Stars
  const submitRating = async (ratingVal: number) => {
    if (!user || !id || !isEnrolled) return;
    setIsSubmittingRating(true);
    try {
      const { error } = await supabase
        .from('major_ratings')
        .upsert(
          {
            user_id: user.id,
            major_id: id,
            rating: ratingVal,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'user_id,major_id' }
        );

      if (!error) {
        setUserRating(ratingVal);
        await fetchGlobalStats();
      } else {
        console.error('Rating upsert failed:', error);
      }
    } catch (err) {
      console.error('Rating submission failed:', err);
    } finally {
      setIsSubmittingRating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4 animate-in fade-in duration-300">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">Loading learning pathway...</p>
      </div>
    );
  }

  if (!major) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto">
        <div className="w-16 h-16 bg-rose-50 border border-rose-100 rounded-2xl flex items-center justify-center mb-6 text-rose-500">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-black text-slate-900 tracking-tight">Pathway Not Found</h3>
        <p className="text-xs text-slate-400 mt-2 font-medium">The digital curriculum you are trying to visit might be deleted, unreleased, or moved.</p>
        <button 
          onClick={() => navigate('/explore')} 
          className="mt-6 px-6 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-850"
        >
          Return to Library
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-32 animate-in fade-in duration-500 relative">
      
      {/* Return Button */}
      <button 
        onClick={() => navigate('/explore')}
        className="inline-flex items-center gap-2 px-4 py-2 border-2 border-slate-100 hover:border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 rounded-xl text-xs font-bold transition-all shadow-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Explore
      </button>

      {/* Hero Banner Area */}
      <section className="relative rounded-[2.5rem] overflow-hidden shadow-2xl min-h-[360px] flex items-end p-8 md:p-14 bg-slate-900">
        {/* Background Image Banner */}
        <div className="absolute inset-0 z-0">
          <img 
            src={major.cover_image_url || 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1200&auto=format&fit=crop'} 
            alt={major.title}
            className="w-full h-full object-cover opacity-35"
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1200&auto=format&fit=crop';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent" />
        </div>

        {/* Content Details */}
        <div className="relative z-10 w-full grid grid-cols-1 lg:grid-cols-3 items-end gap-8">
          <div className="lg:col-span-2 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/20 border border-blue-400/30 text-blue-300 rounded-full text-[10px] font-black uppercase tracking-widest leading-none">
              <Award className="w-3.5 h-3.5" />
              Specialization Pathway
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tighter leading-none">
              {major.title}
            </h1>
            <p className="text-slate-300 text-sm md:text-base font-medium leading-relaxed max-w-2xl">
              {major.description || 'Embark on a professional, step-by-step curriculum to develop industry-relevant competency, build certificates, and master core strategies.'}
            </p>

            {/* Micro Stats inside Hero */}
            <div className="flex flex-wrap items-center gap-6 pt-4 text-slate-400 select-none">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-bold">{courses.length * 14 + 112} Global Students</span>
              </div>
              <div className="h-4 w-px bg-slate-805 hidden sm:block"></div>
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-bold">{courses.length} Standard Syllabus Modules</span>
              </div>
            </div>
          </div>

          {/* Action and Rating side block */}
          <div className="bg-white/10 backdrop-blur-md border border-white/10 p-6 rounded-3xl space-y-6 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Pathway Syllabus Status</div>
              <div className="text-2xl font-black text-white">
                {isEnrolled ? (
                  <span className="text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle className="w-6 h-6 shrink-0 text-emerald-400" />
                    Enrolled Active
                  </span>
                ) : (
                  <span className="text-slate-300">Not Enrolled Yet</span>
                )}
              </div>
            </div>

            {/* Dynamic Button Toggle */}
            {isEnrolled ? (
              <div className="space-y-2">
                <div className="w-full py-4 rounded-2xl bg-white text-slate-900 border border-white text-center font-black text-xs uppercase tracking-widest shadow-xl select-none">
                  Active Member
                </div>
                <button
                  onClick={() => setShowDropModal(true)}
                  className="w-full py-2.5 bg-slate-950/40 hover:bg-red-950/20 hover:text-red-400 hover:border-red-500/30 text-slate-400 rounded-xl border border-white/5 font-black text-[9px] uppercase tracking-widest transition-all"
                >
                  Withdraw from Pathway
                </button>
              </div>
            ) : (
              <button
                id="major-enrollment-btn"
                disabled={isEnrolling}
                onClick={handleEnroll}
                className="w-full py-5 px-8 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-[0.15em] rounded-2xl transition-all shadow-xl shadow-blue-900/30 flex items-center justify-center gap-2 active:scale-95 disabled:bg-blue-800"
              >
                {isEnrolling ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Compass className="w-4 h-4 animate-pulse" />
                    Enroll in Major Pathway
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Main Core Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        
        {/* Course Modules Curriculum Column */}
        <section className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-500" />
              Pathway Syllabus & Modules
            </h2>
            <span className="px-3 py-1 bg-slate-100 border border-slate-200/60 rounded-full text-[9px] font-black uppercase text-slate-500 tracking-wider">
              {courses.length} Program Courses
            </span>
          </div>

          <div className="space-y-4">
            {courses.length === 0 ? (
              <div className="bg-white border border-slate-100 p-12 rounded-[2rem] text-center max-w-md mx-auto">
                <BookOpen className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                <h4 className="font-bold text-slate-700">No Courses Added Yet</h4>
                <p className="text-xs text-slate-400 mt-1">Our administrative staff is populating syllabus components. Check back soon!</p>
              </div>
            ) : (
              courses.map((course, idx) => (
                <div 
                  key={course.id}
                  onClick={() => navigate(`/course/${course.id}`)}
                  className="group bg-white border border-slate-100 hover:border-slate-200 p-5 rounded-[2rem] shadow-sm hover:shadow-[0_16px_32px_rgba(15,23,42,0.03)] transition-all cursor-pointer flex flex-col sm:flex-row items-center gap-5"
                >
                  <div className="w-full sm:w-28 h-20 rounded-2xl overflow-hidden bg-slate-100 shrink-0 border border-slate-50">
                    <img 
                      src={course.cover_image_url || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=600&auto=format&fit=crop'} 
                      alt={course.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="flex-1 text-center sm:text-left space-y-1">
                    <span className="text-[9px] font-black uppercase text-blue-600 tracking-widest">Module 0{idx + 1}</span>
                    <h3 className="font-black text-slate-900 tracking-tight leading-snug group-hover:text-blue-650 transition-colors">
                      {course.title}
                    </h3>
                    <p className="text-xs text-slate-400 font-medium line-clamp-1 leading-relaxed">
                      {course.description || 'Gain core competency and professional skills.'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 bg-slate-50 border border-slate-100 px-4 py-2 rounded-xl group-hover:bg-slate-900 group-hover:text-white transition-all duration-300 shrink-0 text-slate-600 font-black text-[9px] uppercase tracking-widest">
                    Study Area
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Dynamic Interactive Feedback Rating Column */}
        <section className="space-y-6">
          <div className="bg-white border border-slate-100 p-8 rounded-[2.5rem] shadow-sm space-y-8">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Global Pathway Feedback</h3>

            {/* Average rating count detail */}
            <div className="flex items-center gap-4">
              <div className="text-5xl font-black text-slate-900 tracking-tighter">
                {averageRating > 0 ? averageRating.toFixed(1) : 'N/A'}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((starIdx) => {
                    const diff = averageRating - starIdx;
                    return (
                      <Star 
                        key={starIdx}
                        className={cn(
                          "w-4 h-4",
                          diff >= 0 
                            ? "text-amber-400 fill-amber-400"
                            : diff >= -0.5 
                              ? "text-amber-400 fill-amber-400 opacity-60" 
                              : "text-slate-205 text-slate-200"
                        )}
                      />
                    );
                  })}
                </div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {reviewCount} verified reviews
                </div>
              </div>
            </div>

            <div className="h-px bg-slate-100" />

            {/* User Interaction Module */}
            <div className="space-y-4">
              <div className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-amber-500" />
                Your Pathways Rating
              </div>

              {!isEnrolled ? (
                <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl text-center space-y-3">
                  <Star className="w-8 h-8 text-slate-300 mx-auto animate-pulse" />
                  <p className="text-[11px] text-slate-500 font-bold leading-relaxed max-w-[200px] mx-auto">
                    Please enroll in this major to interactively vote and rate this curriculum pathway.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                    Click the stars below to specify your rating value. Leave honest feedback to refine our upcoming modules.
                  </p>

                  {/* Rating Stars Loop */}
                  <div className="flex items-center justify-center gap-1.5 py-4 bg-slate-50 border border-slate-100 rounded-2xl relative">
                    {isSubmittingRating && (
                      <div className="absolute inset-0 bg-white/70 backdrop-blur-xs flex items-center justify-center rounded-2xl z-10">
                        <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                      </div>
                    )}
                    
                    {[1, 2, 3, 4, 5].map((starValue) => {
                      const isLit = hoveredStar !== null
                        ? starValue <= hoveredStar
                        : starValue <= (userRating || 0);

                      return (
                        <button
                          key={starValue}
                          type="button"
                          onMouseEnter={() => setHoveredStar(starValue)}
                          onMouseLeave={() => setHoveredStar(null)}
                          onClick={() => submitRating(starValue)}
                          className="p-1 focus:outline-none focus:scale-110 active:scale-95 transition-all text-slate-300 hover:text-amber-400"
                        >
                          <Star 
                            className={cn(
                              "w-8 h-8 transition-all duration-150",
                              isLit 
                                ? "text-amber-400 fill-amber-400 scale-105 filter drop-shadow-[0_2px_4px_rgba(245,158,11,0.15)]"
                                : "text-slate-300 hover:scale-105"
                            )}
                          />
                        </button>
                      );
                    })}
                  </div>

                  {userRating && (
                    <div className="flex items-center justify-between text-[10px] font-black uppercase text-emerald-600 tracking-wider bg-emerald-50/50 border border-emerald-100/60 p-3 rounded-xl">
                      <span>Status: Rating submitted!</span>
                      <span>{userRating} / 5 Stars</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="text-[10px] uppercase font-black text-slate-400 tracking-wider">LMS Certifications</div>
              <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                Completing all modules and passing final slide interactive questionnaires awards the official digital specialization badge on your Student Profile.
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* Confirmation Modal to drop major */}
      <AnimatePresence>
        {showDropModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white border border-slate-100 rounded-[2rem] max-w-md w-full p-8 shadow-2xl relative space-y-6"
            >
              <div className="w-12 h-12 bg-red-50 border border-red-100 rounded-xl flex items-center justify-center text-red-500">
                <Trash2 className="w-6 h-6" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-black text-slate-900 tracking-tight leading-snug">
                  Withdraw from Pathway?
                </h3>
                <p className="text-xs text-slate-400 font-medium leading-relaxed">
                  Are you sure you want to drop out of <span className="font-extrabold text-slate-750">{major.title}</span>? Dropping this major will cancel your path progress metrics and uninstall nested modules from your active Course desk.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowDropModal(false)}
                  className="flex-1 py-3 border border-slate-100 hover:border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  Keep Studies Active
                </button>
                <button
                  type="button"
                  onClick={handleDrop}
                  className="flex-1 py-3 bg-red-655 bg-indigo-600 hover:bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:shadow-lg transition-all"
                >
                  Yes, Withdraw
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
