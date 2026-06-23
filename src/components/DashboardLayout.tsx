import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import { 
  Home, 
  BookOpen, 
  StickyNote, 
  User, 
  Bell, 
  Search,
  GraduationCap,
  ShieldCheck,
  Compass,
  Flame
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';

export default function DashboardLayout() {
  const { user, role, streak, lastStudyDate, refreshStreak, fullName, avatarUrl } = useAuth();

  const getTodayPhnomPenhStr = () => {
    try {
      const formatter = new Intl.DateTimeFormat('fr-CA', {
        timeZone: 'Asia/Phnom_Penh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      return formatter.format(new Date());
    } catch (e) {
      const d = new Date();
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  };

  const hasActivityToday = lastStudyDate === getTodayPhnomPenhStr();

  useEffect(() => {
    if (!user) return;
    refreshStreak();

    const handleActivity = () => {
      refreshStreak();
    };
    window.addEventListener('activity-updated', handleActivity);

    // Setup active realtime subscriptions on user completions/answers for instant dashboard updates
    const liveStreakChannel = supabase
      .channel('live-streak-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_progress', filter: `user_id=eq.${user.id}` }, () => {
        refreshStreak();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_answers', filter: `user_id=eq.${user.id}` }, () => {
        refreshStreak();
      })
      .subscribe();

    return () => {
      window.removeEventListener('activity-updated', handleActivity);
      supabase.removeChannel(liveStreakChannel);
    };
  }, [user]);

  const navItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: BookOpen, label: 'My Courses', path: '/courses' },
    { icon: Compass, label: 'Explore', path: '/explore' },
    { icon: StickyNote, label: 'My Notes', path: '/notes' },
    { icon: User, label: 'Profile', path: '/profile' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-900 font-sans">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-72 bg-white border-r border-slate-100 flex-col sticky top-0 h-screen shadow-sm z-20">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center text-blue-500 shadow-lg shadow-slate-200">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tighter leading-none text-slate-900">តោះរៀន</h1>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Tos Rean • Learning</p>
            </div>
          </div>
   
          <nav className="space-y-2">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => cn(
                  "flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all group",
                  isActive 
                    ? "bg-blue-600 text-white shadow-xl shadow-blue-100" 
                    : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                )}
              >
                <item.icon className={cn(
                  "w-5 h-5",
                  "group-hover:scale-110 transition-transform"
                )} />
                {item.label}
              </NavLink>
            ))}

            {role === 'admin' && (
              <Link
                to="/admin"
                className="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider text-rose-600 bg-rose-50/50 hover:bg-rose-50 hover:text-rose-700 transition-all group mt-6 border border-dashed border-rose-200"
              >
                <ShieldCheck className="w-5 h-5 group-hover:scale-110 transition-transform text-rose-500 animate-pulse" />
                Admin Panel
              </Link>
            )}
          </nav>
        </div>

        <div className="mt-auto p-8 border-t border-slate-50">
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-xs font-black text-blue-500 shadow-sm overflow-hidden shrink-0">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                user?.email?.[0].toUpperCase()
              )}
            </div>
            <div className="overflow-hidden">
              <p className="text-[11px] font-bold text-slate-900 truncate tracking-tight">{fullName || user?.email?.split('@')[0]}</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                {role === 'admin' ? 'Root • Administrator' : 'Level 12 • Student'}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center justify-between px-6 sticky top-0 z-10">
          {/* Mobile Logo */}
          <div className="md:hidden flex items-center gap-2">
            <div className="w-8 h-8 bg-slate-900 rounded-xl flex items-center justify-center text-blue-500 shadow-md">
              <GraduationCap className="w-5 h-5" />
            </div>
            <h1 className="text-lg font-black tracking-tighter text-slate-900">តោះរៀន</h1>
          </div>

          {/* Search Bar - Hidden on small mobile */}
          <div className="hidden sm:flex flex-1 max-w-md mx-8 relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Search chapters, lessons, notes..."
              className="w-full bg-slate-50 border-2 border-slate-50 pl-11 pr-4 py-2.5 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-white outline-none text-xs font-bold transition-all"
            />
          </div>

          <div className="flex items-center gap-3">
            {/* Live Streak indicator */}
            <motion.div 
              key={streak}
              initial={{ scale: 0.95, opacity: 0.9 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 15 }}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 rounded-2xl text-[10px] uppercase tracking-wider font-black transition-all border shadow-sm",
                streak === 0
                  ? "bg-slate-100 border-slate-200 text-slate-400"
                  : hasActivityToday
                    ? "bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-500/20"
                    : "bg-amber-50 border-amber-100 text-amber-600"
              )}
            >
              <Flame className={cn(
                "w-4 h-4 shrink-0",
                streak === 0 
                  ? "text-slate-300 fill-slate-200" 
                  : hasActivityToday 
                    ? "text-white fill-white animate-pulse" 
                    : "text-amber-500 fill-amber-400"
              )} />
              <span>{streak === 0 ? "0 Days" : `${streak} Day Streak`}</span>
            </motion.div>

            {role === 'admin' && (
              <Link 
                to="/admin" 
                className="flex items-center gap-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-600 hover:text-rose-700 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-rose-550 animate-pulse" />
                Admin
              </Link>
            )}
            <button className="p-2.5 bg-slate-50 text-slate-400 rounded-2xl hover:text-slate-900 transition-colors relative border border-slate-100">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="h-8 w-px bg-slate-100 mx-1 hidden sm:block"></div>
            <button className="sm:hidden p-2.5 bg-slate-50 text-slate-400 rounded-2xl border border-slate-100">
              <Search className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Content Outlet */}
        <main className="flex-1 p-6 md:p-10 max-w-7xl w-full mx-auto pb-32 md:pb-10 overflow-y-auto custom-scrollbar">
          <Outlet />
        </main>
      </div>

      {/* Bottom Nav - Mobile */}
      <nav className="md:hidden fixed bottom-6 left-6 right-6 h-16 bg-white border border-slate-100 rounded-[2rem] shadow-2xl shadow-slate-200 flex items-center justify-around px-4 z-30">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => cn(
              "p-3 rounded-2xl transition-all flex flex-col items-center gap-1",
              isActive 
                ? "bg-blue-600 text-white shadow-xl shadow-blue-200 scale-110 -translate-y-2" 
                : "text-slate-300 hover:text-slate-500"
            )}
          >
            <item.icon className="w-6 h-6" />
            {/* {isActive && <span className="text-[8px] font-black uppercase tracking-widest">{item.label}</span>} */}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
