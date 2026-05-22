import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { 
  Home, 
  BookOpen, 
  StickyNote, 
  User, 
  Bell, 
  Search,
  GraduationCap
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';

export default function DashboardLayout() {
  const { user } = useAuth();

  const navItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: BookOpen, label: 'Courses', path: '/courses' },
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
          </nav>
        </div>

        <div className="mt-auto p-8 border-t border-slate-50">
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-xs font-black text-blue-500 shadow-sm">
              {user?.email?.[0].toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-[11px] font-bold text-slate-900 truncate tracking-tight">{user?.email}</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Level 12 • Student</p>
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
