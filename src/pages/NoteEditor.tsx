import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  List, 
  ListOrdered, 
  Heading1, 
  Heading2, 
  Image as ImageIcon,
  ArrowLeft,
  Save,
  Loader2,
  CheckCircle2,
  Library
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function NoteEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'modified' | 'saving' | 'saved'>('idle');
  const [loading, setLoading] = useState(true);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      Underline,
      Placeholder.configure({
        placeholder: 'Capture your learning insights here...',
      }),
    ],
    content: '',
    onUpdate: () => {
      setSaveStatus('modified');
    },
    editorProps: {
      attributes: {
        class: 'prose prose-slate max-w-none focus:outline-none min-h-[500px] text-lg leading-relaxed',
      },
    },
  });

  // Fetch Initial Data
  useEffect(() => {
    if (id && editor && !editor.isDestroyed) {
      fetchNote();
    }
  }, [id, editor]);

  const fetchNote = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('id', id)
        .single();

      if (!error && data) {
        setTitle(data.title);
        if (editor && !editor.isDestroyed) {
          editor.commands.setContent(data.content);
          // Ensure initial set doesn't trigger "modified" state
          setTimeout(() => setSaveStatus('idle'), 100);
        }
      } else if (error) {
        console.error('Failed to load note data:', error);
      }
    } catch (err) {
      console.error('Error fetching note in editor:', err);
    } finally {
      setLoading(false);
    }
  };

  const persistSave = async () => {
    if (!editor || !id) return;
    
    setSaveStatus('saving');
    try {
      const { error } = await supabase
        .from('notes')
        .update({
          title,
          content: editor.getHTML(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (!error) {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        console.error('Save error response:', error);
        setSaveStatus('idle');
      }
    } catch (err) {
      console.error('Exception autosaving note:', err);
      setSaveStatus('idle');
    }
  };

  // Auto-save logic
  useEffect(() => {
    if (!editor || loading || saveStatus !== 'modified') return;

    const timeoutId = setTimeout(persistSave, 1500);
    return () => clearTimeout(timeoutId);
  }, [title, editor?.getHTML(), id, loading, saveStatus]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    setSaveStatus('modified');
  };

  const handleBack = async () => {
    if (saveStatus === 'modified') {
      await persistSave();
    }
    navigate('/notes');
  };

  // Image Upload Logic
  const addImage = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file || !user) return;

      setSaveStatus('saving');
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Math.random()}.${fileExt}`;
        const filePath = `note_attachments/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('note_images')
          .upload(filePath, file);

        if (uploadError) {
          console.error('Error uploading image:', uploadError);
          setSaveStatus('idle');
          return;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('note_images')
          .getPublicUrl(filePath);

        if (publicUrl && editor) {
          editor.chain().focus().setImage({ src: publicUrl }).run();
        }
        setSaveStatus('saved');
      } catch (err) {
        console.error('Image upload exception:', err);
        setSaveStatus('idle');
      }
    };
    input.click();
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 gap-4">
      <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Reassembling Intelligence...</p>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 animate-in fade-in duration-500">
      {/* Top Header */}
      <div className="flex items-center justify-between px-2">
        <button 
          onClick={handleBack}
          className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Knowledge Repository
        </button>

        <div className="flex items-center gap-3">
          <AnimatePresence mode="wait">
            {saveStatus === 'saving' ? (
              <motion.div 
                key="saving"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex items-center gap-2 text-[9px] font-black text-blue-500 uppercase tracking-widest bg-blue-50 px-3 py-1.5 rounded-full"
              >
                <Loader2 className="w-3 h-3 animate-spin" />
                Syncing with Cloud
              </motion.div>
            ) : saveStatus === 'saved' ? (
              <motion.div 
                key="saved"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex items-center gap-2 text-[9px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-50 px-3 py-1.5 rounded-full"
              >
                <CheckCircle2 className="w-3 h-3" />
                Intelligence Secured
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      {/* Editor Body */}
      <div className="bg-white border border-slate-100 rounded-[2.5rem] shadow-sm flex flex-col min-h-[700px] overflow-hidden">
        {/* Formatting Toolbar */}
        <div className="p-4 border-b border-slate-50 flex flex-wrap items-center gap-1.5 bg-slate-50/30 sticky top-0 z-10">
          <ToolbarButton 
            onClick={() => editor?.chain().focus().toggleBold().run()}
            active={editor?.isActive('bold')}
            icon={Bold}
          />
          <ToolbarButton 
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            active={editor?.isActive('italic')}
            icon={Italic}
          />
          <ToolbarButton 
            onClick={() => editor?.chain().focus().toggleUnderline().run()}
            active={editor?.isActive('underline')}
            icon={UnderlineIcon}
          />
          <div className="w-px h-6 bg-slate-200 mx-1.5 hidden sm:block"></div>
          <ToolbarButton 
            onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
            active={editor?.isActive('heading', { level: 1 })}
            icon={Heading1}
          />
          <ToolbarButton 
            onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
            active={editor?.isActive('heading', { level: 2 })}
            icon={Heading2}
          />
          <div className="w-px h-6 bg-slate-200 mx-1.5 hidden sm:block"></div>
          <ToolbarButton 
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            active={editor?.isActive('bulletList')}
            icon={List}
          />
          <ToolbarButton 
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            active={editor?.isActive('orderedList')}
            icon={ListOrdered}
          />
          <div className="w-px h-6 bg-slate-200 mx-1.5 hidden sm:block"></div>
          <ToolbarButton 
            onClick={addImage}
            icon={ImageIcon}
          />
        </div>

        {/* Content Area */}
        <div className="flex-1 p-8 md:p-12 space-y-8 overflow-y-auto custom-scrollbar">
          <input 
            type="text"
            value={title}
            onChange={handleTitleChange}
            placeholder="Insight Title"
            className="w-full text-4xl md:text-5xl font-black text-slate-900 tracking-tighter placeholder:text-slate-100 outline-none transition-all leading-tight"
          />
          <div className="border-t border-slate-50 pt-8">
             <EditorContent editor={editor} />
          </div>
        </div>

        {/* Context Sidebar Hint */}
        <div className="p-4 bg-slate-50 border-t border-slate-50 flex items-center justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest">
          <div className="flex items-center gap-2">
            <Library className="w-3.5 h-3.5" />
            Digital Economy Core • Data Mgmt
          </div>
          <div className="flex items-center gap-4">
             <span>Auto-save active</span>
             <span>Markdown supported</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ToolbarButton({ onClick, active, icon: Icon }: { onClick: () => void, active?: boolean, icon: any }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "p-2.5 rounded-xl transition-all border-2",
        active 
          ? "bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-200 scale-110" 
          : "bg-white text-slate-400 border-transparent hover:border-slate-100 hover:text-slate-900 shadow-sm"
      )}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}
