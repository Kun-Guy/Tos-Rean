import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { GraduationCap, Mail, Lock, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { signInWithEmail, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const { error } = await signInWithEmail(email, password);
    if (error) {
      setError(error.message);
      setIsLoading(false);
    } else {
      navigate('/');
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    
    if (error) {
      setError(error.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans">
      <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-2xl shadow-slate-200 max-w-md w-full border border-slate-100 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="text-center mb-10">
          <motion.div 
            initial={{ rotate: 0 }}
            animate={{ rotate: 6 }}
            className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-6 text-blue-500 shadow-xl shadow-slate-200 border-4 border-white"
          >
            <GraduationCap className="w-8 h-8" />
          </motion.div>
          <h1 className="text-3xl font-black text-slate-900 mb-1 tracking-tighter">តោះរៀន</h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.25em]">Tos Rean • Welcome Back</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex flex-col gap-2 text-red-600 text-xs font-bold animate-shake">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <p>{error}</p>
            </div>
            {error.includes("Email not confirmed") && (
              <p className="mt-2 text-slate-500 font-medium bg-white p-2 rounded-lg border border-red-50">
                Tip: Check your email for a verification link. To skip this, disable "Confirm email" in the Supabase Dashboard (Auth &rarr; Settings).
              </p>
            )}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-slate-50 border-2 border-slate-50 pl-11 pr-4 py-3.5 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-white outline-none text-sm font-bold transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50 border-2 border-slate-50 pl-11 pr-4 py-3.5 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-white outline-none text-sm font-bold transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign In"}
            {!isLoading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
          <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-widest text-slate-300"><span className="bg-white px-4">Or continue with</span></div>
        </div>

        <button
          onClick={handleGoogleSignIn}
          className="w-full flex items-center justify-center gap-4 bg-white border-2 border-slate-50 py-4 rounded-2xl font-bold text-slate-700 hover:border-blue-100 hover:bg-blue-50 transition-all active:scale-95 shadow-sm"
        >
          <img src="https://www.google.com/favicon.ico" className="w-5 h-5 opacity-80" alt="Google" />
          <span className="text-sm">Google Account</span>
        </button>

        <p className="mt-8 text-center text-xs font-bold text-slate-400">
          Don't have an account?{" "}
          <Link to="/signup" className="text-blue-600 hover:underline">Sign Up</Link>
        </p>
      </div>
    </div>
  );
}
