import React from 'react';
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import { 
  FolderKanban, 
  HelpCircle, 
  Users, 
  GraduationCap, 
  ArrowLeft,
  Bell, 
  Search, 
  ShieldAlert,
  Loader2,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { useState } from 'react';

export default function AdminLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const adminNavItems = [
    { icon: FolderKanban, label: 'Content Manager', path: '/admin/content-manager' },
    { icon: HelpCircle, label: 'Exercise Builder', path: '/admin/exercise-builder' },
    { icon: Users, label: 'Student Analytics', path: '/admin/student-analytics' },
  ];

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row font-sans overflow-x-hidden selection:bg-indigo-500 selection:text-white">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-72 bg-slate-900 border-r border-slate-800 flex-col sticky top-0 h-screen z-20">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-900/40 animate-pulse">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tighter leading-none text-white">តោះរៀន</h1>
              <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mt-1">Admin Enclave</p>
            </div>
          </div>

          <div className="mb-6 px-4 py-2 bg-slate-950/50 rounded-xl border border-slate-800 flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Authority Session Active</span>
          </div>

          <nav className="space-y-2">
            {adminNavItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => cn(
                  "flex items-center gap-3 px-4 py-4 rounded-2xl text-xs font-black uppercase tracking-wider transition-all group",
                  isActive 
                    ? "bg-indigo-600 text-white shadow-xl shadow-indigo-900/50 scale-[1.02]" 
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
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

        <div className="mt-auto p-6 space-y-4 border-t border-slate-800/80 bg-slate-900/40">
          <Link 
            to="/" 
            className="w-full flex items-center justify-center gap-2 py-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all text-indigo-300"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Student Portal
          </Link>
          
          <div className="flex items-center gap-3 p-3 bg-slate-950/60 rounded-2xl border border-slate-900">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-black text-indigo-400">
              AD
            </div>
            <div className="overflow-hidden">
              <p className="text-[10px] font-black text-slate-200 truncate tracking-tight">{user?.email}</p>
              <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">System Architect</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Sidebar - Mobile drawer */}
      <div className={cn(
        "fixed inset-0 bg-slate-950/90 backdrop-blur-md z-40 md:hidden transition-transform duration-300 transform",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="w-72 bg-slate-900 h-full p-8 flex flex-col justify-between border-r border-slate-800">
          <div>
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <h1 className="text-lg font-black tracking-tighter text-white">តោះរៀន</h1>
              </div>
              <button 
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="space-y-2">
              {adminNavItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) => cn(
                    "flex items-center gap-3 px-4 py-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
                    isActive 
                      ? "bg-indigo-600 text-white shadow-xl shadow-indigo-900/50" 
                      : "text-slate-400 hover:bg-slate-800"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="space-y-4">
            <Link 
              to="/" 
              className="w-full flex items-center justify-center gap-2 py-3 bg-slate-950 border border-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest text-indigo-300"
            >
              <ArrowLeft className="w-4 h-4" />
              Student Portal
            </Link>
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-900 text-center text-[10px] text-slate-500 font-bold">
              Signed in as: {user?.email}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-20 bg-slate-950/80 backdrop-blur-md border-b border-slate-900 flex items-center justify-between px-6 sticky top-0 z-10">
          {/* Mobile menu triggers */}
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2.5 bg-slate-900 text-slate-300 hover:text-white rounded-2xl border border-slate-800"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 md:hidden bg-indigo-600 rounded-xl flex items-center justify-center text-white">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-black text-white tracking-tight leading-none">Admin Panel</span>
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest hidden md:block mt-1">Tos Rean Management Console</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link 
              to="/" 
              className="hidden sm:flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Student Portal
            </Link>
            
            <div className="h-6 w-px bg-slate-800 hidden sm:block"></div>
            
            <div className="px-3.5 py-2 bg-indigo-950/50 rounded-2xl border border-indigo-900/40 text-indigo-400 text-[10px] font-black uppercase tracking-widest hidden lg:block">
              Authorization: Level ROOT
            </div>
          </div>
        </header>

        {/* Content Outlet */}
        <main className="flex-1 p-6 md:p-10 max-w-7xl w-full mx-auto pb-32 md:pb-10 overflow-y-auto custom-scrollbar">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
