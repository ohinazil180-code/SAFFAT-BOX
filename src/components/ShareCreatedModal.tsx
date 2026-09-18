import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Copy,
  Check,
  QrCode,
  Download,
  Radio,
  ShieldCheck,
  Clock,
  ExternalLink,
  ArrowRight,
  CheckCircle2,
  Share2,
  MessageCircle,
  Send,
  Mail,
  Smartphone,
  Sparkles,
} from 'lucide-react';
import { CreatedShareResult, TransferEvent } from '../types';
import { formatTimeRemaining, formatBytes } from '../utils/formatters';
import { ShareLinksDrawer } from './ShareLinksDrawer';

interface ShareCreatedModalProps {
  share: CreatedShareResult;
  onClose: () => void;
  onGoToTransfers: () => void;
}

export const ShareCreatedModal: React.FC<ShareCreatedModalProps> = ({ share, onClose, onGoToTransfers }) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [isShareDrawerOpen, setIsShareDrawerOpen] = useState(false);
  const [liveEvents, setLiveEvents] = useState<TransferEvent[]>([]);
  const [currentStatusText, setCurrentStatusText] = useState('Waiting for receiver to connect...');

  const triggerToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage((prev) => (prev === message ? null : prev));
    }, 3000);
  };

  // Connect to SSE for real-time tracking
  useEffect(() => {
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(`/api/shares/${share.shareCode}/events`);

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.eventType) {
            setLiveEvents((prev) => [data, ...prev]);

            if (data.eventType === 'share_accessed') {
              setCurrentStatusText('Receiver accessed the share!');
            } else if (data.eventType === 'download_started') {
              setCurrentStatusText(`Download initiated (${data.metadata?.fileName || 'file'})`);
            } else if (data.eventType === 'download_completed') {
              setCurrentStatusText(`Download completed successfully!`);
            } else if (data.eventType === 'share_expired') {
              setCurrentStatusText('Share has expired');
            }
          }
        } catch {
          // heartbeat or ping
        }
      };

      eventSource.onerror = () => {
        // SSE error, keep polling or close
      };
    } catch (e) {
      console.warn('SSE connection failed', e);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [share.shareCode]);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(share.shareCode);
      setCopiedCode(true);
      triggerToast(`Share code ${share.shareCode} copied to clipboard!`);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(share.shareUrl);
      setCopiedLink(true);
      triggerToast('Share link copied to clipboard! Ready to share.');
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // fallback
    }
  };

  const timeRemaining = formatTimeRemaining(share.expiresAt);

  return (
    <div className="rounded-2xl border border-cyan-500/30 bg-slate-900/90 p-6 sm:p-8 backdrop-blur-xl shadow-2xl shadow-cyan-950/40">
      {/* Top Banner */}
      <div className="flex items-center justify-between pb-6 border-b border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Radio className="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-wide">Share Ready to Transfer</h2>
            <p className="text-xs text-slate-400">Share this code or link with the recipient.</p>
          </div>
        </div>

        <button
          id="send-another-file-btn"
          onClick={onClose}
          className="rounded-xl border border-white/[0.1] bg-slate-800/80 px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700/80 hover:text-white transition-all"
        >
          Send Another
        </button>
      </div>

      {/* Primary Code Highlight */}
      <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-white/[0.1] bg-slate-950/60 p-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Recipient Share Code</p>

        <div className="my-3 flex items-center justify-center gap-3">
          <span
            id="generated-share-code-display"
            className="font-mono text-3xl sm:text-4xl font-black tracking-widest text-cyan-300 drop-shadow-[0_0_20px_rgba(6,182,212,0.3)] select-all"
          >
            {share.shareCode}
          </span>
          <button
            id="copy-generated-code-btn"
            onClick={handleCopyCode}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 hover:scale-105 transition-all border border-cyan-500/30"
            title="Copy Share Code"
          >
            {copiedCode ? <Check className="h-5 w-5 text-emerald-400" /> : <Copy className="h-5 w-5" />}
          </button>
        </div>

        <p className="text-xs text-slate-400">
          The receiver can enter this 8-character code at{' '}
          <span className="font-mono text-slate-300">Drop Code</span> to download.
        </p>

        {/* Share Link & QR row */}
        <div className="mt-5 flex w-full flex-col sm:flex-row items-center gap-2 max-w-lg">
          <div className="flex w-full items-center rounded-xl border border-white/[0.08] bg-slate-900/80 px-3 py-2">
            <span className="truncate font-mono text-xs text-slate-400">{share.shareUrl}</span>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              id="copy-share-link-btn"
              onClick={handleCopyLink}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-xl border border-white/[0.1] bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors whitespace-nowrap"
            >
              {copiedLink ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
            </button>

            {share.qrCodeDataUrl && (
              <button
                id="toggle-qr-code-btn"
                onClick={() => setShowQrModal(!showQrModal)}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-3.5 py-2 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20 transition-colors"
                title="Show QR Code"
              >
                <QrCode className="h-4 w-4" />
                <span>QR</span>
              </button>
            )}
          </div>
        </div>

        {/* Real-time Omni-Channel Sharing Suite */}
        <div className="mt-5 w-full pt-4 border-t border-white/[0.06]">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              Direct Link & Social Sharing
            </span>
            <button
              id="open-full-share-drawer-btn"
              onClick={() => setIsShareDrawerOpen(true)}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 hover:underline"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>More Sharing Options...</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* Native / Device Share */}
            <button
              id="quick-device-share-btn"
              onClick={async () => {
                if (navigator.share) {
                  try {
                    await navigator.share({
                      title: `Drop Code: ${share.fileCount} file(s)`,
                      text: `Download files securely via Drop Code: ${share.shareCode}`,
                      url: share.shareUrl,
                    });
                  } catch {
                    // ignored
                  }
                } else {
                  handleCopyLink();
                }
              }}
              className="py-2 px-3 bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl flex items-center justify-center gap-2 text-xs font-medium text-slate-200 transition-colors"
            >
              <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
              <span>Device Share</span>
            </button>

            {/* WhatsApp */}
            <a
              id="quick-whatsapp-share-btn"
              href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                `Download ${share.fileCount} file(s) on Drop Code: ${share.shareUrl} (Code: ${share.shareCode})`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2 px-3 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-xl flex items-center justify-center gap-2 text-xs font-medium text-emerald-300 transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>WhatsApp</span>
            </a>

            {/* Telegram */}
            <a
              id="quick-telegram-share-btn"
              href={`https://t.me/share/url?url=${encodeURIComponent(share.shareUrl)}&text=${encodeURIComponent(
                `Download ${share.fileCount} file(s) via Drop Code (${share.shareCode})`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2 px-3 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 rounded-xl flex items-center justify-center gap-2 text-xs font-medium text-sky-300 transition-colors"
            >
              <Send className="w-3.5 h-3.5 text-sky-400" />
              <span>Telegram</span>
            </a>

            {/* All Options Drawer button */}
            <button
              id="trigger-all-sharing-drawer-btn"
              onClick={() => setIsShareDrawerOpen(true)}
              className="py-2 px-3 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-xl flex items-center justify-center gap-1.5 text-xs font-medium text-cyan-300 transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>More Channels</span>
            </button>
          </div>
        </div>
      </div>

      {/* QR Code Expansion */}
      {showQrModal && share.qrCodeDataUrl && (
        <div className="mt-4 flex flex-col items-center rounded-xl border border-white/[0.08] bg-slate-950/80 p-5">
          <div className="rounded-xl bg-white p-3 shadow-xl">
            <img src={share.qrCodeDataUrl} alt="Drop Code Share QR" className="h-48 w-48 rounded" />
          </div>
          <p className="mt-3 text-xs text-slate-400">Scan using any phone camera to access files immediately</p>
          <a
            href={share.qrCodeDataUrl}
            download={`dropcode-${share.shareCode}-qr.png`}
            className="mt-2 inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:underline font-mono"
          >
            <Download className="h-3.5 w-3.5" /> Download QR Image
          </a>
        </div>
      )}

      {/* Realtime Transfer Status Box */}
      <div className="mt-6 rounded-xl border border-cyan-500/20 bg-slate-950/50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-500"></span>
            </span>
            <span className="font-mono text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Realtime Transfer Status
            </span>
          </div>
          <span className="text-[11px] font-mono text-cyan-400 font-semibold">{currentStatusText}</span>
        </div>

        {/* Live event log ticker */}
        {liveEvents.length > 0 && (
          <div className="mt-3 divide-y divide-white/[0.04] border-t border-white/[0.06] pt-2 text-[11px] font-mono text-slate-400">
            {liveEvents.slice(0, 3).map((ev, i) => (
              <div key={`${ev.id}-${i}`} className="flex items-center justify-between py-1">
                <span className="text-slate-300">
                  {ev.eventType.replace(/_/g, ' ')} {ev.metadata?.fileName ? `(${ev.metadata.fileName})` : ''}
                </span>
                <span className="text-slate-500">{new Date(ev.timestamp).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Share metadata summary pills */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="rounded-xl border border-white/[0.06] bg-slate-900/40 p-3">
          <span className="text-slate-500 block mb-1">Payload</span>
          <span className="font-medium text-slate-200">
            {share.fileCount} {share.fileCount === 1 ? 'file' : 'files'} ({formatBytes(share.totalSize)})
          </span>
        </div>

        <div className="rounded-xl border border-white/[0.06] bg-slate-900/40 p-3">
          <span className="text-slate-500 block mb-1">Lifespan</span>
          <span className={`font-medium ${timeRemaining.urgent ? 'text-amber-400' : 'text-slate-200'}`}>
            {timeRemaining.text}
          </span>
        </div>

        <div className="rounded-xl border border-white/[0.06] bg-slate-900/40 p-3">
          <span className="text-slate-500 block mb-1">Downloads</span>
          <span className="font-medium text-slate-200">
            {share.oneTimeShare ? '1 (One-Time Burn)' : share.maxDownloads ? `${share.maxDownloads} max` : 'Unlimited'}
          </span>
        </div>

        <div className="rounded-xl border border-white/[0.06] bg-slate-900/40 p-3">
          <span className="text-slate-500 block mb-1">Security</span>
          <span className="font-medium text-emerald-400 flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5" />
            {share.passwordProtected ? 'Password Protected' : 'Atomic Token'}
          </span>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          id="view-in-transfers-btn"
          onClick={onGoToTransfers}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-400 transition-colors font-medium"
        >
          <span>Monitor in Live Transfers Dashboard</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Floating Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-xl border border-cyan-500/30 bg-slate-900/95 px-4 py-3 text-xs font-semibold text-white shadow-2xl backdrop-blur-xl"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full Omni-Channel Share Drawer */}
      <ShareLinksDrawer
        isOpen={isShareDrawerOpen}
        onClose={() => setIsShareDrawerOpen(false)}
        data={{
          shareCode: share.shareCode,
          fileCount: share.fileCount,
          totalSize: share.totalSize,
          expiresAt: share.expiresAt,
          maxDownloads: share.maxDownloads,
          passwordProtected: share.passwordProtected,
          qrCodeDataUrl: share.qrCodeDataUrl,
        }}
      />
    </div>
  );
};
