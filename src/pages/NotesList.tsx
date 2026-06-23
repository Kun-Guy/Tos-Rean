import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  StickyNote, 
  Trash2, 
  Search, 
  Clock, 
  MoreVertical,
  AlertCircle,
  Loader2,
  ChevronRight,
  Database,
  Copy,
  Check,
  ShieldAlert
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';

interface Note {
  id: string;
  title: string;
  content: string;
  updated_at: string;
  lesson_id?: string;
  lessons?: { title: string };
}

export default function NotesList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [schemaError, setSchemaError] = useState<any | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);

  useEffect(() => {
    if (user) fetchNotes();
  }, [user]);

  const fetchNotes = async () => {
    if (!user) return;
    setLoading(true);
    console.log('Fetching notes for user:', user.id);
    
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('id, title, content, updated_at, lesson_id')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Fetch Notes Error:', error);
        alert(`Error loading notes: ${error.message}`);
      } else if (data) {
        console.log('Notes retrieved:', data.length);
        setNotes(data as any[]);
      }
    } catch (err: any) {
      console.error('Network error fetching notes:', err);
      alert(`Could not fetch notes. The system may be offline or unconfigured: ${err?.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  const createNote = async () => {
    if (!user) {
      alert("You must be logged in to create notes.");
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('notes')
        .insert({
          user_id: user.id,
          title: 'New Insight',
          content: '<p>Start typing your thoughts here...</p>',
        })
        .select()
        .single();

      if (error) {
        console.error('Note Creation Error:', error);
        if (error.code === '23503' || error.message?.includes('notes_user_id_fkey') || error.message?.includes('users')) {
          setSchemaError({
            code: error.code,
            message: error.message,
            userId: user.id,
            userEmail: user.email
          });
        } else {
          alert(`Database Error: ${error.message} (Code: ${error.code})`);
        }
        return;
      }

      if (data) {
        navigate(`/notes/${data.id}`);
      }
    } catch (err: any) {
      console.error('Exception on creating note:', err);
      alert(`Failed to make a new note: ${err?.message || err}`);
    }
  };

  const deleteNote = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', deletingId);

      if (!error) {
        setNotes(notes.filter(n => n.id !== deletingId));
        setDeletingId(null);
      } else {
        alert(`Could not delete note: ${error.message}`);
      }
    } catch (err: any) {
      console.error('Exception on deleting note:', err);
      alert(`Failed to delete note: ${err?.message || err}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredNotes = notes.filter(n => {
    const title = n.title || '';
    const content = n.content || '';
    const query = searchQuery.toLowerCase();
    return title.toLowerCase().includes(query) || content.toLowerCase().includes(query);
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter mb-2">My Knowledge <span className="text-blue-600">Repository</span></h1>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
            <StickyNote className="w-4 h-4 text-blue-500" />
            {notes.length} Total Insights Captured
          </p>
        </div>

        <button 
          onClick={createNote}
          className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-black transition-all active:scale-95 shadow-xl shadow-slate-200"
        >
          <Plus className="w-4 h-4" />
          Create New Note
        </button>
      </section>

      {/* Toolbar */}
      <div className="relative group max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-blue-600 transition-colors" />
        <input 
          type="text" 
          placeholder="Search through your insights..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white border-2 border-slate-100 pl-11 pr-4 py-3.5 rounded-2xl focus:ring-2 focus:ring-blue-600 focus:bg-white focus:border-white outline-none text-xs font-bold transition-all shadow-sm"
        />
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-20 gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Accessing Repository...</p>
        </div>
      ) : filteredNotes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredNotes.map((note) => (
            <motion.div
              key={note.id}
              layout
              className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm hover:shadow-2xl hover:shadow-slate-200 transition-all flex flex-col group cursor-pointer"
              onClick={() => navigate(`/notes/${note.id}`)}
            >
              <div className="flex items-start justify-between mb-6">
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                  <StickyNote className="w-6 h-6" />
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeletingId(note.id);
                  }}
                  className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 space-y-4">
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight leading-tight group-hover:text-blue-600 transition-colors">
                    {note.title}
                  </h3>
                  {note.lessons?.title && (
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2 block">
                      Ref: {note.lessons.title}
                    </span>
                  )}
                </div>
                
                <p className="text-[11px] text-slate-500 leading-relaxed font-medium line-clamp-3 overflow-hidden" 
                   dangerouslySetInnerHTML={{ __html: (note.content || '').replace(/<[^>]*>?/gm, ' ') }} />
              </div>

              <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  {note.updated_at ? (
                    (() => {
                      try {
                        return formatDistanceToNow(new Date(note.updated_at), { addSuffix: true });
                      } catch (e) {
                        return 'Recently';
                      }
                    })()
                  ) : 'Recently'}
                </div>
                <ChevronRight className="w-4 h-4 translate-x-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="bg-white border-2 border-dashed border-slate-100 rounded-[3rem] p-12 text-center max-w-2xl mx-auto">
          <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-slate-200">
            <Plus className="w-10 h-10" />
          </div>
          <h3 className="text-xl font-black text-slate-900 tracking-tighter mb-2">Repository Empty</h3>
          <p className="text-sm text-slate-400 max-w-xs mx-auto font-medium leading-relaxed">
            Your intelligence repository is currently silent. Start a new note to capture your learning journey.
          </p>
          <button 
            onClick={createNote}
            className="mt-8 px-10 py-4 bg-blue-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95"
          >
            Initiate First Note
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingId && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2.5rem] p-10 w-full max-w-sm shadow-2xl border border-slate-100"
            >
              <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 mb-6 mx-auto">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tighter text-center mb-2 leading-none">Delete Intelligence?</h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.1em] text-center mb-10 leading-relaxed px-4">
                This item will be permanently removed from your knowledge repository. This action cannot be reversed.
              </p>
              
              <div className="flex gap-4">
                <button 
                  onClick={() => setDeletingId(null)}
                  disabled={isDeleting}
                  className="flex-1 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={deleteNote}
                  disabled={isDeleting}
                  className="flex-1 py-4 bg-red-500 text-white text-[11px] font-black rounded-2xl hover:bg-red-600 shadow-xl shadow-red-100 transition-all flex items-center justify-center gap-2 uppercase tracking-widest"
                >
                  {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete Forever"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Schema Synchronization & Error Recovery Diagnostic Modal */}
      <AnimatePresence>
        {schemaError && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center z-[100] p-4 overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2.5rem] p-8 md:p-10 w-full max-w-lg shadow-2xl border border-slate-100 space-y-6 my-8"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 shrink-0">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tighter leading-tight">Database Profile Missing</h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Error Code: {schemaError.code}</p>
                </div>
              </div>

              <div className="space-y-3 bg-slate-50 rounded-2xl p-4 border border-slate-100 text-xs font-semibold leading-relaxed text-slate-600">
                <p>
                  You are signed in with <strong className="text-slate-900 font-bold">{schemaError.userEmail}</strong>, but your public profile row is not yet created in the <code className="bg-slate-200/50 px-1 py-0.5 rounded text-red-500 font-mono">public.users</code> database table.
                </p>
                <p>
                  This usually happens if you created your account before establishing database triggers, or if Supabase Auth sync was skipped on profile creation.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">How to Fix in Supabase</label>
                <p className="text-[11px] text-slate-400 font-medium">
                  Go to your <strong>Supabase Dashboard → SQL Editor → New Query</strong>, paste the script below, and click <strong>"Run"</strong>:
                </p>
                
                <div className="relative">
                  <pre className="bg-slate-900 text-slate-200 text-[10px] p-4 rounded-xl overflow-x-auto font-mono max-h-48 leading-relaxed selection:bg-blue-500 selection:text-white">
{`-- 1. Sync any existing auth accounts into the public profiles
INSERT INTO public.users (id, full_name, email, role)
SELECT 
  id, 
  COALESCE(raw_user_meta_data->>'full_name', email) AS full_name, 
  email, 
  'student'::user_role AS role
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 2. Build additional direct fallback policies so your React app can auto-create profiles on login
CREATE POLICY "Users can insert their own profile" ON public.users 
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users 
  FOR UPDATE USING (auth.uid() = id);`}
                  </pre>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(`-- 1. Sync any existing auth accounts into the public profiles
INSERT INTO public.users (id, full_name, email, role)
SELECT 
  id, 
  COALESCE(raw_user_meta_data->>'full_name', email) AS full_name, 
  email, 
  'student'::user_role AS role
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 2. Build additional direct fallback policies so your React app can auto-create profiles on login
CREATE POLICY "Users can insert their own profile" ON public.users 
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users 
  FOR UPDATE USING (auth.uid() = id);`);
                      setCopiedSql(true);
                      setTimeout(() => setCopiedSql(false), 2000);
                    }}
                    className="absolute right-3 top-3 p-2 bg-slate-800 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition-all flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest"
                  >
                    {copiedSql ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-green-400" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copy Code
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex gap-4 pt-2">
                <button 
                  onClick={() => setSchemaError(null)}
                  className="flex-1 py-4 text-[11px] font-black text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest text-center"
                >
                  Close
                </button>
                <button 
                  onClick={async () => {
                    // Try to auto-create directly from client-side if they've already run policies!
                    try {
                      const { error } = await supabase
                        .from('users')
                        .insert({
                          id: schemaError.userId,
                          full_name: schemaError.userEmail?.split('@')[0] || 'Student',
                          email: schemaError.userEmail || '',
                          role: 'student'
                        });
                      
                      if (!error) {
                        setSchemaError(null);
                        await createNote(); // Retry note creation
                      } else {
                        alert(`Direct insert failed. Make sure to paste the SQL setup in Supabase SQL editor first!\nReason: ${error.message}`);
                      }
                    } catch (err: any) {
                      alert(`Direct insert failed: ${err.message}`);
                    }
                  }}
                  className="flex-1 py-4 bg-blue-600 text-white text-[11px] font-black rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all uppercase tracking-widest"
                >
                  Attempt Auto-Fix Profile
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
