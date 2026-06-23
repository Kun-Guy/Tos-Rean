import React, { useState, useEffect, useCallback } from 'react';
import Cropper, { Point, Area } from 'react-easy-crop';
import { 
  X, 
  Upload, 
  Link, 
  Check, 
  AlertCircle, 
  Loader2, 
  Flame, 
  Image as ImageIcon,
  ZoomIn,
  Move
} from 'lucide-react';

interface CreateMajorFormProps {
  onClose: () => void;
  onSave: (title: string, description: string, imageUrl: string) => Promise<any>;
  initialData?: {
    id?: string;
    title: string;
    description: string;
    cover_image_url: string;
  } | null;
  uploadAsset: (file: File, bucketName?: string) => Promise<string | null>;
}

// Helper to cache-bust URLs for canvas to bypass cached non-CORS responses
export const getCORSFriendlyUrl = (url: string): string => {
  if (!url || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }
  try {
    const parsed = new URL(url);
    parsed.searchParams.set('cors_cb', Date.now().toString());
    return parsed.toString();
  } catch {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}cors_cb=${Date.now()}`;
  }
};

// Helper to load image and check aspect/CORS compatibility
export const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', () => {
      reject(new Error('This image could not be loaded. Please verify the URL or try uploading a local file, as CORS restriction on this domain may prevent image manipulation.'));
    });
    if (!url.startsWith('data:') && !url.startsWith('blob:')) {
      image.setAttribute('crossOrigin', 'anonymous'); // Essential for CORS bypass on Canvas
      image.src = getCORSFriendlyUrl(url);
    } else {
      image.src = url;
    }
  });

// Canvas Cropping Utility Function
export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  rotation = 0
): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('No 2d context available');
  }

  // Calculate coordinates relative to canvas center
  const bBoxWidth = image.width;
  const bBoxHeight = image.height;

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  // Draw cropped image onto the canvas
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Canvas is empty'));
          return;
        }
        resolve(blob);
      },
      'image/jpeg',
      0.9
    );
  });
}

export default function CreateMajorForm({ onClose, onSave, initialData, uploadAsset }: CreateMajorFormProps) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [imageUrl, setImageUrl] = useState(initialData?.cover_image_url || '');

  // Image source state before crop
  const [srcImage, setSrcImage] = useState<string | null>(null);
  const [isCropOpen, setIsCropOpen] = useState(false);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [aspect, setAspect] = useState<number>(21 / 9); // default banner layout ratio
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  // Status & Error indicators
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorLog, setErrorLog] = useState<string | null>(null);

  // Validate URL pasted by user
  const validateAndProcessUrl = async (url: string) => {
    if (!url) return;
    setErrorLog(null);
    try {
      // Basic check
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        throw new Error('Image URL must start with http:// or https://');
      }
      setProcessing(true);
      // Try to load image to test CORS / validity
      await createImage(url);
      setSrcImage(url);
      setIsCropOpen(true);
    } catch (err: any) {
      console.error(err);
      setErrorLog(
        err.message?.includes('CORS') 
          ? 'CORS error: This domain does not allow canvas image manipulation. Please select another URL or upload a file.'
          : 'Failed to load specified image. Ensure the url is valid and fully secure (HTTPS).'
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleUrlInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setImageUrl(val);
    if (val.match(/\.(jpeg|jpg|gif|png|webp)/i) || val.includes('unsplash.com')) {
      validateAndProcessUrl(val);
    }
  };

  // Upload local files
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
  };

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const applyCrop = async () => {
    if (!srcImage || !croppedAreaPixels) return;

    setProcessing(true);
    setErrorLog(null);
    try {
      const croppedBlob = await getCroppedImg(srcImage, croppedAreaPixels);
      const croppedFile = new File([croppedBlob], `cropped-major-${Date.now()}.jpg`, {
        type: 'image/jpeg',
      });

      // Upload newly cropped Blob to Supabase bucket
      const uploadedUrl = await uploadAsset(croppedFile, 'note_images');
      if (!uploadedUrl) {
        throw new Error('Supabase storage upload returned empty public URL');
      }

      setImageUrl(uploadedUrl);
      setIsCropOpen(false);
      setSrcImage(null);
    } catch (err: any) {
      console.error(err);
      setErrorLog(err.message || 'Error occurred while generating the cropped image banner.');
    } finally {
      setProcessing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || saving) return;

    setSaving(true);
    setErrorLog(null);
    try {
      await onSave(title, description, imageUrl);
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorLog(err.message || 'Failed to submit properties.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl relative">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-xl text-slate-500 hover:text-white hover:bg-slate-800/50 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-black text-white tracking-tight mb-1">
          {initialData ? 'Update Academy Major' : 'Create New Major'}
        </h2>
        <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-6">
          MAJORS PROPERTIES SPECIFICATION
        </p>

        {errorLog && (
          <div className="mb-4 p-3 bg-red-950/40 border border-red-900/30 rounded-xl flex gap-2 items-start text-xs text-rose-400 font-bold">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{errorLog}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Identifier Title *</label>
            <input 
              type="text" 
              required 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Computer Science & Software Systems"
              className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 py-3 px-4 rounded-xl outline-none focus:border-indigo-500 text-xs font-bold transition-all text-white placeholder:text-slate-650"
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Narrative Description</label>
            <textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="High-level syllabus outline for enrollment students..."
              rows={3}
              className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 py-3 px-4 rounded-xl outline-none focus:border-indigo-500 text-xs font-bold transition-all text-white placeholder:text-slate-650 resize-none"
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Cover Header Image</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input 
                  type="text" 
                  value={imageUrl}
                  onChange={handleUrlInputChange}
                  placeholder="Paste URL or upload image"
                  className="w-full bg-slate-950 border border-slate-800 py-3 pl-10 pr-4 rounded-xl outline-none text-xs font-bold text-white placeholder:text-slate-650"
                />
                <Link className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              </div>
              <label className="p-3 bg-slate-800 border border-slate-750 hover:bg-slate-700 hover:border-slate-600 rounded-xl cursor-pointer text-slate-300 transition-colors shrink-0 flex items-center">
                {processing ? <Loader2 className="w-4 h-4 animate-spin text-indigo-400" /> : <Upload className="w-4 h-4" />}
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={processing} />
              </label>
            </div>
            {imageUrl && !isCropOpen && (
              <div className="mt-3 group relative h-28 rounded-2xl overflow-hidden border border-slate-800">
                <img src={imageUrl} alt="Cover preview" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      setSrcImage(imageUrl);
                      setIsCropOpen(true);
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all"
                  >
                    <Move className="w-3.5 h-3.5" />
                    Re-crop
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <button 
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-5 py-3.5 hover:text-white text-slate-400 text-[10px] font-black uppercase tracking-wider transition-colors disabled:opacity-50"
            >
              Discard
            </button>
            <button 
              type="submit"
              disabled={saving || processing}
              className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Major'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* --- CROP MODAL OVERLAY --- */}
      {isCropOpen && srcImage && (
        <div className="fixed inset-0 bg-slate-950/95 z-[150] flex flex-col justify-between p-6 md:p-8 animate-fade-in">
          <div className="max-w-4xl mx-auto w-full flex items-center justify-between">
            <div>
              <h3 className="text-xl font-black text-white tracking-tight">Crop Major Banner</h3>
              <p className="text-[10px] font-black text-indigo-450 uppercase tracking-wider">Configure precise alignment and coverage</p>
            </div>
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1.5 rounded-2xl">
              <button 
                onClick={() => setAspect(21 / 9)}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black transition-all uppercase tracking-wider ${aspect === 21 / 9 ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
              >
                21:9 Banner
              </button>
              <button 
                onClick={() => setAspect(16 / 9)}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black transition-all uppercase tracking-wider ${aspect === 16 / 9 ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
              >
                16:9 Standard
              </button>
            </div>
          </div>

          <div className="relative w-full max-w-4xl h-[55vh] md:h-[60vh] mx-auto bg-slate-900 rounded-[2.5rem] overflow-hidden border border-slate-800 shadow-2xl mt-4 mb-4">
            <Cropper
              image={getCORSFriendlyUrl(srcImage)}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              onCropChange={setCrop}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
              classes={{
                containerClassName: 'bg-slate-950',
                mediaClassName: 'max-h-full max-w-full',
              }}
            />
          </div>

          <div className="max-w-xl mx-auto w-full bg-slate-900 border border-slate-800 p-6 rounded-[2rem] shadow-xl flex flex-col gap-4">
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
                className="w-full accent-indigo-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-xs font-mono text-slate-400 w-8 text-right font-black">{zoom.toFixed(1)}x</span>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button 
                type="button"
                onClick={() => {
                  setIsCropOpen(false);
                  setSrcImage(null);
                }}
                disabled={processing}
                className="px-5 py-3 hover:text-white text-slate-400 text-[10px] font-black uppercase tracking-wider transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={applyCrop}
                disabled={processing}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Cropping...
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Apply Crop & Save
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
