import React, { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { supabase } from '../../lib/supabase';
import { 
  X, 
  Upload, 
  Video, 
  FileText, 
  Image as ImageIcon, 
  FileCode, 
  File, 
  Loader2, 
  AlertCircle,
  Check, 
  Trash2,
  Paperclip
} from 'lucide-react';

export interface Attachment {
  id: string;
  lesson_id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size: number;
  created_at: string;
}

interface CreateLessonModalProps {
  onClose: () => void;
  onSave: (title: string, sequenceOrder: number, videoUrl: string, uploadedAttachments: Attachment[]) => Promise<any>;
  initialData?: {
    id: string;
    title: string;
    sequence_order: number;
    video_url?: string | null;
  } | null;
  selectedChapterId: string;
  uploadAsset: (file: File, bucketName?: string) => Promise<string | null>;
}

export default function CreateLessonModal({ 
  onClose, 
  onSave, 
  initialData, 
  selectedChapterId, 
  uploadAsset 
}: CreateLessonModalProps) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [sequenceOrder, setSequenceOrder] = useState<number>(initialData?.sequence_order || 1);
  const [videoUrl, setVideoUrl] = useState(initialData?.video_url || '');

  // Local drag and drop attachments list
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<Attachment[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);

  // Modal statuses
  const [isSaving, setIsSaving] = useState(false);
  const [errorLog, setErrorLog] = useState<string | null>(null);

  // Fetch existing attachments if editing an existing lesson
  useEffect(() => {
    if (initialData?.id) {
      const fetchAttachments = async () => {
        setLoadingAttachments(true);
        try {
          const { data, error } = await supabase
            .from('lesson_attachments')
            .select('*')
            .eq('lesson_id', initialData.id);

          if (error) throw error;
          setExistingAttachments(data || []);
        } catch (err: any) {
          console.error('Error fetching attachments:', err);
          setErrorLog('Failed to retrieve existing assets.');
        } finally {
          setLoadingAttachments(false);
        }
      };

      fetchAttachments();
    }
  }, [initialData]);

  // Hook up Drag and Drop via react-dropzone
  const onDrop = useCallback((acceptedFiles: File[]) => {
    setPendingFiles((prev) => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': [],
      'application/pdf': [],
      'application/msword': [],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [],
      'application/vnd.ms-excel': [],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [],
      'text/plain': []
    }
  });

  const removePendingFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const deleteExistingAttachment = async (id: string) => {
    setErrorLog(null);
    try {
      const { error } = await supabase
        .from('lesson_attachments')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setExistingAttachments((prev) => prev.filter((item) => item.id !== id));
    } catch (err: any) {
      console.error('Error deleting attachment:', err);
      setErrorLog('Failed to remove asset from database.');
    }
  };

  const getFileIcon = (fileType: string) => {
    const type = fileType.toLowerCase();
    if (type.includes('image')) return ImageIcon;
    if (type.includes('pdf')) return FileCode;
    if (type.includes('word') || type.includes('doc') || type.includes('text') || type.includes('txt')) return FileText;
    return File;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSaving) return;

    setIsSaving(true);
    setErrorLog(null);

    try {
      // 1. Create or update the lesson record first
      let lessonId = initialData?.id || '';

      if (initialData?.id) {
        // Mode: UPDATE Lesson
        const { data, error } = await supabase
          .from('lessons')
          .update({
            title,
            sequence_order: sequenceOrder,
            video_url: videoUrl || null
          })
          .eq('id', initialData.id)
          .select()
          .single();

        if (error) throw error;
        lessonId = data.id;
      } else {
        // Mode: CREATE Lesson
        const { data, error } = await supabase
          .from('lessons')
          .insert({
            chapter_id: selectedChapterId,
            title,
            sequence_order: sequenceOrder,
            video_url: videoUrl || null
          })
          .select()
          .single();

        if (error) throw error;
        lessonId = data.id;
      }

      // 2. Loop and upload all pending files to standard public bucket lesson_assets (or note_images fallback)
      const newAttachments: Attachment[] = [];
      for (const file of pendingFiles) {
        // Upload each file using standard useAdminData.uploadAsset hook
        const uploadedUrl = await uploadAsset(file, 'lesson_assets');
        if (!uploadedUrl) {
          throw new Error(`Failed to upload asset: ${file.name}`);
        }

        // Determine file category group type
        let categoryType = 'file';
        if (file.type.includes('image')) categoryType = 'image';
        else if (file.type.includes('pdf')) categoryType = 'pdf';
        else if (file.type.includes('word') || file.type.includes('document')) categoryType = 'document';

        // Insert metadata row to lesson_attachments
        const { data: attachData, error: attachError } = await supabase
          .from('lesson_attachments')
          .insert({
            lesson_id: lessonId,
            file_url: uploadedUrl,
            file_name: file.name,
            file_type: categoryType,
            file_size: file.size
          })
          .select()
          .single();

        if (attachError) throw attachError;
        newAttachments.push(attachData);
      }

      // Call original callback with complete results
      await onSave(title, sequenceOrder, videoUrl, [...existingAttachments, ...newAttachments]);
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorLog(err.message || 'Error occurred while saving lesson properties.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 w-full max-w-xl shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-xl text-slate-500 hover:text-white hover:bg-slate-800/50 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-black text-white tracking-tight mb-1">
          {initialData ? 'Update Curriculum Lesson' : 'Create New Lesson'}
        </h2>
        <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-6">
          LESSON ATTRIBUTES, INTEGRITY & DIGITAL ASSETS
        </p>

        {errorLog && (
          <div className="mb-4 p-3 bg-red-950/40 border border-red-900/30 rounded-xl flex gap-2 items-start text-xs text-rose-450 font-bold">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{errorLog}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Lesson Title *</label>
              <input 
                type="text" 
                required 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Quantum Physics Foundations"
                className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 py-3 px-4 rounded-xl outline-none focus:border-indigo-500 text-xs font-bold transition-all text-white placeholder:text-slate-650"
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Sequence order *</label>
              <input 
                type="number" 
                required 
                min={1}
                value={sequenceOrder}
                onChange={(e) => setSequenceOrder(parseInt(e.target.value) || 1)}
                className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 py-3 px-4 rounded-xl outline-none focus:border-indigo-500 text-xs font-mono font-bold transition-all text-white"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 flex items-center gap-1.5">
              <Video className="w-3.5 h-3.5 text-indigo-400" />
              External Video URL (YouTube/Vimeo)
            </label>
            <input 
              type="url" 
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="e.g., https://www.youtube.com/watch?v=dQw4w9WgXcQ"
              className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 py-3 px-4 rounded-xl outline-none focus:border-indigo-500 text-xs font-bold transition-all text-white placeholder:text-slate-650"
            />
            <p className="text-[9px] text-slate-500 mt-1 uppercase font-bold">Recommended instead of raw videos to minimize payload sizes and user latency.</p>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 flex items-center gap-1.5">
              <Paperclip className="w-3.5 h-3.5 text-indigo-400" />
              Lesson Digital Resources & Attachments
            </label>

            {/* Drag & Drop Zone */}
            <div 
              {...getRootProps()} 
              className={`border-2 border-dashed rounded-3xl p-6 text-center cursor-pointer transition-all duration-150 ${
                isDragActive 
                  ? 'border-indigo-500 bg-indigo-950/20 text-white' 
                  : 'border-slate-800 hover:border-slate-750 bg-slate-950/40 text-slate-450 hover:bg-slate-950/60'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className={`w-8 h-8 mx-auto mb-2 transition-transform duration-150 ${isDragActive ? 'scale-110 text-indigo-400' : 'text-slate-500'}`} />
              <p className="text-xs font-bold">Drag & drop files here, or <span className="text-indigo-450">browse files</span></p>
              <p className="text-[9px] text-slate-550 uppercase tracking-wider mt-1 font-black">SUPPORTED: PDF, WordDocs, Spreadsheets, Images</p>
            </div>

            {/* List of Loaded/Pending Attachments */}
            {(loadingAttachments || pendingFiles.length > 0 || existingAttachments.length > 0) && (
              <div className="mt-4 space-y-2 max-h-48 overflow-y-auto pr-1">
                <p className="text-[9px] font-black text-slate-450 uppercase tracking-wider">Loaded resources ({existingAttachments.length + pendingFiles.length})</p>
                
                {loadingAttachments && (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                  </div>
                )}

                {/* Existing Database Attachments */}
                {existingAttachments.map((item) => {
                  const Icon = getFileIcon(item.file_type);
                  return (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-slate-950 border border-slate-850 rounded-2xl group transition-all hover:bg-slate-950/80">
                      <div className="flex items-center gap-3 min-w-0">
                        <Icon className="w-5 h-5 text-indigo-400 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">{item.file_name}</p>
                          <p className="text-[9px] text-slate-500 font-black uppercase tracking-wider">{formatBytes(item.file_size)} • Saved in cloud</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteExistingAttachment(item.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-500 hover:bg-rose-950/40 border border-transparent hover:border-rose-900/30 transition-all shrink-0"
                        title="Delete resource"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}

                {/* Newly Dropped Pending Files */}
                {pendingFiles.map((file, idx) => {
                  const Icon = getFileIcon(file.type);
                  return (
                    <div key={idx} className="flex items-center justify-between p-3 bg-indigo-950/10 border border-indigo-900/20 rounded-2xl group transition-all hover:bg-indigo-950/25">
                      <div className="flex items-center gap-3 min-w-0">
                        <Icon className="w-5 h-5 text-indigo-400 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">{file.name}</p>
                          <p className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider">{formatBytes(file.size)} • Ready to upload</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removePendingFile(idx)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-500 hover:bg-rose-950/40 border border-transparent hover:border-rose-900/30 transition-all shrink-0"
                        title="Remove file"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex gap-3 justify-end pt-3 border-t border-slate-800/50">
            <button 
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-5 py-3.5 hover:text-white text-slate-400 text-[10px] font-black uppercase tracking-wider transition-colors disabled:opacity-50"
            >
              Discard
            </button>
            <button 
              type="submit"
              disabled={isSaving}
              className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Uploading Assets...
                </>
              ) : (
                'Save Lesson'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
