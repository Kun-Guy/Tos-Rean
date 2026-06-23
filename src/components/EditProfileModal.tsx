import React, { useState, useRef, useEffect, useCallback } from 'react';
import Cropper, { Point, Area } from 'react-easy-crop';
import { 
  Camera, 
  X, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  ZoomIn, 
  Check, 
  Link as LinkIcon 
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { getCORSFriendlyUrl, createImage, getCroppedImg } from '../pages/admin/CreateMajorForm';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function EditProfileModal({ isOpen, onClose }: EditProfileModalProps) {
  const { user, fullName, avatarUrl, refreshProfile } = useAuth();
  
  const [name, setName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  // URL Input for profile link pasting
  const [inputUrl, setInputUrl] = useState('');
  const [isProcessingUrl, setIsProcessingUrl] = useState(false);

  // Cropper specific state
  const [srcImage, setSrcImage] = useState<string | null>(null);
  const [isCropOpen, setIsCropOpen] = useState(false);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [errorLog, setErrorLog] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state with props when modal opens
  useEffect(() => {
    if (isOpen) {
      setName(fullName || user?.email?.split('@')[0] || '');
      setSelectedFile(null);
      setPreviewUrl(null);
      setSrcImage(null);
      setIsCropOpen(false);
      setInputUrl('');
      setErrorLog(null);
      setToast(null);
    }
  }, [isOpen, fullName, user]);

  // Handle local image file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setErrorLog(null);
      const reader = new FileReader();
      reader.onload = () => {
        setSrcImage(reader.result as string);
        setIsCropOpen(true);
      };
      reader.onerror = () => {
        setErrorLog('Failed to read selected local file.');
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle image URL pasting and pre-load/pre-validate
  const handleUrlChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputUrl(val);

    if (val.match(/\.(jpeg|jpg|gif|png|webp)/i) || val.includes('unsplash.com') || val.includes('lh3.googleusercontent.com')) {
      setErrorLog(null);
      try {
        setIsProcessingUrl(true);
        await createImage(val);
        setSrcImage(val);
        setIsCropOpen(true);
      } catch (err: any) {
        console.error(err);
        setErrorLog(
          err.message?.includes('CORS') 
            ? 'CORS restriction on this domain. Please upload a local file or choose another link.'
            : 'Unstable image URL. Verify description link is HTTPS and live.'
        );
      } finally {
        setIsProcessingUrl(false);
      }
    }
  };

  const triggerFilePicker = () => {
    fileInputRef.current?.click();
  };

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  // Generates cropped Blob and updates preview state
  const applyCrop = async () => {
    if (!srcImage || !croppedAreaPixels) return;

    setIsProcessingUrl(true);
    setErrorLog(null);
    try {
      const croppedBlob = await getCroppedImg(srcImage, croppedAreaPixels);
      const fileExt = srcImage.startsWith('data:') ? 'jpg' : srcImage.split('.').pop()?.split('?')[0] || 'jpg';
      const croppedFile = new File([croppedBlob], `avatar-${Date.now()}.${fileExt}`, {
        type: 'image/jpeg',
      });

      setSelectedFile(croppedFile);
      setPreviewUrl(URL.createObjectURL(croppedBlob));
      setIsCropOpen(false);
      setSrcImage(null);
      setInputUrl('');
    } catch (err: any) {
      console.error(err);
      setErrorLog(err.message || 'Error occurred while creating crop file.');
    } finally {
      setIsProcessingUrl(false);
    }
  };

  // Perform Final Database profile state storage
  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!name.trim()) {
      showToast('error', 'Profile name cannot be empty');
      return;
    }

    setIsSaving(true);
    setErrorLog(null);
    try {
      let finalAvatarUrl = avatarUrl;

      // 1. Upload avatar if a cropped file exists in local memory
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop() || 'png';
        const timestamp = Date.now();
        let uploadBucket = 'avatars';
        let filePath = `${user.id}/${timestamp}-avatar.${fileExt}`;

        // Attempt direct upload to avatars bucket
        const { error: uploadError } = await supabase.storage
          .from(uploadBucket)
          .upload(filePath, selectedFile, {
            cacheControl: '3600',
            upsert: true,
          });

        if (uploadError) {
          console.warn('Avatars upload bucket failed, trying fallback to note_images:', uploadError);
          uploadBucket = 'note_images';
          filePath = `avatars/${user.id}/${timestamp}-avatar.${fileExt}`;
          
          const { error: fallbackUploadError } = await supabase.storage
            .from(uploadBucket)
            .upload(filePath, selectedFile, {
              cacheControl: '3605',
              upsert: true,
            });

          if (fallbackUploadError) {
            throw new Error(`Failed to upload profile picture: ${fallbackUploadError.message}`);
          }
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from(uploadBucket)
          .getPublicUrl(filePath);

        finalAvatarUrl = publicUrl;
      }

      // 2. Update users profile in custom public.users database table
      const { error: updateDbError } = await supabase
        .from('users')
        .update({
          full_name: name.trim(),
          avatar_url: finalAvatarUrl,
        })
        .eq('id', user.id);

      if (updateDbError) {
        throw new Error(`Database direct profile update failed: ${updateDbError.message}`);
      }

      // 3. Update auth metadata to keep auth token in sync (best practice)
      const { error: updateAuthError } = await supabase.auth.updateUser({
        data: {
          full_name: name.trim(),
          avatar_url: finalAvatarUrl,
        }
      });

      if (updateAuthError) {
        console.warn('Syncing auth session metadata failed, proceeding since DB updated successfully:', updateAuthError);
      }

      // 4. Update local state and trigger app-wide layout sync
      await refreshProfile();
      
      showToast('success', 'Profile updated successfully!');
      setTimeout(() => {
        onClose();
      }, 1000);

    } catch (err: any) {
      console.error('Error saving profile changes:', err);
      showToast('error', err.message || 'Error occurred while saving profile');
    } finally {
      setIsSaving(false);
    }
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          key="edit-profile-modal-root"
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
        >
          {/* Backdrop Click */}
          <div className="absolute inset-0" onClick={isSaving || isCropOpen ? undefined : onClose}></div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: 'spring', duration: 0.4 }}
          className="bg-white border border-slate-100 rounded-[2.5rem] p-8 md:p-10 w-full max-w-md shadow-2xl relative z-10 overflow-hidden"
          id="edit-profile-modal-container"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tighter" id="edit-profile-header-title">
                Edit Profile
              </h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                Personal Settings
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={isSaving}
              className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-900 rounded-full transition-all border border-slate-100/50"
              id="edit-profile-close-btn"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {errorLog && (
            <div className="mb-4 p-3.5 bg-red-50 border border-red-100 rounded-2xl flex gap-2 items-start text-xs text-red-700 font-semibold">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-500" />
              <span>{errorLog}</span>
            </div>
          )}

          <form onSubmit={handleSaveChanges} className="space-y-8" id="edit-profile-form">
            {/* Avatar picker container */}
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="relative group">
                <button
                  type="button"
                  onClick={triggerFilePicker}
                  disabled={isSaving}
                  className="w-28 h-28 rounded-[2rem] bg-slate-100 border-4 border-white shadow-xl flex items-center justify-center text-3xl font-black text-blue-500 overflow-hidden relative transition-all group-hover:scale-[1.02] cursor-pointer"
                  style={{ minWidth: '7rem', minHeight: '7rem' }}
                  id="edit-profile-avatar-button"
                >
                  {previewUrl ? (
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    (fullName || user?.email)?.[0].toUpperCase()
                  )}

                  {/* Camera overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                    <Camera className="w-7 h-7" />
                  </div>
                </button>

                {/* Micro camera icon overlay badge */}
                <button
                  type="button"
                  onClick={triggerFilePicker}
                  disabled={isSaving}
                  className="absolute -bottom-1 -right-1 w-8 h-8 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center justify-center shadow-lg border border-white transition-transform active:scale-90"
                  id="edit-profile-small-camera-btn"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
                id="edit-profile-file-input"
              />

              <div className="text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Tap to upload profile picture
                </p>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-5">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                  Display name
                </label>
                <input
                  type="text"
                  required
                  disabled={isSaving}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your Full Name"
                  className="w-full bg-slate-50 border-2 border-slate-50 pl-4 pr-4 py-3.5 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-white outline-none text-xs font-bold transition-all text-slate-900 placeholder:text-slate-300"
                  id="edit-profile-name-input"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                  Paste Avatar Image Link
                </label>
                <div className="relative">
                  <input
                    type="text"
                    disabled={isSaving || isProcessingUrl}
                    value={inputUrl}
                    onChange={handleUrlChange}
                    placeholder="e.g., https://images.unsplash.com/your-photo"
                    className="w-full bg-slate-50 border-2 border-slate-50 pl-10 pr-4 py-3.5 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-white outline-none text-xs font-bold transition-all text-slate-900 placeholder:text-slate-300 truncate"
                    id="edit-profile-url-input"
                  />
                  <div className="absolute left-3.5 top-[15px] text-slate-450">
                    {isProcessingUrl ? (
                      <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                    ) : (
                      <LinkIcon className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                  Account Email
                </label>
                <div className="w-full bg-slate-50 border border-slate-100 px-4 py-3.5 rounded-2xl text-xs font-bold text-slate-400 select-none">
                  {user?.email}
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="flex-1 py-4 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-2xl font-black text-[11px] uppercase tracking-wider transition-all text-center border border-slate-100 active:scale-98"
                id="edit-profile-cancel-btn"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-[11px] uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-xl shadow-blue-200 active:scale-98 disabled:opacity-50 disabled:shadow-none"
                id="edit-profile-save-btn"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </form>

          {/* Toast Notification popup inside modal area (perfectly polished) */}
          <AnimatePresence>
            {toast && (
              <motion.div
                key="edit-profile-toast-animated"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 15 }}
                className={`absolute bottom-4 left-6 right-6 p-4 rounded-2xl flex items-center gap-3 border text-xs font-bold shadow-xl ${
                  toast.type === 'success'
                    ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
                    : 'bg-red-50 border-red-100 text-red-800'
                }`}
                id="edit-profile-toast-message"
              >
                {toast.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                )}
                <span>{toast.message}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* --- CROP MODAL OVERLAY --- */}
        <AnimatePresence>
          {isCropOpen && srcImage && (
            <motion.div 
              key="profile-crop-overlay-animated"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="fixed inset-0 bg-slate-950/95 z-[150] flex flex-col justify-between p-6 md:p-8" 
              id="profile_crop_overlay"
            >
              <div className="max-w-4xl mx-auto w-full flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-white tracking-tight">Crop Profile Image</h3>
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-wider">Perfect 1:1 circle selection</p>
                </div>
                <button 
                  type="button"
                  onClick={() => {
                    setIsCropOpen(false);
                    setSrcImage(null);
                    setInputUrl('');
                  }}
                  className="p-2.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-xl transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="relative w-full max-w-sm h-[40vh] md:h-[45vh] mx-auto bg-slate-900 rounded-[2rem] overflow-hidden border border-slate-800 shadow-2xl mt-4 mb-4">
                <Cropper
                  image={getCORSFriendlyUrl(srcImage)}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                  classes={{
                    containerClassName: 'bg-slate-950',
                    mediaClassName: 'max-h-full max-w-full',
                  }}
                />
              </div>

              <div className="max-w-sm mx-auto w-full bg-slate-900 border border-slate-800 p-6 rounded-[2rem] shadow-xl flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <ZoomIn className="w-4 h-4 text-indigo-400 shrink-0" />
                  <input
                    type="range"
                    value={zoom}
                    min={1}
                    max={3}
                    step={0.1}
                    aria-label="Zoom"
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="w-full accent-indigo-505 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="text-xs font-mono text-slate-400 w-8 text-right font-black">{zoom.toFixed(1)}x</span>
                </div>

                <div className="flex gap-3 justify-end pt-2">
                  <button 
                    type="button"
                    onClick={() => {
                      setIsCropOpen(false);
                      setSrcImage(null);
                      setInputUrl('');
                    }}
                    className="px-5 py-3 hover:text-white text-slate-400 text-[10px] font-black uppercase tracking-wider transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="button"
                    onClick={applyCrop}
                    className="px-6 py-3 bg-indigo-600 hover:bg-slate-950 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Apply Crop
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      )}
    </AnimatePresence>
  );
}
