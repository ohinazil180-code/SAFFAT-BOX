import React, { useEffect, useState } from 'react';
import { X, Download, FileText, Image as ImageIcon, Music, Video } from 'lucide-react';
import { PublicFileInfo } from '../types';
import { formatBytes } from '../utils/formatters';

interface FilePreviewModalProps {
  shareCode: string;
  file: PublicFileInfo;
  unlockToken?: string;
  onClose: () => void;
  onDownload: () => void;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  shareCode,
  file,
  unlockToken,
  onClose,
  onDownload,
}) => {
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const previewUrl = `/api/shares/${shareCode}/preview/${file.id}${unlockToken ? `?token=${encodeURIComponent(unlockToken)}` : ''}`;

  const isText =
    file.mimeType.startsWith('text/') ||
    ['application/json', 'application/javascript', 'application/typescript', 'application/xml'].includes(file.mimeType) ||
    ['txt', 'md', 'json', 'js', 'ts', 'tsx', 'jsx', 'css', 'html', 'csv', 'xml', 'yml', 'yaml', 'log', 'sh', 'py', 'sql'].some((ext) =>
      file.originalName.toLowerCase().endsWith(`.${ext}`)
    );

  const isImage = file.mimeType.startsWith('image/');
  const isAudio = file.mimeType.startsWith('audio/');
  const isVideo = file.mimeType.startsWith('video/');
  const isPdf = file.mimeType === 'application/pdf' || file.originalName.toLowerCase().endsWith('.pdf');

  useEffect(() => {
    if (isText) {
      setLoading(true);
      fetch(previewUrl)
        .then((res) => {
          if (!res.ok) throw new Error('Failed to load text preview');
          return res.text();
        })
        .then((text) => {
          setTextContent(text);
          setLoading(false);
        })
        .catch((err) => {
          setError(err.message);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [previewUrl, isText]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">
      <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl border border-white/[0.1] bg-slate-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-3.5 bg-slate-950/50">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <span className="font-mono text-xs text-cyan-400 font-semibold uppercase">PREVIEW</span>
            <span className="text-slate-500">•</span>
            <p className="truncate font-medium text-sm text-slate-200">{file.originalName}</p>
            <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[11px] text-slate-400">
              {formatBytes(file.size)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="preview-download-btn"
              onClick={onDownload}
              className="flex items-center gap-1.5 rounded-xl bg-cyan-500/20 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/30 transition-colors border border-cyan-500/30"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download</span>
            </button>

            <button
              id="close-preview-modal-btn"
              onClick={onClose}
              className="rounded-xl p-1.5 text-slate-400 hover:bg-white/[0.08] hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6 flex items-center justify-center min-h-[300px] max-h-[75vh] bg-slate-950/30">
          {loading && (
            <div className="flex flex-col items-center gap-2 text-slate-400 font-mono text-xs">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent"></div>
              <span>Loading preview...</span>
            </div>
          )}

          {error && <div className="text-rose-400 text-xs font-mono">{error}</div>}

          {!loading && !error && isImage && (
            <img
              src={previewUrl}
              alt={file.originalName}
              className="max-h-[65vh] max-w-full rounded-lg object-contain shadow-md"
            />
          )}

          {!loading && !error && isAudio && (
            <div className="w-full max-w-md flex flex-col items-center gap-4 py-8">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Music className="h-8 w-8" />
              </div>
              <p className="font-mono text-sm text-slate-300">{file.originalName}</p>
              <audio controls className="w-full rounded-lg" src={previewUrl}>
                Your browser does not support the audio element.
              </audio>
            </div>
          )}

          {!loading && !error && isVideo && (
            <video controls className="max-h-[65vh] max-w-full rounded-lg shadow-md" src={previewUrl}>
              Your browser does not support the video element.
            </video>
          )}

          {!loading && !error && isPdf && (
            <iframe
              src={previewUrl}
              title={file.originalName}
              className="h-[65vh] w-full rounded-lg border border-white/[0.06] bg-white"
            />
          )}

          {!loading && !error && isText && textContent !== null && (
            <pre className="h-[65vh] w-full overflow-auto rounded-xl border border-white/[0.08] bg-slate-950 p-4 font-mono text-xs text-slate-300 whitespace-pre-wrap select-text leading-relaxed">
              {textContent}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
};
