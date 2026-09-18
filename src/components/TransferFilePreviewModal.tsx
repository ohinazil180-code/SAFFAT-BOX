import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Download,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  FileArchive,
  Code as CodeIcon,
  File as FileIcon,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Clock,
  Timer,
  Flame,
  CheckCircle2,
  HardDrive,
  Hash,
  Share2,
} from 'lucide-react';
import { PublicFileInfo, RecentTransferItem } from '../types';
import { formatBytes, formatRelativeTime, getFileCategory, formatCountdownTimer } from '../utils/formatters';
import { detectFileType } from '../utils/fileTypeUtils';

interface TransferFilePreviewModalProps {
  file: PublicFileInfo;
  share: RecentTransferItem;
  onClose: () => void;
  onOpenReceive?: (shareCode: string) => void;
}

export const TransferFilePreviewModal: React.FC<TransferFilePreviewModalProps> = ({
  file,
  share,
  onClose,
  onOpenReceive,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedChecksum, setCopiedChecksum] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);

  // Text preview state
  const [textContent, setTextContent] = useState<string | null>(null);
  const [textLoading, setTextLoading] = useState(false);
  const [textError, setTextError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  // Live countdown ticker
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const countdown = formatCountdownTimer(share.expiresAt, now);

  const fileMeta = detectFileType(file.mimeType, file.originalName);
  const category = fileMeta.type;
  const CategoryIcon = fileMeta.icon;
  const previewUrl = `/api/shares/${share.shareCode}/preview/${file.id}`;
  const downloadUrl = `/api/shares/${share.shareCode}/download/${file.id}`;
  const zipDownloadUrl = `/api/shares/${share.shareCode}/download-all`;

  const isText =
    category === 'code' ||
    file.mimeType.startsWith('text/') ||
    ['application/json', 'application/javascript', 'application/typescript', 'application/xml'].includes(file.mimeType) ||
    ['txt', 'md', 'json', 'js', 'ts', 'tsx', 'jsx', 'css', 'html', 'csv', 'xml', 'yml', 'yaml', 'log', 'sh', 'py', 'sql'].some(
      (ext) => file.originalName.toLowerCase().endsWith(`.${ext}`)
    );

  const isImage = category === 'image';
  const isAudio = category === 'audio';
  const isVideo = category === 'video';
  const isPdf = category === 'pdf';

  // Fetch text content if previewable text
  useEffect(() => {
    if (isText && share.status === 'active') {
      setTextLoading(true);
      fetch(previewUrl)
        .then((res) => {
          if (!res.ok) throw new Error('Text preview not available');
          return res.text();
        })
        .then((text) => {
          setTextContent(text);
          setTextLoading(false);
        })
        .catch((err) => {
          setTextError(err.message);
          setTextLoading(false);
        });
    }
  }, [previewUrl, isText, share.status]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(share.shareCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleCopyChecksum = async () => {
    if (!file.checksum) return;
    try {
      await navigator.clipboard.writeText(file.checksum);
      setCopiedChecksum(true);
      setTimeout(() => setCopiedChecksum(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleDownloadFile = () => {
    setDownloading(true);
    setDownloadSuccess(false);

    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = file.originalName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      setDownloading(false);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    }, 800);
  };

  const handleDownloadZip = () => {
    setDownloadingZip(true);
    const link = document.createElement('a');
    link.href = zipDownloadUrl;
    link.download = `transfer-${share.shareCode}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      setDownloadingZip(false);
    }, 1000);
  };

  const renderCategoryIcon = (className = 'h-5 w-5') => {
    switch (category) {
      case 'image':
        return <ImageIcon className={className} />;
      case 'video':
        return <Video className={className} />;
      case 'audio':
        return <Music className={className} />;
      case 'pdf':
        return <FileText className={className} />;
      case 'code':
        return <CodeIcon className={className} />;
      case 'archive':
        return <FileArchive className={className} />;
      default:
        return <FileIcon className={className} />;
    }
  };

  const getCategoryColor = () => {
    switch (category) {
      case 'image':
        return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
      case 'video':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      case 'audio':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'pdf':
        return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
      case 'code':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'archive':
        return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
      default:
        return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  const remainingDownloads =
    share.maxDownloads !== null ? Math.max(0, share.maxDownloads - share.downloadCount) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-3 sm:p-6 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="relative flex max-h-[92vh] w-full max-w-4xl flex-col rounded-2xl border border-white/[0.1] bg-slate-900 shadow-2xl overflow-hidden"
      >
        {/* Modal Top Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4 bg-slate-950/60">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${fileMeta.bgColor} ${fileMeta.borderColor}`}>
              <CategoryIcon className={`h-5 w-5 ${fileMeta.textColor}`} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="truncate font-bold text-base text-white" title={file.originalName}>
                  {file.originalName}
                </h2>
                <span className={`shrink-0 rounded-md px-2 py-0.5 font-mono text-[10px] font-semibold uppercase border ${fileMeta.badgeClass}`}>
                  {fileMeta.label}
                </span>
              </div>
              <p className="font-mono text-xs text-slate-400 mt-0.5">
                {formatBytes(file.size)} • Transfer {share.shareCode}
              </p>
            </div>
          </div>

          <button
            id="close-transfer-preview-modal-btn"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-white/[0.08] hover:text-white transition-colors"
            title="Close Preview"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body with Metadata Grid & Preview */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Metadata Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* File Size */}
            <div className="rounded-xl border border-white/[0.06] bg-slate-950/40 p-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                File Size
              </span>
              <p className="font-mono text-sm font-bold text-white mt-1">
                {formatBytes(file.size)}
              </p>
              <p className="text-[10px] font-mono text-slate-500 truncate">
                {file.size.toLocaleString()} bytes
              </p>
            </div>

            {/* Total Transfer Size */}
            <div className="rounded-xl border border-white/[0.06] bg-slate-950/40 p-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Total Transfer
              </span>
              <p className="font-mono text-sm font-bold text-cyan-300 mt-1">
                {formatBytes(share.totalSize)}
              </p>
              <p className="text-[10px] font-mono text-slate-500">
                {share.fileCount} {share.fileCount === 1 ? 'file in bundle' : 'files in bundle'}
              </p>
            </div>

            {/* Share Code */}
            <div className="rounded-xl border border-white/[0.06] bg-slate-950/40 p-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Share Code
                </span>
                <button
                  onClick={handleCopyCode}
                  className="text-slate-400 hover:text-cyan-300 transition-colors"
                  title="Copy Share Code"
                >
                  {copiedCode ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>
              <p className="font-mono text-sm font-black text-cyan-300 mt-1 tracking-wider">
                {share.shareCode}
              </p>
              <p className="text-[10px] text-slate-500 truncate">
                Created {formatRelativeTime(share.createdAt)}
              </p>
            </div>

            {/* Quota / Status */}
            <div className="rounded-xl border border-white/[0.06] bg-slate-950/40 p-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Delivery Status
              </span>
              <div className="flex items-center gap-1.5 mt-1">
                {share.status === 'active' ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 font-mono">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span> Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-400 font-mono">
                    {share.status}
                  </span>
                )}
                {share.oneTimeShare && (
                  <span className="rounded bg-rose-500/10 px-1 py-0.5 text-[9px] font-mono text-rose-400 border border-rose-500/20 flex items-center gap-0.5">
                    <Flame className="h-2.5 w-2.5" /> 1-time
                  </span>
                )}
              </div>
              <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                {remainingDownloads !== null
                  ? `${remainingDownloads} of ${share.maxDownloads} downloads left`
                  : `${share.downloadCount} downloads served`}
              </p>
            </div>
          </div>

          {/* Secondary Details: MIME Type and Checksum */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/[0.04] bg-slate-950/20 px-3.5 py-2 text-xs font-mono text-slate-400">
            <div className="flex items-center gap-2">
              <span className="text-slate-500">MIME:</span>
              <span className="text-slate-300">{file.mimeType}</span>
            </div>

            {file.checksum && (
              <div className="flex items-center gap-1.5">
                <Hash className="h-3 w-3 text-slate-500" />
                <span className="text-slate-500">SHA-256:</span>
                <span className="text-slate-300 truncate max-w-[120px] sm:max-w-[200px]">
                  {file.checksum}
                </span>
                <button
                  onClick={handleCopyChecksum}
                  className="p-0.5 text-slate-500 hover:text-white transition-colors"
                  title="Copy SHA-256 Hash"
                >
                  {copiedChecksum ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>
            )}
          </div>

          {/* Live Estimated Time Remaining Banner */}
          {share.status === 'active' && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-3.5 py-2.5 text-xs font-mono">
              <div className="flex items-center gap-2">
                <Timer className={`h-4 w-4 ${countdown.critical ? 'text-rose-400 animate-pulse' : countdown.urgent ? 'text-amber-400' : 'text-cyan-400'}`} />
                <span className="text-slate-300 font-sans font-medium">Estimated Time Remaining:</span>
                <span className={`font-bold ${countdown.critical ? 'text-rose-300 animate-pulse' : countdown.urgent ? 'text-amber-300' : 'text-cyan-300'}`}>
                  {countdown.formatted}
                </span>
              </div>
              {share.expiresAt ? (
                <span className="text-[11px] text-slate-400 font-sans">
                  Auto-expires {new Date(share.expiresAt).toLocaleTimeString()}
                </span>
              ) : (
                <span className="text-[11px] text-slate-400 font-sans">Permanent storage</span>
              )}
            </div>
          )}

          {/* In-Browser Preview Section */}
          <div className="rounded-xl border border-white/[0.08] bg-slate-950/60 overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2.5 bg-slate-950/40">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />
                <span>Content Inspection</span>
              </span>
              <span className="font-mono text-[10px] text-slate-500">
                {file.isBrowserPreviewable ? 'Safe Sandbox Preview' : 'Direct Download Only'}
              </span>
            </div>

            <div className="flex items-center justify-center min-h-[220px] max-h-[50vh] p-4 overflow-auto">
              {textLoading && (
                <div className="flex flex-col items-center gap-2 text-slate-400 font-mono text-xs py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent"></div>
                  <span>Loading text inspection...</span>
                </div>
              )}

              {textError && (
                <div className="text-center py-6 text-slate-400 text-xs font-mono">
                  <p className="text-rose-400 mb-1">Text preview error</p>
                  <p className="text-slate-500">{textError}</p>
                </div>
              )}

              {/* Image Preview */}
              {!textLoading && isImage && share.status === 'active' && (
                <div className="flex flex-col items-center gap-2 max-w-full">
                  <img
                    src={previewUrl}
                    alt={file.originalName}
                    className="max-h-[42vh] max-w-full rounded-lg object-contain shadow-lg border border-white/[0.06]"
                  />
                </div>
              )}

              {/* Audio Preview */}
              {!textLoading && isAudio && share.status === 'active' && (
                <div className="w-full max-w-md flex flex-col items-center gap-3 py-6">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Music className="h-7 w-7" />
                  </div>
                  <p className="font-mono text-xs text-slate-300">{file.originalName}</p>
                  <audio controls className="w-full rounded-lg" src={previewUrl}>
                    Your browser does not support the audio element.
                  </audio>
                </div>
              )}

              {/* Video Preview */}
              {!textLoading && isVideo && share.status === 'active' && (
                <video
                  controls
                  className="max-h-[42vh] max-w-full rounded-lg shadow-lg border border-white/[0.06]"
                  src={previewUrl}
                >
                  Your browser does not support the video element.
                </video>
              )}

              {/* PDF Preview */}
              {!textLoading && isPdf && share.status === 'active' && (
                <iframe
                  src={previewUrl}
                  title={file.originalName}
                  className="h-[42vh] w-full rounded-lg border border-white/[0.06] bg-white"
                />
              )}

              {/* Text / Code Preview */}
              {!textLoading && !textError && isText && textContent !== null && (
                <pre className="h-[40vh] w-full overflow-auto rounded-lg border border-white/[0.06] bg-slate-950 p-4 font-mono text-xs text-slate-300 whitespace-pre-wrap select-text leading-relaxed">
                  {textContent}
                </pre>
              )}

              {/* Non-previewable / Binary files */}
              {!isImage && !isAudio && !isVideo && !isPdf && !isText && (
                <div className="flex flex-col items-center text-center p-6 space-y-3">
                  <div className={`flex h-16 w-16 items-center justify-center rounded-2xl border ${getCategoryColor()}`}>
                    {renderCategoryIcon('h-8 w-8')}
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">{file.originalName}</h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-md">
                      Binary package ({formatBytes(file.size)}). In-browser rendering is withheld for security.
                      Initiate download below for atomic delivery.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Bottom Footer with Download Actions */}
        <div className="border-t border-white/[0.08] px-5 py-4 bg-slate-950/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-400 self-start sm:self-auto">
            {share.oneTimeShare ? (
              <span className="flex items-center gap-1 text-rose-400 font-mono text-[11px]">
                <Flame className="h-3.5 w-3.5" />
                <span>Notice: Downloading this file may trigger one-time burn.</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-slate-400 font-mono text-[11px]">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span>Atomic stream delivery verified</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            {onOpenReceive && (
              <button
                id="open-in-receive-view-btn"
                onClick={() => {
                  onClose();
                  onOpenReceive(share.shareCode);
                }}
                className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Open in Receiver</span>
              </button>
            )}

            {share.fileCount > 1 && (
              <button
                id="download-zip-bundle-btn"
                onClick={handleDownloadZip}
                disabled={downloadingZip || share.status !== 'active'}
                className="flex items-center gap-1.5 rounded-xl border border-purple-500/20 bg-purple-500/10 px-3 py-2 text-xs font-semibold text-purple-300 hover:bg-purple-500/20 transition-colors disabled:opacity-50"
                title="Download all files in this transfer as a single ZIP"
              >
                <FileArchive className="h-3.5 w-3.5" />
                <span>All (ZIP: {formatBytes(share.totalSize)})</span>
              </button>
            )}

            <button
              id="initiate-full-download-btn"
              onClick={handleDownloadFile}
              disabled={downloading || share.status !== 'active'}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-cyan-500/20 hover:from-cyan-400 hover:to-indigo-500 transition-all disabled:opacity-50"
            >
              {downloadSuccess ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                  <span>Download Started!</span>
                </>
              ) : (
                <>
                  <Download className={`h-4 w-4 ${downloading ? 'animate-bounce' : ''}`} />
                  <span>Download File ({formatBytes(file.size)})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
