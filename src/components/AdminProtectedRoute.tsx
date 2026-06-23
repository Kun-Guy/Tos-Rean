import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ShieldAlert, Loader2, LogOut } from 'lucide-react';

interface AdminProtectedRouteProps {
  children: React.ReactNode;
}

export function AdminProtectedRoute({ children }: AdminProtectedRouteProps) {
  const { user, role, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-900 text-slate-400 gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
        <p className="text-xs font-black uppercase tracking-widest text-[#a5b4fc]">Securing Admin Portal...</p>
      </div>
    );
  }

  // If search finishes and no user is logged in, redirect to login Page
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If user role is NOT admin, show a customized gorgeous 403 Access Denied window
  if (role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6 font-sans">
        <div className="text-center bg-slate-900 p-12 rounded-[3rem] border border-slate-800 max-w-md shadow-2xl relative overflow-hidden">
          {/* Decorative glow background */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-red-500/10 rounded-full blur-[100px] pointer-events-none"></div>

          <div className="w-20 h-20 bg-red-950/50 border border-red-500/30 rounded-3xl flex items-center justify-center mx-auto mb-8 text-red-500">
            <ShieldAlert className="w-10 h-10" />
          </div>

          <h1 className="text-3xl font-black text-white tracking-tighter mb-3 leading-none">Administration Only</h1>
          <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-6">403 Unauthorized Access</p>
          
          <p className="text-sm text-slate-400 font-medium leading-relaxed mb-10 px-4">
            Security policies restrict this network enclave to authorized managers only. Your current role is registered as <strong className="text-blue-400 font-extrabold uppercase">{role || 'student'}</strong>.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={() => window.history.back()}
              className="flex-1 px-6 py-4 bg-slate-800 text-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all active:scale-95 border border-slate-700"
            >
              Go Back
            </button>
            <button 
              onClick={async () => {
                await signOut();
                window.location.href = '/login';
              }}
              className="flex-1 px-6 py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 shadow-xl shadow-red-900/30"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
