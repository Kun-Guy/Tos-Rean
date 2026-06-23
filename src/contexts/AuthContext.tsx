import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: 'student' | 'admin' | null;
  loading: boolean;
  streak: number;
  lastStudyDate: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  refreshStreak: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: any }>;
  signUpWithEmail: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<'student' | 'admin' | null>(null);
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState<number>(0);
  const [lastStudyDate, setLastStudyDate] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const fetchUserProfileDirectly = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('full_name, avatar_url')
        .eq('id', userId)
        .single();
      if (data && !error) {
        setFullName(data.full_name || null);
        setAvatarUrl(data.avatar_url || null);
      }
    } catch (err) {
      console.error('Error fetching user profile directly in AuthContext:', err);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchUserProfileDirectly(user.id);
    }
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserRoleAndStreak(session.user.id);
        fetchUserProfileDirectly(session.user.id);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserRoleAndStreak(session.user.id);
        fetchUserProfileDirectly(session.user.id);
      }
      else {
        setRole(null);
        setStreak(0);
        setLastStudyDate(null);
        setFullName(null);
        setAvatarUrl(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [user?.id]);

  const fetchUserRoleAndStreak = async (userId: string) => {
    try {
      // Determine if the user email qualifies for admin access
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const userEmail = currentUser?.email;
      const adminEmailsConfig = (import.meta.env.VITE_ADMIN_EMAILS || 'cingkun006@gmail.com')
        .split(',')
        .map((e: string) => e.trim().toLowerCase());
      
      const isAdminEmail = userEmail ? adminEmailsConfig.includes(userEmail.toLowerCase()) : false;

      let selectResult = await supabase
        .from('users')
        .select('role, current_streak, last_study_date')
        .eq('id', userId)
        .single();

      let data: any = selectResult.data;
      let error = selectResult.error;

      // Robust check for missing columns (PGRST204)
      if (error && (error.code === 'PGRST204' || (error.message && (error.message.includes('current_streak') || error.message.includes('last_study_date'))))) {
        console.warn('Streak columns missing in users table, falling back to role-only query:', error);
        const retryResult = await supabase
          .from('users')
          .select('role')
          .eq('id', userId)
          .single();
        data = retryResult.data;
        error = retryResult.error;
      }

      if (data && !error) {
        setStreak(data.current_streak || 0);
        setLastStudyDate(data.last_study_date || null);
        if (isAdminEmail && data.role !== 'admin') {
          const { error: updateError } = await supabase
            .from('users')
            .update({ role: 'admin' })
            .eq('id', userId);
          
          if (!updateError) {
            setRole('admin');
          } else {
            // If update fails due to security constraints, fallback to high-clearance runtime state
            setRole('admin');
          }
        } else {
          setRole(data.role as 'student' | 'admin');
        }
      } else {
        // The user profile might not exist in public.users yet!
        // Let's attempt to auto-create it from the client-side as a self-healing fallback.
        try {
          if (currentUser) {
            const fullName = currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'Student';
            const resolvedRole = isAdminEmail ? 'admin' : 'student';
            
            // Try inserting with streak columns first
            let insertResult = await supabase
              .from('users')
              .insert({
                id: userId,
                full_name: fullName,
                email: currentUser.email || '',
                role: resolvedRole,
                current_streak: 0,
                last_study_date: null
              });

            if (insertResult.error && (insertResult.error.code === 'PGRST204' || (insertResult.error.message && (insertResult.error.message.includes('current_streak') || insertResult.error.message.includes('last_study_date'))))) {
              console.warn('Streak columns missing, attempting to insert profile with core entries only:', insertResult.error);
              insertResult = await supabase
                .from('users')
                .insert({
                  id: userId,
                  full_name: fullName,
                  email: currentUser.email || '',
                  role: resolvedRole
                });
            }

            if (!insertResult.error) {
              setRole(resolvedRole);
              setStreak(0);
              setLastStudyDate(null);
            } else {
              console.warn('Could not auto-insert user row in public.users:', insertResult.error);
              setRole(resolvedRole);
            }
          }
        } catch (err) {
          console.error('Error auto-provisioning user profile:', err);
          setRole(isAdminEmail ? 'admin' : 'student');
        }
      }
    } catch (err) {
      console.error('Error fetching user role, defaulting to guest/student mode:', err);
      // Fail-safe fallback to ensure app stays usable
      setRole('student');
    }
  };

  const refreshStreak = async () => {
    if (!user) return;
    try {
      const getPhnomPenhDateStr = () => {
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

      const getPhnomPenhYesterdayStr = () => {
        try {
          const today = new Date();
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          const formatter = new Intl.DateTimeFormat('fr-CA', {
            timeZone: 'Asia/Phnom_Penh',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          });
          return formatter.format(yesterday);
        } catch (e) {
          const d = new Date();
          d.setDate(d.getDate() - 1);
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        }
      };

      const todayStr = getPhnomPenhDateStr();
      const yesterdayStr = getPhnomPenhYesterdayStr();

      // Call Supabase RPC to check/update streak database-side
      const { error: rpcError } = await supabase.rpc('update_user_streak', { user_id: user.id });
      
      let fetchFailed = false;
      if (rpcError) {
        console.warn('update_user_streak RPC failed (using fallback client update table/localstorage):', rpcError);
        
        // --- CLIENT-SIDE FALLBACK LOGIC ---
        // Fetch current profile metrics
        const { data: userData, error: selectError } = await supabase
          .from('users')
          .select('current_streak, last_study_date')
          .eq('id', user.id)
          .single();

        if (!selectError && userData) {
          const dbStreak = userData.current_streak || 0;
          const dbLastStudyDate = userData.last_study_date || null;

          if (dbLastStudyDate !== todayStr) {
            let nextStreak = 1;
            if (dbLastStudyDate === yesterdayStr) {
              nextStreak = dbStreak + 1;
            } else {
              nextStreak = 1;
            }

            // Attempt direct column update since RPC doesn't exist
            const { error: updateError } = await supabase
              .from('users')
              .update({
                current_streak: nextStreak,
                last_study_date: todayStr
              })
              .eq('id', user.id);

            if (updateError) {
              console.warn('Direct users table update failed (probably missing columns or RLS). Falling back to pure client storage:', updateError);
              fetchFailed = true;
            } else {
              setStreak(nextStreak);
              setLastStudyDate(todayStr);
            }
          } else {
            setStreak(dbStreak);
            setLastStudyDate(dbLastStudyDate);
          }
        } else {
          fetchFailed = true;
        }
      } else {
        // Refetch streak and study date to update context state
        const { data, error: selectError } = await supabase
          .from('users')
          .select('current_streak, last_study_date')
          .eq('id', user.id)
          .single();
        if (data && !selectError) {
          setStreak(data.current_streak || 0);
          setLastStudyDate(data.last_study_date || null);
        } else {
          fetchFailed = true;
        }
      }

      // If both Supabase RPC and query fail (e.g., columns don't exist yet/PostgREST cache stale), local storage handles it smoothly
      if (fetchFailed) {
        const localKey = `tos_rean_streak_${user.id}`;
        const localData = JSON.parse(localStorage.getItem(localKey) || '{"streak":0,"lastStudyDate":null}');
        let localNewStreak = 1;

        if (localData.lastStudyDate === todayStr) {
          localNewStreak = localData.streak;
        } else if (localData.lastStudyDate === yesterdayStr) {
          localNewStreak = localData.streak + 1;
        } else {
          localNewStreak = 1;
        }

        localStorage.setItem(localKey, JSON.stringify({ streak: localNewStreak, lastStudyDate: todayStr }));
        setStreak(localNewStreak);
        setLastStudyDate(todayStr);
      }
    } catch (err) {
      console.error('Failed to update/refresh streak:', err);
    }
  };

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
  };

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUpWithEmail = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      role,
      loading,
      streak,
      lastStudyDate,
      fullName,
      avatarUrl,
      refreshStreak,
      refreshProfile,
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      signOut
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
