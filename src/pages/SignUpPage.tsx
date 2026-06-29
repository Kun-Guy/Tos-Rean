import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { GraduationCap, Mail, Lock, User, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

export default function SignUpPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { signUpWithEmail } = useAuth();
  const navigate = useNavigate();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      setIsLoading(false);
      return;
    }

    const { error } = await signUpWithEmail(email, password, fullName);
    if (error) {
      setError(error.message);
      setIsLoading(false);
    } else {
      alert("Registration successful! Please check your email for verification.");
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans">
      <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-2xl shadow-slate-200 max-w-md w-full border border-slate-100 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="text-center mb-10">
          <motion.div 
            initial={{ rotate: 0 }}
            animate={{ rotate: -6 }}
            className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 text-white shadow-xl shadow-blue-200 border border-slate-100 overflow-hidden"
          >
            <img 
              src="https://mbnywkffkntyokddsnlx.supabase.co/storage/v1/object/public/Logo/Tos%20rean.png" 
              alt="Tos Rean Logo" 
              className="w-full h-full object-contain p-2"
              referrerPolicy="no-referrer"
            />
          </motion.div>
          <h1 className="text-3xl font-black text-slate-900 mb-1 tracking-tighter">តោះរៀន</h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.25em]">Tos Rean • Create Account</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-600 text-xs font-bold animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSignUp} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Chamroeun Sok"
                className="w-full bg-slate-50 border-2 border-slate-50 pl-11 pr-4 py-3.5 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-white outline-none text-sm font-bold transition-all"
              />
            </div>
          </div>

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

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50 border-2 border-slate-50 pl-11 pr-4 py-3.5 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-white outline-none text-sm font-bold transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-black shadow-xl shadow-slate-200 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Account"}
            {!isLoading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        <p className="mt-8 text-center text-xs font-bold text-slate-400">
          Already have an account?{" "}
          <Link to="/login" className="text-blue-600 hover:underline">Log In</Link>
        </p>
      </div>
    </div>
  );
}
