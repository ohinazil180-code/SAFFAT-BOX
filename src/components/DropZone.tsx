import React, { useRef, useState, useEffect, useCallback } from 'react';
import { UploadCloud, Plus, FileText, CheckCircle2 } from 'lucide-react';

interface DropZoneProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
}

export const DropZone: React.FC<DropZoneProps> = ({ onFilesSelected, disabled }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (disabled) return;
      setIsDragOver(true);
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      if (disabled) return;

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        onFilesSelected(Array.from(e.dataTransfer.files));
      }
    },
    [disabled, onFilesSelected]
  );

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(Array.from(e.target.files));
      // Reset input value so re-selecting same file triggers change
      e.target.value = '';
    }
  };

  // Clipboard paste listener
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (disabled) return;
      if (e.clipboardData && e.clipboardData.files.length > 0) {
        onFilesSelected(Array.from(e.clipboardData.files));
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [disabled, onFilesSelected]);

  return (
    <div
      id="upload-dropzone-container"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !disabled && fileInputRef.current?.click()}
      className={`group relative cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed p-8 sm:p-12 text-center transition-all duration-200 ${
        isDragOver
          ? 'border-cyan-400 bg-cyan-950/20 shadow-[0_0_30px_rgba(6,182,212,0.15)] scale-[1.01]'
          : 'border-white/[0.12] bg-slate-900/40 hover:border-cyan-500/40 hover:bg-slate-900/60'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled}
      />

      <div className="flex flex-col items-center justify-center">
        {/* Animated Dropzone Icon */}
        <div
          className={`relative mb-5 flex h-16 w-16 items-center justify-center rounded-2xl transition-all duration-300 ${
            isDragOver
              ? 'bg-cyan-500/20 text-cyan-300 ring-4 ring-cyan-500/30'
              : 'bg-slate-800/80 text-slate-300 group-hover:bg-cyan-500/10 group-hover:text-cyan-400'
          }`}
        >
          <UploadCloud className="h-8 w-8 transition-transform group-hover:-translate-y-0.5" />
          <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500 text-slate-950">
            <Plus className="h-3.5 w-3.5 stroke-[3]" />
          </div>
        </div>

        <h3 className="text-base sm:text-lg font-bold text-white tracking-wide">
          {isDragOver ? 'Release to upload files' : 'Drop files here or click to browse'}
        </h3>
        <p className="mt-1.5 text-xs sm:text-sm text-slate-400 max-w-md">
          Universal file transfer: Images, Videos, Documents, Audio, Archives, Binaries. Paste from clipboard supported.
        </p>

        {/* Feature badges */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-[11px] font-medium text-slate-400">
          <span className="inline-flex items-center gap-1 rounded-md bg-white/[0.04] px-2.5 py-1 border border-white/[0.06]">
            <CheckCircle2 className="h-3 w-3 text-cyan-400" /> Max 100MB per file
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-white/[0.04] px-2.5 py-1 border border-white/[0.06]">
            <CheckCircle2 className="h-3 w-3 text-cyan-400" /> Multi-file bundles
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-white/[0.04] px-2.5 py-1 border border-white/[0.06]">
            <CheckCircle2 className="h-3 w-3 text-cyan-400" /> End-to-end atomic transfer
          </span>
        </div>
      </div>
    </div>
  );
};
