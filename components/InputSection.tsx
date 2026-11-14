'use client';

import React, { useRef, useState } from 'react';
import {
  Search,
  Clipboard,
  Image as ImageIcon,
  Video as VideoIcon,
  Link as LinkIcon,
  X,
  FileText,
  AlertCircle,
  Upload,
} from 'lucide-react';
import { Language, translations } from '@/lib/i18n';

interface VideoMetaPayload {
  duration: number;
  frames: Array<{ seconds: number; thumbnail: string }>;
}

interface InputSectionProps {
  onVerify: (data: {
    inputContent: string;
    inputType: 'text' | 'url' | 'image' | 'video';
    imageBase64?: string;
    imageMime?: string;
    videoMeta?: VideoMetaPayload;
  }) => void;
  isLoading: boolean;
  lang: Language;
}

async function extractVideoKeyframes(objectUrl: string): Promise<VideoMetaPayload> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.src = objectUrl;

    const cleanup = () => {
      video.removeAttribute('src');
      video.load();
    };

    const timeoutId = setTimeout(() => {
      cleanup();
      resolve({ duration: 20, frames: [] });
    }, 8000);

    video.onloadedmetadata = async () => {
      const duration = isFinite(video.duration) && video.duration > 0 ? Math.round(video.duration) : 20;
      const samplePoints = Array.from(
        new Set([0, Math.floor(duration * 0.25), Math.floor(duration * 0.5), Math.floor(duration * 0.75)])
      ).filter((s) => s >= 0 && s <= duration);

      const frames: Array<{ seconds: number; thumbnail: string }> = [];
      const canvas = document.createElement('canvas');
      const targetWidth = Math.min(640, video.videoWidth || 640);
      const scale = video.videoWidth ? targetWidth / video.videoWidth : 1;
      canvas.width = targetWidth;
      canvas.height = Math.max(180, Math.round((video.videoHeight || 360) * scale));
      const ctx = canvas.getContext('2d');

      for (const sec of samplePoints) {
        try {
          await new Promise<void>((seekResolve) => {
            const onSeeked = () => {
              video.removeEventListener('seeked', onSeeked);
              seekResolve();
            };
            video.addEventListener('seeked', onSeeked, { once: true });
            video.currentTime = Math.min(sec, Math.max(0, duration - 0.1));
            setTimeout(seekResolve, 1200);
          });
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            frames.push({ seconds: sec, thumbnail: canvas.toDataURL('image/jpeg', 0.78) });
          }
        } catch {}
      }

      clearTimeout(timeoutId);
      cleanup();
      resolve({ duration, frames });
    };

    video.onerror = () => {
      clearTimeout(timeoutId);
      cleanup();
      resolve({ duration: 20, frames: [] });
    };
  });
}

