import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  Settings, 
  Bell, 
  Globe, 
  HelpCircle, 
  LogOut, 
  ChevronRight, 
  Flame, 
  Star, 
  Trophy,
  ShieldCheck,
  CreditCard,
  Camera
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import EditProfileModal from '../components/EditProfileModal';

export default function ProfilePage() {
  const { user, role, streak, signOut, fullName, avatarUrl } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [xp, setXp] = useState(0);
  const [coursesDone, setCoursesDone] = useState(0);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  useEffect(() => {
    if (!user) return;

    let isMounted = true;
    async function fetchStats() {
      try {
        // Fetch completed progress
        const { data: userProgressData } = await supabase
          .from('user_progress')
          .select('slide_id')
          .eq('user_id', user.id)
          .eq('is_completed', true);

        const completedSlideIds = new Set(userProgressData?.map(p => p.slide_id) || []);
        const totalXp = completedSlideIds.size * 100; // 100 XP per slide

        // Fetch enrolled courses and find out how many are 100% completed
        const { data: enrollmentData } = await supabase
          .from('user_courses')
          .select(`
            course_id,
            courses (
              id,
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

        let completedCoursesCount = 0;
        if (enrollmentData) {
          enrollmentData.forEach((item: any) => {
            const course = item.courses;
            if (!course) return;

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

            if (totalSlides > 0 && completedInCourse === totalSlides) {
              completedCoursesCount++;
            }
          });
        }

        if (isMounted) {
          setXp(totalXp);
          setCoursesDone(completedCoursesCount);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error fetching stats for profile:', err);
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchStats();
    return () => {
      isMounted = false;
    };
  }, [user]);

  const stats = [
    { 
      label: 'Current Streak', 
      value: loading ? '...' : `${streak} ${streak === 1 ? 'Day' : 'Days'}`, 
      icon: Flame, 
      color: 'text-orange-500', 
      bg: 'bg-orange-50' 
    },
    { 
      label: 'Total XP', 
      value: loading ? '...' : xp.toLocaleString(), 
      icon: Star, 
      color: 'text-yellow-600', 
      bg: 'bg-yellow-50' 
    },
    { 
      label: 'Courses Done', 
      value: loading ? '...' : `${coursesDone}`, 
      icon: Trophy, 
      color: 'text-emerald-600', 
      bg: 'bg-emerald-50' 
    },
  ];

  const menuItems = [
    { label: 'Edit Profile', icon: User, description: 'Change your name and avatar' },
    { label: 'Notifications & Reminders', icon: Bell, description: 'Manage spaced repetition alerts' },
    { label: 'Language Preference', icon: Globe, description: 'Switch between English / Khmer' },
    { label: 'Payment History', icon: CreditCard, description: 'View your course enrollments' },
    { label: 'Security & Privacy', icon: ShieldCheck, description: 'Password and account privacy' },
    { label: 'Help & Support', icon: HelpCircle, description: 'Contact our support team' },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* User Header */}
      <section className="bg-white border border-slate-100 rounded-[2.5rem] p-8 md:p-10 shadow-sm relative overflow-hidden text-center md:text-left flex flex-col md:flex-row items-center gap-8">
        <div 
          onClick={() => setIsEditProfileOpen(true)}
          className="relative group cursor-pointer transition-transform hover:scale-[1.02]"
          title="Edit Profile"
        >
          <div className="w-32 h-32 rounded-[2rem] bg-slate-905 border-4 border-white shadow-2xl flex items-center justify-center text-4xl font-black text-blue-500 overflow-hidden relative">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              (fullName || user?.email)?.[0].toUpperCase()
            )}
            {/* Overlay for camera icon on hover */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera className="w-8 h-8 text-white animate-in zoom-in duration-200" />
            </div>
          </div>
          <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 border-4 border-white rounded-full"></div>
        </div>

        <div className="flex-1 space-y-4">
          <div>
            <div className="flex items-center justify-center md:justify-start gap-3 mb-1">
              <h1 className="text-3xl font-black text-slate-900 tracking-tighter">
                {fullName || user?.email?.split('@')[0]}
              </h1>
              <span className="px-3 py-1 bg-blue-600 text-white rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg shadow-blue-200">
                {role || 'Student'}
              </span>
            </div>
            <p className="text-sm font-medium text-slate-400">{user?.email}</p>
          </div>
          
          <div className="flex flex-wrap justify-center md:justify-start gap-2">
            <span className="px-3 py-1 bg-slate-50 text-slate-500 rounded-full text-[9px] font-black uppercase tracking-widest border border-slate-100">
              Cambodia (KH)
            </span>
            <span className="px-3 py-1 bg-slate-50 text-slate-500 rounded-full text-[9px] font-black uppercase tracking-widest border border-slate-100">
              Joined May 2024
            </span>
          </div>
        </div>

        <button 
          onClick={() => setIsEditProfileOpen(true)}
          className="p-3 bg-slate-50 text-slate-400 rounded-2xl border border-slate-100 hover:text-slate-900 hover:bg-white transition-all shadow-sm"
          title="Edit Profile"
        >
           <Settings className="w-6 h-6" />
        </button>

        {/* Decorative mask */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
      </section>

      {/* Stats Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((stat, idx) => (
          <motion.div 
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow text-center"
          >
            <div className={cn("w-12 h-12 rounded-2xl mx-auto mb-4 flex items-center justify-center", stat.bg, stat.color)}>
              <stat.icon className="w-6 h-6" />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
            <p className="text-xl font-black text-slate-900 tracking-tight">{stat.value}</p>
          </motion.div>
        ))}
      </section>

      {/* Settings Menu */}
      <section className="bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-50 flex items-center justify-between">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Account Settings</h3>
            <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">New Update</span>
        </div>
        <div className="divide-y divide-slate-50">
          {menuItems.map((item, idx) => (
            <button 
              key={idx}
              onClick={item.label === 'Edit Profile' ? () => setIsEditProfileOpen(true) : undefined}
              className="w-full flex items-center justify-between p-6 hover:bg-slate-50 transition-all group text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-white group-hover:text-blue-500 transition-all border border-transparent group-hover:border-slate-100 group-hover:shadow-sm">
                  <item.icon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 tracking-tight">{item.label}</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">{item.description}</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-200 group-hover:text-slate-400 transition-colors group-hover:translate-x-1" />
            </button>
          ))}
        </div>
      </section>

      {/* Log Out Button */}
      <section className="pt-4">
        <button 
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-3 p-6 rounded-[2rem] bg-white border-2 border-slate-50 text-red-500 font-black text-xs uppercase tracking-widest hover:bg-red-50 hover:border-red-100 transition-all active:scale-95 group shadow-sm"
        >
          <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          Terminate Session
        </button>
        <p className="mt-6 text-center text-[10px] font-bold text-slate-300 uppercase tracking-widest leading-relaxed">
          Tos Rean v1.0.4<br/>
          Secure Client Connection Established
        </p>
      </section>

      {/* Edit Profile Dynamic Modal */}
      <EditProfileModal 
        isOpen={isEditProfileOpen} 
        onClose={() => setIsEditProfileOpen(false)} 
      />
    </div>
  );
}
