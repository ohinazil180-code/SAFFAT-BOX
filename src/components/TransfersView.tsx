import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { RecentTransferItem, TransferEvent, PlatformStats, PublicFileInfo } from '../types';
import { formatBytes, formatRelativeTime, formatShareCode, getFileCategory, formatCountdownTimer } from '../utils/formatters';
import { detectFileType, FileTypeIcon, analyzeTransferFiles, DetectedFileType } from '../utils/fileTypeUtils';
import { TransferFilePreviewModal } from './TransferFilePreviewModal';
import { ShareLinksDrawer } from './ShareLinksDrawer';
import { useAuth } from '../context/AuthContext';
import {
  Activity,
  Copy,
  Check,
  Trash2,
  ExternalLink,
  ShieldAlert,
  HardDrive,
  Download,
  Share2,
  Clock,
  Timer,
  Flame,
  CheckCircle2,
  RefreshCw,
  Eye,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  FileArchive,
  Code as CodeIcon,
  File as FileIcon,
  User,
  Sparkles,
  Link,
  Filter,
  Layers,
} from 'lucide-react';

export type HistoryFilterType = 'all' | 'mine' | 'pdf' | 'image' | 'video' | 'code';

interface TransfersViewProps {
  onSelectShareCode: (code: string) => void;
}

