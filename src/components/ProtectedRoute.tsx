import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ShieldAlert, Loader2 } from 'lucide-react';

interface PrivateRouteProps {
  children: React.ReactNode;
  roleRequired?: 'student' | 'admin';
}

export function ProtectedRoute({ children, roleRequired }: PrivateRouteProps) {
  const { user, loading, role } = useAuth();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50 text-slate-500 gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
        <p className="text-xs font-black uppercase tracking-widest">Verifying Session...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (roleRequired && role !== roleRequired && role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50 p-4 font-sans">
        <div className="text-center bg-white p-12 rounded-[2.5rem] shadow-2xl shadow-red-100 border border-red-50 max-w-sm">
          <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mx-auto mb-8 text-red-600">
            <ShieldAlert className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter mb-2">Access Denied</h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-8 leading-relaxed">
            You don't have permission to view this specific content ladder.
          </p>
          <button 
            onClick={() => window.history.back()}
            className="px-8 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-black transition-all active:scale-95 shadow-xl shadow-slate-200"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
