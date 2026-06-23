import React, { useState, useEffect } from 'react';
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
  AlertCircle,
  Hash
} from 'lucide-react';
import { useAdminData, Slide } from '../../hooks/useAdminData';
import { cn } from '../../lib/utils';

interface AdminSlideEditorProps {
  slide: Slide;
  onBack: () => void;
  onSave: (updatedSlide: Slide) => void;
}

export default function AdminSlideEditor({ slide, onBack, onSave }: AdminSlideEditorProps) {
  const { updateSlide, uploadAsset, loading, error } = useAdminData();
  const [sequenceOrder, setSequenceOrder] = useState(slide.sequence_order);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveErrorMessage, setSaveErrorMessage] = useState('');

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({
        allowBase64: true,
        HTMLAttributes: {
          class: 'rounded-2xl shadow-xl max-w-full my-6 border border-slate-800'
        }
      }),
      Underline,
      Placeholder.configure({
        placeholder: 'Write structured, interactive slide material here...',
      }),
    ],
    content: slide.content,
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none focus:outline-none min-h-[450px] text-slate-300 leading-relaxed text-sm p-4',
      },
    },
  });

  // Sync content if slide changes
  useEffect(() => {
    if (editor && !editor.isDestroyed && slide) {
      editor.commands.setContent(slide.content);
      setSequenceOrder(slide.sequence_order);
    }
  }, [slide, editor]);

  const handleSave = async () => {
    if (!editor) return;
    setSaveStatus('saving');
    
    const htmlContent = editor.getHTML();
    const result = await updateSlide(slide.id, htmlContent, sequenceOrder);
    
    if (result) {
      setSaveStatus('saved');
      onSave(result);
      setTimeout(() => setSaveStatus('idle'), 3000);
    } else {
      setSaveStatus('error');
      setSaveErrorMessage(error || 'Failed to persist slide changes.');
    }
  };

  const handleImageUpload = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setSaveStatus('saving');
      const publicUrl = await uploadAsset(file, 'note_images');
      
      if (publicUrl && editor) {
        editor.chain().focus().setImage({ src: publicUrl }).run();
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        setSaveStatus('error');
        setSaveErrorMessage(error || 'Failed to upload image asset.');
      }
    };
    input.click();
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 p-6 rounded-[2rem]">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-all"
            title="Back to ladder"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
              Slide Editor
            </h2>
            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
              Editing slide identifier: {slide.id.split('-')[0]}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-center">
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            <Hash className="w-3.5 h-3.5 text-indigo-400" />
            <label className="text-[9px] font-black uppercase text-slate-400 mr-1">Slide Order:</label>
            <input 
              type="number" 
              value={sequenceOrder}
              onChange={(e) => setSequenceOrder(parseInt(e.target.value) || 1)}
              className="w-12 bg-transparent text-white font-mono text-xs focus:outline-none text-center"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saveStatus === 'saving'}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-indigo-900/40 active:scale-95 transition-all disabled:opacity-50"
          >
            {saveStatus === 'saving' ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                Commit Slide
              </>
            )}
          </button>
        </div>
      </div>

      {/* Editor Main Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden flex flex-col min-h-[600px] shadow-2xl relative">
        {/* Status indicator bar */}
        <div className="bg-slate-950 px-6 py-3 border-b border-slate-800/60 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
          <span>Formatted Rich Content</span>
          <div>
            {saveStatus === 'saving' && (
              <span className="text-indigo-400 flex items-center gap-1.5">
                <Loader2 className="w-3 h-3 animate-spin" />
                Syncing changes...
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3" />
                Cloud synched
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="text-red-400 flex items-center gap-1.5" title={saveErrorMessage}>
                <AlertCircle className="w-3 h-3" />
                Sync failed
              </span>
            )}
            {saveStatus === 'idle' && <span className="text-slate-600">Draft version</span>}
          </div>
        </div>

        {/* Toolbar */}
        <div className="p-4 bg-slate-950/40 border-b border-slate-800/80 flex flex-wrap items-center gap-1.5">
          <ToolbarButton 
            onClick={() => editor?.chain().focus().toggleBold().run()}
            active={editor?.isActive('bold')}
            icon={Bold}
            title="Bold"
          />
          <ToolbarButton 
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            active={editor?.isActive('italic')}
            icon={Italic}
            title="Italic"
          />
          <ToolbarButton 
            onClick={() => editor?.chain().focus().toggleUnderline().run()}
            active={editor?.isActive('underline')}
            icon={UnderlineIcon}
            title="Underline"
          />
          
          <div className="w-px h-6 bg-slate-800 mx-2"></div>
          
          <ToolbarButton 
            onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
            active={editor?.isActive('heading', { level: 1 })}
            icon={Heading1}
            title="Main Heading (H1)"
          />
          <ToolbarButton 
            onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
            active={editor?.isActive('heading', { level: 2 })}
            icon={Heading2}
            title="Sub Heading (H2)"
          />

          <div className="w-px h-6 bg-slate-800 mx-2"></div>

          <ToolbarButton 
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            active={editor?.isActive('bulletList')}
            icon={List}
            title="Bullet List"
          />
          <ToolbarButton 
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            active={editor?.isActive('orderedList')}
            icon={ListOrdered}
            title="Numbered List"
          />

          <div className="w-px h-6 bg-slate-800 mx-2"></div>

          <button
            onClick={handleImageUpload}
            className="p-2.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-400 hover:text-white hover:border-slate-700 transition-all shadow-sm"
            title="Embed Image"
          >
            <ImageIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Editable Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-900/60">
          <EditorContent editor={editor} />
        </div>

        <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center text-[9px] font-black uppercase tracking-widest text-slate-500 gap-2">
          <span>Markdown and Standard HTML embeds supported</span>
          <span>TipTap editor Active</span>
        </div>
      </div>
    </div>
  );
}

interface ToolbarButtonProps {
  onClick: () => void;
  active?: boolean;
  icon: any;
  title: string;
}

function ToolbarButton({ onClick, active, icon: Icon, title }: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        "p-2.5 rounded-xl transition-all border",
        active 
          ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-900/40 scale-105" 
          : "bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200 shadow-sm"
      )}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}
