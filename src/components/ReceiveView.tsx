import React, { useState, useEffect } from 'react';
import { PublicShare, PublicFileInfo } from '../types';
import { formatShareCode, formatBytes, formatTimeRemaining, getFileCategory } from '../utils/formatters';
import { FilePreviewModal } from './FilePreviewModal';
import { ShareLinksDrawer } from './ShareLinksDrawer';
import {
  Download,
  Eye,
  Lock,
  Search,
  Clock,
  ShieldCheck,
  AlertCircle,
  FileArchive,
  Image,
  Video,
  Music,
  FileText,
  File,
  Code,
  Flame,
  CheckCircle2,
  Share2,
  User,
} from 'lucide-react';

interface ReceiveViewProps {
  initialCode?: string;
}

export const ReceiveView: React.FC<ReceiveViewProps> = ({ initialCode }) => {
  const [code, setCode] = useState(initialCode ? formatShareCode(initialCode) : '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [share, setShare] = useState<PublicShare | null>(null);
  const [isShareDrawerOpen, setIsShareDrawerOpen] = useState(false);

  // Password unlock state
  const [password, setPassword] = useState('');
  const [unlockToken, setUnlockToken] = useState<string | undefined>(undefined);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState(false);

  // Preview state
  const [previewFile, setPreviewFile] = useState<PublicFileInfo | null>(null);

  // Download state feedback
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadSuccessMessage, setDownloadSuccessMessage] = useState<string | null>(null);

  // Fetch share when code changes from URL or input
  const fetchShareData = async (targetCode: string, token?: string) => {
    const clean = formatShareCode(targetCode);
    if (!clean || clean.length < 8) {
      setError('Please enter a valid 8-character share code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const url = `/api/shares/${clean}${token ? `?token=${encodeURIComponent(token)}` : ''}`;
      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to retrieve share');
      }

      setShare(data);
    } catch (err: any) {
      setShare(null);
      setError(err.message || 'Share not found or expired');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialCode) {
      const formatted = formatShareCode(initialCode);
      setCode(formatted);
      fetchShareData(formatted);
    }
  }, [initialCode]);

  const handleLookupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchShareData(code);
  };

  const handleUnlockPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || !share) return;

    setUnlocking(true);
    setUnlockError(null);

    try {
      const res = await fetch(`/api/shares/${share.shareCode}/unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Incorrect password');
      }

      setUnlockToken(data.token);
      // Re-fetch share with token to unlock real filenames and preview capabilities
      await fetchShareData(share.shareCode, data.token);
      setPassword('');
    } catch (err: any) {
      setUnlockError(err.message || 'Failed to unlock');
    } finally {
      setUnlocking(false);
    }
  };

  const handleDownloadFile = async (file: PublicFileInfo) => {
    if (!share) return;
    setDownloadingId(file.id);
    setDownloadSuccessMessage(null);

    const downloadUrl = `/api/shares/${share.shareCode}/download/${file.id}${
      unlockToken ? `?token=${encodeURIComponent(unlockToken)}` : ''
    }`;

    // Trigger browser download via invisible link
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = file.originalName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      setDownloadingId(null);
      setDownloadSuccessMessage(`Download started: ${file.originalName}`);
      // Refresh share data to reflect updated download count
      fetchShareData(share.shareCode, unlockToken);
    }, 1500);
  };

  const handleDownloadAllZip = () => {
    if (!share) return;
    setDownloadingId('all');
    setDownloadSuccessMessage(null);

    const zipUrl = `/api/shares/${share.shareCode}/download-all${
      unlockToken ? `?token=${encodeURIComponent(unlockToken)}` : ''
    }`;

    const link = document.createElement('a');
    link.href = zipUrl;
    link.download = `dropcode_${share.shareCode}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      setDownloadingId(null);
      setDownloadSuccessMessage(`ZIP archive download initiated.`);
      fetchShareData(share.shareCode, unlockToken);
    }, 2000);
  };

  const getIcon = (category: string) => {
    switch (category) {
      case 'image':
        return <Image className="h-4 w-4 text-emerald-400" />;
      case 'video':
        return <Video className="h-4 w-4 text-rose-400" />;
      case 'audio':
        return <Music className="h-4 w-4 text-amber-400" />;
      case 'archive':
        return <FileArchive className="h-4 w-4 text-purple-400" />;
      case 'code':
        return <Code className="h-4 w-4 text-cyan-400" />;
      case 'document':
        return <FileText className="h-4 w-4 text-blue-400" />;
      default:
        return <File className="h-4 w-4 text-slate-400" />;
    }
  };

  const timeInfo = share ? formatTimeRemaining(share.expiresAt) : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      {/* Code Input Form */}
      <div className="rounded-2xl border border-white/[0.08] bg-slate-900/60 p-6 sm:p-8 backdrop-blur-xl">
        <h2 className="text-center text-xl sm:text-2xl font-black text-white tracking-tight">
          Enter Share Code
        </h2>
        <p className="mt-1 text-center text-xs sm:text-sm text-slate-400">
          Enter the 8-character temporary code provided by the sender.
        </p>

        <form onSubmit={handleLookupSubmit} className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <div className="relative w-full sm:max-w-md">
            <input
              id="receive-code-input"
              type="text"
              placeholder="e.g. 8K4P-72MX"
              value={code}
              onChange={(e) => setCode(formatShareCode(e.target.value))}
              maxLength={9}
              className="w-full rounded-2xl border border-white/[0.12] bg-slate-950 px-5 py-3.5 text-center font-mono text-lg sm:text-xl font-bold tracking-widest text-cyan-300 placeholder-slate-600 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
            />
          </div>

          <button
            id="receive-lookup-btn"
            type="submit"
            disabled={loading || !code || code.length < 8}
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl bg-cyan-500 px-7 py-3.5 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-500/20 hover:bg-cyan-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
            ) : (
              <Search className="h-4 w-4 stroke-[2.5]" />
            )}
            <span>{loading ? 'Finding...' : 'Access Files'}</span>
          </button>
        </form>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* If Password Protected and Locked */}
      {share && share.passwordProtected && !share.isUnlocked && (
        <div className="mt-6 rounded-2xl border border-amber-500/30 bg-slate-900/80 p-6 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Password Protected Share</h3>
              <p className="text-xs text-slate-400">The sender has encrypted this transfer with a passcode.</p>
            </div>
          </div>

          <form onSubmit={handleUnlockPassword} className="mt-4 flex flex-col sm:flex-row gap-3">
            <input
              id="receive-password-input"
              type="password"
              placeholder="Enter password to unlock"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="flex-1 rounded-xl border border-white/[0.1] bg-slate-950 px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
            />
            <button
              id="receive-unlock-btn"
              type="submit"
              disabled={unlocking || !password}
              className="rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold text-slate-950 hover:bg-amber-400 transition-colors disabled:opacity-50"
            >
              {unlocking ? 'Verifying...' : 'Unlock Files'}
            </button>
          </form>

          {unlockError && <p className="mt-2 text-xs text-rose-400">{unlockError}</p>}
        </div>
      )}

      {/* Share Files & Details Section */}
      {share && (!share.passwordProtected || share.isUnlocked) && (
        <div className="mt-6 rounded-2xl border border-white/[0.08] bg-slate-900/60 p-6 backdrop-blur-xl space-y-6">
          {/* Status Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/[0.08]">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xl font-black text-cyan-300 tracking-wider">
                  {share.shareCode}
                </span>
                <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-emerald-400 border border-emerald-500/20">
                  AVAILABLE
                </span>
                {share.username && (
                  <span className="rounded-md bg-cyan-500/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-cyan-400 border border-cyan-500/20 flex items-center gap-1">
                    <User className="h-3 w-3" />
                    <span>by @{share.username}</span>
                  </span>
                )}
                {share.oneTimeShare && (
                  <span className="rounded-md bg-rose-500/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-rose-400 border border-rose-500/20 flex items-center gap-1">
                    <Flame className="h-3 w-3" /> One-Time Burn
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Created {new Date(share.createdAt).toLocaleString()}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Share & Omni-Channel Options */}
              <button
                id="receive-share-drawer-btn"
                onClick={() => setIsShareDrawerOpen(true)}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/15 px-3.5 py-2.5 text-xs font-bold text-indigo-200 hover:bg-indigo-500/25 transition-all shadow-sm"
                title="Share link, QR code, and social links"
              >
                <Share2 className="h-4 w-4" />
                <span>Share</span>
              </button>

              {/* Batch ZIP download button if multiple files */}
              {share.files.length > 1 && (
                <button
                  id="download-all-zip-btn"
                  onClick={handleDownloadAllZip}
                  disabled={downloadingId === 'all'}
                  className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-cyan-500/20 hover:from-cyan-400 hover:to-indigo-500 transition-all"
                >
                  <FileArchive className="h-4 w-4" />
                  <span>{downloadingId === 'all' ? 'Creating ZIP...' : 'Download All as ZIP'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="rounded-xl border border-white/[0.06] bg-slate-950/50 p-3">
              <span className="text-slate-500 block mb-1">Payload Size</span>
              <span className="font-semibold text-slate-200">{formatBytes(share.totalSize)}</span>
            </div>

            <div className="rounded-xl border border-white/[0.06] bg-slate-950/50 p-3">
              <span className="text-slate-500 block mb-1">Files Count</span>
              <span className="font-semibold text-slate-200">{share.files.length}</span>
            </div>

            <div className="rounded-xl border border-white/[0.06] bg-slate-950/50 p-3">
              <span className="text-slate-500 block mb-1">Lifespan</span>
              <span className={`font-semibold ${timeInfo?.urgent ? 'text-amber-400' : 'text-slate-200'}`}>
                {timeInfo?.text}
              </span>
            </div>

            <div className="rounded-xl border border-white/[0.06] bg-slate-950/50 p-3">
              <span className="text-slate-500 block mb-1">Downloads Left</span>
              <span className="font-semibold text-cyan-400">
                {share.oneTimeShare
                  ? '1 (Burns after download)'
                  : share.downloadsRemaining !== null
                  ? `${share.downloadsRemaining} remaining`
                  : 'Unlimited'}
              </span>
            </div>
          </div>

          {/* Download feedback notification */}
          {downloadSuccessMessage && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{downloadSuccessMessage}</span>
            </div>
          )}

          {/* Files List */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Available Files ({share.files.length})
            </h4>

            <div className="space-y-2.5">
              {share.files.map((file) => {
                const category = getFileCategory(file.mimeType, file.originalName);
                const isDownloading = downloadingId === file.id;

                return (
                  <div
                    key={file.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-slate-950/40 p-4 hover:border-white/[0.12] transition-colors"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800/80 border border-white/[0.06]">
                        {getIcon(category)}
                      </div>
                      <div className="truncate">
                        <p className="truncate text-sm font-semibold text-slate-200">{file.originalName}</p>
                        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                          <span>{formatBytes(file.size)}</span>
                          <span>•</span>
                          <span className="truncate max-w-[150px]">{file.mimeType}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      {/* Browser Preview Button */}
                      {file.isBrowserPreviewable && (
                        <button
                          id={`preview-file-${file.id}-btn`}
                          onClick={() => setPreviewFile(file)}
                          className="flex items-center gap-1.5 rounded-xl border border-white/[0.1] bg-slate-800/80 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5 text-cyan-400" />
                          <span>Preview</span>
                        </button>
                      )}

                      {/* Download Button */}
                      <button
                        id={`download-file-${file.id}-btn`}
                        onClick={() => handleDownloadFile(file)}
                        disabled={isDownloading}
                        className="flex items-center gap-1.5 rounded-xl bg-cyan-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-400 shadow-md shadow-cyan-500/10 transition-all disabled:opacity-50"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>{isDownloading ? 'Downloading...' : 'Download'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* In-Browser Preview Modal */}
      {previewFile && share && (
        <FilePreviewModal
          shareCode={share.shareCode}
          file={previewFile}
          unlockToken={unlockToken}
          onClose={() => setPreviewFile(null)}
          onDownload={() => handleDownloadFile(previewFile)}
        />
      )}

      {/* Omni-Channel Share & Link Drawer for Current Share */}
      {share && (
        <ShareLinksDrawer
          isOpen={isShareDrawerOpen}
          onClose={() => setIsShareDrawerOpen(false)}
          data={{
            shareCode: share.shareCode,
            fileCount: share.files.length,
            totalSize: share.totalSize,
            expiresAt: share.expiresAt,
            maxDownloads: share.maxDownloads,
            passwordProtected: share.passwordProtected,
          }}
        />
      )}
    </div>
  );
};