export const InputSection: React.FC<InputSectionProps> = ({ onVerify, isLoading, lang }) => {
  const t = translations[lang];
  const [activeTab, setActiveTab] = useState<'text' | 'url' | 'image' | 'video'>('text');
  const [content, setContent] = useState('');
  const [mediaPreview, setMediaPreview] = useState<{
    url: string;
    type: 'image' | 'video';
    base64?: string;
    mime?: string;
    videoMeta?: VideoMetaPayload;
    name: string;
  } | null>(null);
  const [isSamplingVideo, setIsSamplingVideo] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleFile = async (file: File) => {
    setErrorMsg(null);
    if (file.size > 50 * 1024 * 1024) {
      setErrorMsg(lang === 'ar' ? 'حجم الملف كبير جداً (الحد الأقصى 50 ميجابايت).' : 'File is too large (max 50MB).');
      return;
    }

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
      setErrorMsg(
        lang === 'ar'
          ? 'نوع الملف غير مدعوم. يرجى رفع صورة (PNG, JPG, WebP) أو فيديو (MP4, WebM).'
          : 'Unsupported file type. Please upload an image or video.'
      );
      return;
    }

    if (mediaPreview?.url) {
      URL.revokeObjectURL(mediaPreview.url);
    }

    const objectUrl = URL.createObjectURL(file);

    if (isVideo) {
      setActiveTab('video');
      setIsSamplingVideo(true);
      setMediaPreview({
        url: objectUrl,
        type: 'video',
        mime: file.type,
        name: file.name,
      });
      const videoMeta = await extractVideoKeyframes(objectUrl);
      setMediaPreview({
        url: objectUrl,
        type: 'video',
        mime: file.type,
        videoMeta,
        name: file.name,
      });
      setIsSamplingVideo(false);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setMediaPreview({
        url: objectUrl,
        type: 'image',
        base64,
        mime: file.type,
        name: file.name,
      });
      setActiveTab('image');
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleClipboard = async () => {
    setErrorMsg(null);
    try {
      if (!navigator.clipboard) {
        setErrorMsg(lang === 'ar' ? 'المتصفح لا يدعم قراءة الحافظة مباشرة.' : 'Browser clipboard API not supported.');
        return;
      }

      // Check if image is in clipboard
      try {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          const imageType = item.types.find((t) => t.startsWith('image/'));
          if (imageType) {
            const blob = await item.getType(imageType);
            const file = new File([blob], 'clipboard-image.png', { type: imageType });
            handleFile(file);
            return;
          }
        }
      } catch {}

      const text = await navigator.clipboard.readText();
      if (text) {
        setContent(text);
        if (text.startsWith('http://') || text.startsWith('https://')) {
          setActiveTab('url');
        } else {
          setActiveTab('text');
        }
      } else {
        setErrorMsg(lang === 'ar' ? 'الحافظة فارغة أو لا يمكن قراءتها.' : 'Clipboard is empty.');
      }
    } catch {
      setErrorMsg(lang === 'ar' ? 'يرجى لصق المحتوى يدوياً في خانة الإدخال.' : 'Please paste content manually.');
    }
  };

  const handleSubmit = () => {
    setErrorMsg(null);
    const clean = content.trim();

    if (!clean && !mediaPreview) {
      setErrorMsg(lang === 'ar' ? 'يرجى تقديم نص أو رابط أو وسائط للفحص.' : 'Please enter text, a URL, or media.');
      return;
    }

    if (mediaPreview) {
      if (mediaPreview.type === 'video') {
        onVerify({
          inputContent: clean,
          inputType: 'video',
          videoMeta: mediaPreview.videoMeta,
        });
      } else {
        onVerify({
          inputContent: clean,
          inputType: 'image',
          imageBase64: mediaPreview.base64,
          imageMime: mediaPreview.mime,
        });
      }
    } else {
      const isUrl = clean.startsWith('http://') || clean.startsWith('https://');
      onVerify({
        inputContent: clean,
        inputType: isUrl ? 'url' : 'text',
      });
    }
  };

  const clearMedia = () => {
    if (mediaPreview?.url) {
      URL.revokeObjectURL(mediaPreview.url);
    }
    setMediaPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="w-full max-w-4xl mx-auto overflow-hidden">
      {/* Editorial Search & Ingestion Card */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        className={`rounded-lg bg-white dark:bg-[#151619] border transition-all duration-150 p-3 sm:p-5 shadow-xs w-full max-w-full ${
          dragActive
            ? 'border-slate-900 dark:border-zinc-200 ring-2 ring-slate-900/10 dark:ring-zinc-100/10'
            : 'border-slate-300 dark:border-zinc-800'
        }`}
      >
        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFile(e.target.files[0]);
            }
          }}
        />

        {/* Responsive Segmented Tabs (Grid 4-cols: 100% mobile fit) */}
        <div className="grid grid-cols-4 gap-1 sm:gap-1.5 mb-3 pb-2.5 border-b border-slate-100 dark:border-zinc-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setActiveTab('text');
              textareaRef.current?.focus();
            }}
            className={`flex items-center justify-center gap-1 py-1.5 px-1 sm:px-2 rounded-md transition-colors text-center truncate ${
              activeTab === 'text'
                ? 'bg-slate-900 text-white dark:bg-zinc-100 dark:text-slate-950'
                : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
            }`}
          >
            <FileText className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{lang === 'ar' ? 'نص' : 'Text'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('url');
              textareaRef.current?.focus();
            }}
            className={`flex items-center justify-center gap-1 py-1.5 px-1 sm:px-2 rounded-md transition-colors text-center truncate ${
              activeTab === 'url'
                ? 'bg-slate-900 text-white dark:bg-zinc-100 dark:text-slate-950'
                : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
            }`}
          >
            <LinkIcon className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{lang === 'ar' ? 'رابط' : 'Link'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('image');
              fileInputRef.current?.click();
            }}
            className={`flex items-center justify-center gap-1 py-1.5 px-1 sm:px-2 rounded-md transition-colors text-center truncate ${
              activeTab === 'image'
                ? 'bg-slate-900 text-white dark:bg-zinc-100 dark:text-slate-950'
                : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
            }`}
          >
            <ImageIcon className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{lang === 'ar' ? 'صورة' : 'Photo'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('video');
              fileInputRef.current?.click();
            }}
            className={`flex items-center justify-center gap-1 py-1.5 px-1 sm:px-2 rounded-md transition-colors text-center truncate ${
              activeTab === 'video'
                ? 'bg-slate-900 text-white dark:bg-zinc-100 dark:text-slate-950'
                : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
            }`}
          >
            <VideoIcon className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{lang === 'ar' ? 'فيديو' : 'Video'}</span>
          </button>
        </div>

        {/* Text Area */}
        <div className="relative">
          <textarea
            ref={textareaRef}
            rows={4}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t.inputPlaceholder}
            className="w-full bg-slate-50 dark:bg-[#0f1012] text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 rounded-md p-3 text-xs sm:text-sm border border-slate-200 dark:border-zinc-800 focus:outline-none focus:border-slate-900 dark:focus:border-zinc-300 transition-all resize-none font-sans leading-relaxed"
          />

          {content && (
            <button
              onClick={() => setContent('')}
              className="absolute top-2 left-2 [dir=rtl]:left-2 [dir=rtl]:right-auto [dir=ltr]:right-2 p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 bg-slate-200/60 dark:bg-zinc-800 transition-colors"
              title={t.clearText}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Media Preview (if file uploaded) */}
        {mediaPreview && (
          <div className="mt-2.5 p-2 bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-md flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 overflow-hidden">
              {mediaPreview.type === 'image' ? (
                <img
                  src={mediaPreview.url}
                  alt="Media preview"
                  className="h-10 w-10 object-cover rounded border border-slate-300 dark:border-zinc-700 shrink-0"
                />
              ) : (
                <video
                  src={mediaPreview.url}
                  className="h-10 w-14 object-cover rounded border border-slate-300 dark:border-zinc-700 bg-black shrink-0"
                />
              )}
              <div className="truncate">
                <p className="text-xs font-bold text-slate-800 dark:text-zinc-200 truncate">{mediaPreview.name}</p>
                <p className="text-[10px] text-slate-500 dark:text-zinc-400">
                  {mediaPreview.type === 'image'
                    ? lang === 'ar'
                      ? 'تم تحميل الصورة للفحص الفني والـ OCR'
                      : 'Image loaded for forensics & OCR'
                    : isSamplingVideo
                    ? lang === 'ar'
                      ? 'جاري استخراج اللقطات الزمنية من الفيديو...'
                      : 'Sampling video keyframes...'
                    : lang === 'ar'
                    ? `تم استخراج ${mediaPreview.videoMeta?.frames.length || 0} لقطات للفحص (${mediaPreview.videoMeta?.duration || 20}ث)`
                    : `Sampled ${mediaPreview.videoMeta?.frames.length || 0} keyframes (${mediaPreview.videoMeta?.duration || 20}s)`}
                </p>
              </div>
            </div>
            <button
              onClick={clearMedia}
              className="p-1 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 rounded shrink-0"
              title="Remove"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="mt-2.5 p-2 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-md flex items-center gap-2 text-rose-700 dark:text-rose-400 text-xs">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Actions Toolbar (Responsive Stack / Row) */}
        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-zinc-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleClipboard}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-md text-slate-700 dark:text-zinc-300 bg-slate-100 dark:bg-zinc-900 hover:bg-slate-200 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 transition-colors"
            >
              <Clipboard className="h-3.5 w-3.5 text-slate-600 dark:text-zinc-400" />
              <span>{t.clipboardBtn}</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-md text-slate-700 dark:text-zinc-300 bg-slate-100 dark:bg-zinc-900 hover:bg-slate-200 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 transition-colors"
            >
              <Upload className="h-3.5 w-3.5 text-slate-600 dark:text-zinc-400" />
              <span>{lang === 'ar' ? 'رفع ملف' : 'Upload File'}</span>
            </button>
          </div>

          {/* Primary Action Button */}
          <button
            type="button"
            disabled={isLoading || isSamplingVideo}
            onClick={handleSubmit}
            className={`w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-md font-bold text-xs sm:text-sm text-white transition-all ${
              isLoading
                ? 'bg-slate-700 cursor-not-allowed opacity-80'
                : 'bg-slate-900 dark:bg-zinc-100 dark:text-slate-950 hover:bg-slate-800 dark:hover:bg-white shadow-xs'
            }`}
          >
            {isLoading ? (
              <>
                <div className="h-3.5 w-3.5 border-2 border-white/30 dark:border-slate-900/30 border-t-white dark:border-t-slate-900 rounded-full animate-spin" />
                <span>{t.verifyingBtn}</span>
              </>
            ) : (
              <>
                <Search className="h-3.5 w-3.5" />
                <span>{t.verifyBtn}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