export const TransfersView: React.FC<TransfersViewProps> = ({ onSelectShareCode }) => {
  const { user, token } = useAuth();
  const [transfers, setTransfers] = useState<RecentTransferItem[]>([]);
  const [events, setEvents] = useState<TransferEvent[]>([]);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<HistoryFilterType>('all');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [revokingCode, setRevokingCode] = useState<string | null>(null);
  const [now, setNow] = useState<number>(Date.now());
  const [selectedFileForPreview, setSelectedFileForPreview] = useState<{
    file: PublicFileInfo;
    share: RecentTransferItem;
  } | null>(null);
  const [selectedShareForDrawer, setSelectedShareForDrawer] = useState<RecentTransferItem | null>(null);

  // 1-second live countdown ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getFileIcon = (mimeType: string, filename: string, className = 'h-3.5 w-3.5') => {
    const meta = detectFileType(mimeType, filename);
    const IconComponent = meta.icon;
    return <IconComponent className={`${className} ${meta.textColor}`} />;
  };

  const loadData = async () => {
    try {
      const [transfersRes, eventsRes, statsRes] = await Promise.all([
        fetch('/api/transfers/recent'),
        fetch('/api/events/recent'),
        fetch('/api/stats'),
      ]);

      if (transfersRes.ok) setTransfers(await transfersRes.json());
      if (eventsRes.ok) setEvents(await eventsRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
    } catch (err) {
      console.warn('Failed to load transfers telemetry', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Connect to live global SSE stream for instant updates
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/events/live');
      eventSource.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data && data.eventType) {
            setEvents((prev) => [data, ...prev.slice(0, 49)]);
            // If share lifecycle changed, reload telemetry instantly
            if (
              data.eventType === 'share_created' ||
              data.eventType === 'share_revoked' ||
              data.eventType === 'share_expired' ||
              data.eventType === 'download_completed' ||
              data.eventType === 'user_signup' ||
              data.eventType === 'user_login'
            ) {
              loadData();
            }
          }
        } catch {
          // ignore keepalive
        }
      };
    } catch (err) {
      console.warn('Live SSE not available, falling back to polling', err);
    }

    const interval = setInterval(loadData, 5000);
    return () => {
      clearInterval(interval);
      if (eventSource) eventSource.close();
    };
  }, []);

  // Real-time MIME file type metrics across all transfers
  const pdfCount = transfers.filter((t) => analyzeTransferFiles(t.files, t.fileNames).typeCounts.pdf > 0).length;
  const imageCount = transfers.filter((t) => analyzeTransferFiles(t.files, t.fileNames).typeCounts.image > 0).length;
  const videoCount = transfers.filter((t) => analyzeTransferFiles(t.files, t.fileNames).typeCounts.video > 0).length;
  const codeCount = transfers.filter((t) => analyzeTransferFiles(t.files, t.fileNames).typeCounts.code > 0).length;

  const myTransfersCount = user
    ? transfers.filter((t) => t.userId === user.id || t.username === user.username).length
    : 0;

  const displayedTransfers = transfers.filter((t) => {
    if (filterTab === 'mine') {
      return user ? (t.userId === user.id || t.username === user.username) : true;
    }
    if (filterTab === 'all') return true;
    const analysis = analyzeTransferFiles(t.files, t.fileNames);
    return analysis.typeCounts[filterTab] > 0;
  });

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      // fallback
    }
  };

  const handleRevokeShare = async (code: string) => {
    if (!window.confirm(`Are you sure you want to permanently revoke share ${code} and purge all its files?`)) {
      return;
    }

    setRevokingCode(code);
    try {
      const res = await fetch(`/api/shares/${code}/revoke`, { method: 'POST' });
      if (res.ok) {
        await loadData();
      }
    } catch (err) {
      console.error('Revoke error', err);
    } finally {
      setRevokingCode(null);
    }
  };

  const getStatusBadge = (status: string, oneTime: boolean) => {
    if (status === 'active') {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-emerald-400 border border-emerald-500/20">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span> Active
        </span>
      );
    }
    if (status === 'download_limit_reached') {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-amber-400 border border-amber-500/20">
          {oneTime ? 'Burned' : 'Limit Reached'}
        </span>
      );
    }
    if (status === 'expired') {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-slate-500/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-400 border border-slate-500/20">
          Expired
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-rose-400 border border-rose-500/20">
        Revoked
      </span>
    );
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 space-y-8">
      {/* Header & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Transfers & Realtime Activity
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Real-time event stream, transfer telemetry, and active share management.
          </p>
        </div>

        <button
          id="refresh-transfers-btn"
          onClick={() => {
            setLoading(true);
            loadData();
          }}
          className="self-start sm:self-auto flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Analytics Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-white/[0.08] bg-slate-900/60 p-5 backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Shares</span>
            <Share2 className="h-4 w-4 text-cyan-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white font-mono">
            {stats ? stats.activeSharesCount : 0}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">Live in-flight payloads</p>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-slate-900/60 p-5 backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Downloads Served</span>
            <Download className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white font-mono">
            {stats ? stats.totalDownloadsServed : 0}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">Atomic delivery events</p>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-slate-900/60 p-5 backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Files Stored</span>
            <HardDrive className="h-4 w-4 text-indigo-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white font-mono">
            {stats ? stats.totalFilesCount : 0}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">Across active transfers</p>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-slate-900/60 p-5 backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Storage Used</span>
            <Activity className="h-4 w-4 text-purple-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white font-mono">
            {stats ? formatBytes(stats.totalStorageBytes) : '0 B'}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">Local volume capacity</p>
        </div>
      </div>

      {/* Main Grid: Shares List & Realtime Audit Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Shares Table / List (2 cols) */}
        <div className="lg:col-span-2 rounded-2xl border border-white/[0.08] bg-slate-900/60 p-6 backdrop-blur-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <Share2 className="h-4 w-4 text-cyan-400" />
                <span>Active & Recent Shares</span>
              </h3>
              <span className="text-xs text-slate-500 font-mono">({displayedTransfers.length})</span>
            </div>

            {/* Filter Tabs (All, PDF, Image, Video, Code, My Transfers) */}
            <div className="flex flex-wrap items-center gap-1 rounded-xl bg-slate-950 p-1 border border-white/[0.06] text-xs">
              <button
                id="filter-all-transfers-btn"
                onClick={() => setFilterTab('all')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  filterTab === 'all'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All ({transfers.length})
              </button>

              <button
                id="filter-pdf-transfers-btn"
                onClick={() => setFilterTab('pdf')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                  filterTab === 'pdf'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'text-slate-400 hover:text-rose-300'
                }`}
                title="Filter transfers with PDF documents"
              >
                <FileText className="w-3 h-3 text-rose-400" />
                <span>PDF ({pdfCount})</span>
              </button>

              <button
                id="filter-image-transfers-btn"
                onClick={() => setFilterTab('image')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                  filterTab === 'image'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-cyan-300'
                }`}
                title="Filter transfers with image files"
              >
                <ImageIcon className="w-3 h-3 text-cyan-400" />
                <span>Image ({imageCount})</span>
              </button>

              <button
                id="filter-video-transfers-btn"
                onClick={() => setFilterTab('video')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                  filterTab === 'video'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                    : 'text-slate-400 hover:text-purple-300'
                }`}
                title="Filter transfers with video files"
              >
                <Video className="w-3 h-3 text-purple-400" />
                <span>Video ({videoCount})</span>
              </button>

              <button
                id="filter-code-transfers-btn"
                onClick={() => setFilterTab('code')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                  filterTab === 'code'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-emerald-300'
                }`}
                title="Filter transfers with code scripts and sources"
              >
                <CodeIcon className="w-3 h-3 text-emerald-400" />
                <span>Code ({codeCount})</span>
              </button>

              {user && (
                <button
                  id="filter-my-transfers-btn"
                  onClick={() => setFilterTab('mine')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                    filterTab === 'mine'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <User className="w-3 h-3 text-cyan-400" />
                  <span>My Transfers ({myTransfersCount})</span>
                </button>
              )}
            </div>
          </div>

          {displayedTransfers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
              <Share2 className="h-10 w-10 text-slate-600 mb-2" />
              <p className="text-sm font-medium text-slate-300">
                {filterTab === 'mine' ? 'You have not uploaded any files yet' : 'No transfers created yet'}
              </p>
              <p className="text-xs text-slate-500">
                {filterTab === 'mine'
                  ? 'Switch to the Send tab to share your first files.'
                  : 'Upload a file from the Send tab to generate your first code.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.06] overflow-hidden">
              {displayedTransfers.map((item) => {
                const isRevoking = revokingCode === item.shareCode;
                const isCopied = copiedCode === item.shareCode;

                const filesList: PublicFileInfo[] =
                  item.files && item.files.length > 0
                    ? item.files
                    : item.fileNames.map((name, idx) => ({
                        id: `file-${idx}`,
                        originalName: name,
                        mimeType: 'application/octet-stream',
                        size: Math.round(item.totalSize / Math.max(1, item.fileCount)),
                        isBrowserPreviewable: false,
                      }));

                const hasDownloadQuota = typeof item.maxDownloads === 'number' && item.maxDownloads > 0;
                const downloadPercent = hasDownloadQuota
                  ? Math.min(100, Math.round((item.downloadCount / (item.maxDownloads || 1)) * 100))
                  : item.downloadCount > 0
                  ? 100
                  : 0;

                const countdown = formatCountdownTimer(item.expiresAt, now);
                const analysis = analyzeTransferFiles(item.files, item.fileNames);
                const DominantIcon = analysis.primary.icon;
                const activeDownloadEvent = events.find(
                  (ev) =>
                    ev.shareCode === item.shareCode &&
                    ev.eventType === 'download_started' &&
                    now - new Date(ev.timestamp).getTime() < 30000 &&
                    !events.some(
                      (comp) =>
                        comp.shareCode === item.shareCode &&
                        comp.eventType === 'download_completed' &&
                        new Date(comp.timestamp).getTime() >= new Date(ev.timestamp).getTime()
                    )
                );

                return (
                  <div key={item.id} className="py-4.5 hover:bg-white/[0.01] transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex items-start gap-3.5 min-w-0 flex-1">
                        {/* Dominant / Primary MIME Type Icon Box */}
                        <div
                          className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${analysis.primary.bgColor} ${analysis.primary.borderColor} shadow-sm mt-0.5`}
                          title={`Detected Payload: ${analysis.primary.categoryName} (${analysis.distinctTypes.join(', ')})`}
                        >
                          <DominantIcon className={`h-5 w-5 ${analysis.primary.textColor}`} />
                          {item.fileCount > 1 && (
                            <span className="absolute -bottom-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-slate-950 px-1 font-mono text-[9px] font-bold text-slate-300 border border-white/[0.15]">
                              {item.fileCount}
                            </span>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-base font-black text-cyan-300 tracking-wider">
                              {item.shareCode}
                            </span>

                            {/* Detected MIME Type Badge */}
                            <span
                              className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${analysis.primary.badgeClass}`}
                            >
                              <DominantIcon className="h-3 w-3" />
                              <span>{analysis.isMixed ? `${item.fileCount} Files (Mixed)` : analysis.primary.label}</span>
                            </span>

                            {getStatusBadge(item.status, item.oneTimeShare)}
                            {item.username && (
                              <span
                                className={`font-mono text-[10px] px-1.5 py-0.5 rounded border flex items-center gap-1 ${
                                  item.username === user?.username
                                    ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                                    : 'bg-slate-800 text-slate-300 border-slate-700'
                                }`}
                              >
                                <User className="w-2.5 h-2.5" />
                                <span>{item.username === user?.username ? 'You' : `@${item.username}`}</span>
                              </span>
                            )}
                            {item.oneTimeShare && (
                              <span className="font-mono text-[10px] text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20 flex items-center gap-1">
                                <Flame className="h-3 w-3" /> 1-time
                              </span>
                            )}
                            {/* Live Estimated Time Remaining Countdown Badge */}
                            {item.status === 'active' && (
                              <div
                                id={`countdown-timer-${item.shareCode}`}
                                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-0.5 font-mono text-[11px] font-bold border transition-colors ${
                                  countdown.critical
                                    ? 'bg-rose-500/15 text-rose-300 border-rose-500/30 animate-pulse'
                                    : countdown.urgent
                                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                    : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20'
                                }`}
                                title={`Estimated time remaining for share ${item.shareCode}`}
                              >
                                <Timer className={`h-3 w-3 ${countdown.critical ? 'text-rose-400' : countdown.urgent ? 'text-amber-400' : 'text-cyan-400'}`} />
                                <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 font-sans">
                                  Est. Remaining:
                                </span>
                                <span>{countdown.formatted}</span>
                              </div>
                            )}
                          </div>

                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                            <span className="font-medium text-slate-300">
                              {item.fileCount} {item.fileCount === 1 ? 'file' : 'files'} ({formatBytes(item.totalSize)})
                            </span>
                            <span>•</span>
                            <span>Created {formatRelativeTime(item.createdAt)}</span>
                            <span>•</span>
                            <span>
                              {hasDownloadQuota
                                ? `${item.downloadCount}/${item.maxDownloads} downloads`
                                : `${item.downloadCount} ${item.downloadCount === 1 ? 'download' : 'downloads'}`}
                            </span>
                            {item.status === 'active' && item.expiresAt && (
                              <>
                                <span>•</span>
                                <span className="inline-flex items-center gap-1 font-mono text-slate-300">
                                  <Clock className="h-3 w-3 text-cyan-400" />
                                  <span className="text-slate-400 font-sans">Est. Time Remaining:</span>
                                  <span className={countdown.urgent ? 'text-amber-300 font-semibold' : 'text-cyan-300 font-semibold'}>
                                    {countdown.formatted}
                                  </span>
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                        <button
                          id={`copy-code-${item.shareCode}-btn`}
                          onClick={() => handleCopyCode(item.shareCode)}
                          className="flex items-center gap-1 rounded-lg border border-white/[0.08] bg-slate-800 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white transition-colors"
                          title="Copy Share Code"
                        >
                          {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                          <span className="text-[11px] font-mono">{isCopied ? 'Copied' : 'Code'}</span>
                        </button>

                        {/* Share Links & Omni-Channel Drawer */}
                        {item.status === 'active' && (
                          <button
                            id={`share-drawer-trigger-${item.shareCode}-btn`}
                            onClick={() => setSelectedShareForDrawer(item)}
                            className="flex items-center gap-1 rounded-lg border border-indigo-500/25 bg-indigo-500/10 px-2.5 py-1.5 text-xs text-indigo-300 hover:bg-indigo-500/20 transition-colors"
                            title="Share Link, Social Channels & QR"
                          >
                            <Share2 className="h-3.5 w-3.5" />
                            <span className="text-[11px] font-semibold">Share</span>
                          </button>
                        )}

                        <button
                          id={`view-receive-${item.shareCode}-btn`}
                          onClick={() => onSelectShareCode(item.shareCode)}
                          className="flex items-center gap-1 rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-1.5 text-xs text-cyan-300 hover:bg-cyan-500/20 transition-colors"
                          title="Open in Receiver View"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          <span className="text-[11px] font-semibold">Open</span>
                        </button>

                        {item.status === 'active' && (
                          <button
                            id={`revoke-${item.shareCode}-btn`}
                            onClick={() => handleRevokeShare(item.shareCode)}
                            disabled={isRevoking}
                            className="flex items-center gap-1 rounded-lg border border-rose-500/20 bg-rose-500/10 px-2.5 py-1.5 text-xs text-rose-300 hover:bg-rose-500/20 transition-colors disabled:opacity-50"
                            title="Revoke and Delete Files"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span className="text-[11px]">Revoke</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Interactive Files List (Click to Preview) */}
                    <div className="mt-3">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                        <span>Payload Files ({filesList.length})</span>
                        <span className="text-slate-500 font-normal font-sans">— click file to preview & download</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {filesList.map((file) => {
                          const fileMeta = detectFileType(file.mimeType, file.originalName);
                          const FileTypeComp = fileMeta.icon;
                          return (
                            <button
                              key={file.id}
                              id={`preview-file-${item.shareCode}-${file.id}-btn`}
                              onClick={() => setSelectedFileForPreview({ file, share: item })}
                              className="group inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-slate-950/60 hover:bg-slate-800 hover:border-cyan-500/40 px-3 py-1.5 text-xs text-slate-300 transition-all text-left shadow-sm"
                              title={`Click to preview metadata and download ${file.originalName} (${formatBytes(file.size)}) — Type: ${fileMeta.categoryName}`}
                            >
                              <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${fileMeta.bgColor} ${fileMeta.borderColor}`}>
                                <FileTypeComp className={`h-3.5 w-3.5 ${fileMeta.textColor}`} />
                              </div>
                              <span className="font-medium max-w-[140px] sm:max-w-[200px] truncate text-slate-200 group-hover:text-cyan-300 transition-colors">
                                {file.originalName}
                              </span>
                              <span className={`font-mono text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${fileMeta.badgeClass}`}>
                                {fileMeta.label}
                              </span>
                              <span className="font-mono text-[10px] text-slate-400 bg-white/[0.04] px-1.5 py-0.5 rounded">
                                {formatBytes(file.size)}
                              </span>
                              <Eye className="h-3.5 w-3.5 text-slate-500 group-hover:text-cyan-400 transition-colors shrink-0" />
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Smooth Animated Transfer Progress Bar */}
                    <div className="mt-3 pt-2.5 border-t border-white/[0.04]">
                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
                        <span className="flex items-center gap-1.5">
                          <span>Transfer Progress</span>
                          {hasDownloadQuota ? (
                            <span className="text-slate-500">
                              ({item.downloadCount} of {item.maxDownloads} downloads)
                            </span>
                          ) : (
                            <span className="text-slate-500">
                              ({item.downloadCount} {item.downloadCount === 1 ? 'download' : 'downloads'})
                            </span>
                          )}
                        </span>
                        <span
                          className={`font-semibold ${
                            item.status === 'download_limit_reached' ? 'text-amber-400' : 'text-cyan-400'
                          }`}
                        >
                          {hasDownloadQuota
                            ? `${downloadPercent}%`
                            : item.downloadCount > 0
                            ? `${item.downloadCount} delivered`
                            : '0%'}
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800/80">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{
                            width: hasDownloadQuota ? `${downloadPercent}%` : item.downloadCount > 0 ? '100%' : '4%',
                          }}
                          transition={{
                            type: 'spring',
                            stiffness: 70,
                            damping: 18,
                            mass: 0.8,
                          }}
                          className={`h-full rounded-full ${
                            item.status === 'download_limit_reached'
                              ? 'bg-gradient-to-r from-amber-500 to-rose-500'
                              : 'bg-gradient-to-r from-cyan-400 via-indigo-500 to-cyan-500'
                          }`}
                        />
                      </div>

                      {/* Estimated Time Remaining Countdown Row */}
                      {item.status === 'active' && (
                        <div className="mt-2.5 flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-400 bg-slate-950/40 rounded-xl px-3 py-2 border border-white/[0.04]">
                          <div className="flex items-center gap-2">
                            <Timer
                              className={`h-3.5 w-3.5 ${
                                countdown.critical
                                  ? 'text-rose-400 animate-pulse'
                                  : countdown.urgent
                                  ? 'text-amber-400'
                                  : 'text-cyan-400'
                              }`}
                            />
                            <span className="text-slate-400 font-sans">Estimated Time Remaining:</span>
                            <span
                              className={`font-bold tracking-wide ${
                                countdown.critical
                                  ? 'text-rose-300 animate-pulse'
                                  : countdown.urgent
                                  ? 'text-amber-300'
                                  : 'text-cyan-300'
                              }`}
                            >
                              {countdown.formatted}
                            </span>
                            {countdown.urgent && !countdown.isExpired && (
                              <span className="rounded bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.2 text-[10px] text-amber-300 font-sans">
                                Expiring soon
                              </span>
                            )}
                          </div>

                          {activeDownloadEvent ? (
                            (() => {
                              const estDurationSec = Math.max(1, Math.round(item.totalSize / (5 * 1024 * 1024)));
                              const elapsedSec = Math.floor((now - new Date(activeDownloadEvent.timestamp).getTime()) / 1000);
                              const remainingSec = Math.max(0, estDurationSec - elapsedSec);
                              return (
                                <div className="flex items-center gap-1.5 text-cyan-300 text-[10px] font-semibold">
                                  <span className="relative flex h-2 w-2">
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75"></span>
                                    <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-500"></span>
                                  </span>
                                  <span>Transfer In-Flight {remainingSec > 0 ? `(~${remainingSec}s remaining)` : '(finishing...)'}</span>
                                </div>
                              );
                            })()
                          ) : item.expiresAt ? (
                            <span className="text-[10px] text-slate-500">
                              Expires at {new Date(item.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500">Permanent (No expiry window)</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Realtime Event Stream (1 col) */}
        <div className="rounded-2xl border border-white/[0.08] bg-slate-900/60 p-6 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-500"></span>
              </span>
              <span>Live Audit Stream</span>
            </h3>
            <span className="text-[11px] font-mono text-cyan-400">SSE Active</span>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 text-xs">
            {events.length === 0 ? (
              <p className="text-center text-xs text-slate-500 py-8">No transfer events recorded yet.</p>
            ) : (
              events.map((ev) => (
                <div
                  key={ev.id}
                  className="rounded-xl border border-white/[0.04] bg-slate-950/40 p-3 hover:border-white/[0.08] transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono font-bold text-cyan-300">{ev.shareCode}</span>
                    <span className="font-mono text-[10px] text-slate-500">
                      {formatRelativeTime(ev.timestamp)}
                    </span>
                  </div>
                  <p className="text-slate-300 font-medium">
                    {ev.eventType === 'share_created' && 'Share created'}
                    {ev.eventType === 'share_accessed' && 'Receiver accessed share'}
                    {ev.eventType === 'download_started' && 'Download started'}
                    {ev.eventType === 'download_completed' && 'Download completed'}
                    {ev.eventType === 'share_expired' && 'Share expired'}
                    {ev.eventType === 'share_revoked' && 'Share manually revoked'}
                  </p>
                  {ev.metadata?.fileName && (
                    <div className="mt-1 flex items-center gap-1.5 font-mono text-[11px] text-slate-400 truncate">
                      {(() => {
                        const evMeta = detectFileType(ev.metadata.mimeType, ev.metadata.fileName);
                        const EvIcon = evMeta.icon;
                        return (
                          <>
                            <EvIcon className={`h-3 w-3 shrink-0 ${evMeta.textColor}`} />
                            <span className="truncate">{ev.metadata.fileName}</span>
                            <span className={`text-[9px] px-1 py-0.2 rounded border uppercase font-sans ${evMeta.badgeClass}`}>
                              {evMeta.label}
                            </span>
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Preview Modal for Selected File */}
      {selectedFileForPreview && (
        <TransferFilePreviewModal
          file={selectedFileForPreview.file}
          share={selectedFileForPreview.share}
          onClose={() => setSelectedFileForPreview(null)}
          onOpenReceive={onSelectShareCode}
        />
      )}

      {/* Omni-Channel Share & Link Drawer for Selected Transfer */}
      {selectedShareForDrawer && (
        <ShareLinksDrawer
          isOpen={true}
          onClose={() => setSelectedShareForDrawer(null)}
          data={{
            shareCode: selectedShareForDrawer.shareCode,
            fileCount: selectedShareForDrawer.fileCount,
            totalSize: selectedShareForDrawer.totalSize,
            expiresAt: selectedShareForDrawer.expiresAt,
            maxDownloads: selectedShareForDrawer.maxDownloads,
            passwordProtected: false,
            qrCodeDataUrl: selectedShareForDrawer.qrCodeDataUrl,
          }}
        />
      )}
    </div>
  );
};
