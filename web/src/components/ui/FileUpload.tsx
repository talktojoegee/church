'use client';

import { useEffect, useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { uploadFile, assetUrl } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  label?: string;
  accept?: string;
  value?: string;
  onChange: (url: string) => void;
  hint?: string;
  /** Fired with a blob URL while a new image is uploading (cleared after). */
  onPreviewChange?: (previewUrl: string | null) => void;
  /** Show a thumbnail preview for image uploads. Defaults to true when accept includes "image". */
  preview?: boolean;
  previewClassName?: string;
}

export function FileUpload({
  label,
  accept,
  value,
  onChange,
  hint,
  onPreviewChange,
  preview,
  previewClassName,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  const showImagePreview = preview ?? Boolean(accept?.includes('image'));

  useEffect(() => {
    onPreviewChange?.(localPreview);
  }, [localPreview, onPreviewChange]);

  useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
    };
  }, [localPreview]);

  const clearLocalPreview = () => {
    if (localPreview) URL.revokeObjectURL(localPreview);
    setLocalPreview(null);
  };

  const handleFile = async (file: File) => {
    setError('');
    setUploading(true);
    if (showImagePreview && file.type.startsWith('image/')) {
      clearLocalPreview();
      setLocalPreview(URL.createObjectURL(file));
    }
    try {
      const res = await uploadFile(file);
      onChange(res.url);
    } catch (err: any) {
      const m = err?.response?.data?.message ?? 'Upload failed';
      setError(Array.isArray(m) ? m[0] : m);
      clearLocalPreview();
    } finally {
      setUploading(false);
    }
  };

  const previewSrc =
    localPreview ?? (showImagePreview && value ? assetUrl(value) : '');

  const remove = () => {
    clearLocalPreview();
    onChange('');
  };

  return (
    <div>
      {label && <p className="mb-1 text-sm font-medium text-slate-700">{label}</p>}
      <div className="flex items-start gap-3">
        {showImagePreview && (
          <div
            className={cn(
              'relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-100',
              previewClassName,
            )}
          >
            {previewSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewSrc}
                alt="Preview"
                className={cn('h-full w-full object-cover', uploading && 'opacity-60')}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                No photo
              </div>
            )}
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/50 text-xs font-medium text-slate-600">
                …
              </div>
            )}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={inputRef}
              type="file"
              accept={accept}
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
                e.target.value = '';
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              loading={uploading}
              onClick={() => inputRef.current?.click()}
            >
              <Upload size={14} /> {value || localPreview ? 'Replace photo' : 'Upload photo'}
            </Button>
            {(value || localPreview) && (
              <button
                type="button"
                onClick={remove}
                className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 hover:text-rose-600"
              >
                <X size={14} /> Remove
              </button>
            )}
          </div>
          {value && !showImagePreview && (
            <p className="mt-1 truncate text-xs text-slate-500">{value.split('/').pop()}</p>
          )}
          {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
          {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
        </div>
      </div>
    </div>
  );
}
