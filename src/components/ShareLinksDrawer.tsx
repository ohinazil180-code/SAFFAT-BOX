import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Copy,
  Check,
  Share2,
  ExternalLink,
  QrCode,
  Download,
  Mail,
  MessageCircle,
  Send,
  Globe,
  FileText,
  Code,
  Shield,
  Clock,
  Sparkles,
  Smartphone,
} from 'lucide-react';
import { formatBytes } from '../utils/formatters';

export interface ShareDrawerData {
  shareCode: string;
  title?: string;
  fileCount: number;
  totalSize: number;
  expiresAt: string | null;
  maxDownloads: number | null;
  passwordProtected?: boolean;
  fileNames?: string[];
  qrCodeDataUrl?: string;
}

interface ShareLinksDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  data: ShareDrawerData | null;
}

export const ShareLinksDrawer: React.FC<ShareLinksDrawerProps> = ({ isOpen, onClose, data }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [emailNote, setEmailNote] = useState('');
  const [activeTab, setActiveTab] = useState<'links' | 'channels' | 'email' | 'embed'>('links');

  if (!isOpen || !data) return null;

  const origin = window.location.origin;
  const standardUrl = `${origin}/?code=${data.shareCode}`;
  const shortUrl = `${origin}/s/${data.shareCode}`;
  const directDownloadUrl = `${origin}/api/shares/${data.shareCode}/download/all`;

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      // fallback
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Drop Code: ${data.fileCount} file(s) (${formatBytes(data.totalSize)})`,
          text: `Download files securely using Drop Code: ${data.shareCode}`,
          url: standardUrl,
        });
      } catch {
        // User cancelled or not supported
      }
    } else {
      copyToClipboard(standardUrl, 'standard');
    }
  };

  // Pre-formatted text for sharing
  const shareText = `Download ${data.fileCount} file(s) [${formatBytes(data.totalSize)}] via Drop Code. Link: ${shortUrl} (Code: ${data.shareCode})`;
  const encodedText = encodeURIComponent(shareText);
  const encodedUrl = encodeURIComponent(standardUrl);

  const emailSubject = encodeURIComponent(`Secure File Transfer: ${data.shareCode} (${data.fileCount} files)`);
  const emailBody = encodeURIComponent(
    `Hello,\n\nI have shared ${data.fileCount} file(s) with you (${formatBytes(data.totalSize)}) via Drop Code.\n\n` +
      `Access or download the files here:\n${standardUrl}\n\n` +
      `Or use Short Link: ${shortUrl}\n` +
      `Or enter Code on https://dropcode.io: ${data.shareCode}\n` +
      (data.passwordProtected ? `\nNote: This transfer is password-protected. I will provide the password separately.\n` : '') +
      (emailNote.trim() ? `\nPersonal Message:\n"${emailNote.trim()}"\n` : '') +
      `\nSecurity: End-to-end encrypted transfer with automatic expiration.\n`
  );

  const handleSendEmailClient = () => {
    const mailto = `mailto:${recipientEmail.trim()}?subject=${emailSubject}&body=${emailBody}`;
    window.location.href = mailto;
  };

  const markdownSnippet = `[Download ${data.fileCount} file(s) (${formatBytes(data.totalSize)}) on Drop Code](${shortUrl})`;
  const htmlSnippet = `<a href="${shortUrl}" target="_blank" rel="noopener noreferrer">Download ${data.fileCount} file(s) via Drop Code (${data.shareCode})</a>`;

  const downloadQrCode = () => {
    if (!data.qrCodeDataUrl) return;
    const a = document.createElement('a');
    a.href = data.qrCodeDataUrl;
    a.download = `dropcode_${data.shareCode}_qr.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <AnimatePresence>
      <div
        id="share-drawer-overlay"
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          id="share-drawer-modal"
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
        >
          {/* Accent border top */}
          <div className="h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500" />

          {/* Close button */}
          <button
            id="share-drawer-close-btn"
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="p-6 pb-3 border-b border-slate-800/80">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Share2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-white tracking-tight">Real-Time Link & Omni Sharing</h2>
                  <span className="px-2 py-0.5 text-[11px] font-mono font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 rounded-md">
                    {data.shareCode}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {data.fileCount} {data.fileCount === 1 ? 'file' : 'files'} • {formatBytes(data.totalSize)}
                  {data.passwordProtected && ' • Password Protected'}
                </p>
              </div>
            </div>

            {/* Quick OS Share Button */}
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                id="native-share-btn"
                type="button"
                onClick={handleNativeShare}
                className="flex-1 min-w-[140px] py-2 px-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 shadow-md shadow-cyan-500/20 transition-all"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Device Share / AirDrop</span>
              </button>

              <button
                id="quick-copy-link-btn"
                type="button"
                onClick={() => copyToClipboard(shortUrl, 'short-header')}
                className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-medium rounded-xl border border-slate-700 flex items-center gap-1.5 transition-colors"
              >
                {copiedKey === 'short-header' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'short-header' ? 'Copied!' : 'Copy Short Link'}</span>
              </button>
            </div>

            {/* Sub Tabs */}
            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-800/80 overflow-x-auto scrollbar-none">
              <button
                type="button"
                onClick={() => setActiveTab('links')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                  activeTab === 'links'
                    ? 'bg-slate-800 text-cyan-300 border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                🔗 Link Formats
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('channels')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                  activeTab === 'channels'
                    ? 'bg-slate-800 text-cyan-300 border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                💬 Social & Chat
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('email')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                  activeTab === 'email'
                    ? 'bg-slate-800 text-cyan-300 border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                ✉️ Email Draft
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('embed')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                  activeTab === 'embed'
                    ? 'bg-slate-800 text-cyan-300 border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                💻 Markdown & HTML
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="p-6 space-y-5 overflow-y-auto">
            {/* TAB 1: LINK FORMATS */}
            {activeTab === 'links' && (
              <div className="space-y-4">
                {/* Clean Short Link */}
                <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-medium text-slate-300">
                    <span className="flex items-center gap-1.5 text-cyan-300">
                      <Sparkles className="w-3.5 h-3.5" />
                      Clean Short Link (Recommended)
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">Redirects directly</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={shortUrl}
                      className="flex-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 select-all focus:outline-none"
                    />
                    <button
                      id="copy-short-url-btn"
                      type="button"
                      onClick={() => copyToClipboard(shortUrl, 'short')}
                      className="px-3 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-medium rounded-lg border border-cyan-500/40 flex items-center gap-1.5 transition-colors"
                    >
                      {copiedKey === 'short' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === 'short' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                {/* Standard Full Web Link */}
                <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-medium text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-blue-400" />
                      Web Portal Link
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">Includes receive code</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={standardUrl}
                      className="flex-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 select-all focus:outline-none"
                    />
                    <button
                      id="copy-standard-url-btn"
                      type="button"
                      onClick={() => copyToClipboard(standardUrl, 'standard')}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 flex items-center gap-1.5 transition-colors"
                    >
                      {copiedKey === 'standard' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === 'standard' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                {/* Direct ZIP Download Link */}
                <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-medium text-slate-300">
                    <span className="flex items-center gap-1.5 text-emerald-400">
                      <Download className="w-3.5 h-3.5" />
                      1-Click Direct ZIP Stream Link
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">Instant download without UI</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={directDownloadUrl}
                      className="flex-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 select-all focus:outline-none"
                    />
                    <button
                      id="copy-direct-download-btn"
                      type="button"
                      onClick={() => copyToClipboard(directDownloadUrl, 'direct')}
                      className="px-3 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-medium rounded-lg border border-emerald-500/40 flex items-center gap-1.5 transition-colors"
                    >
                      {copiedKey === 'direct' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === 'direct' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                {/* QR Code and Code Card side by side */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center gap-4">
                    {data.qrCodeDataUrl ? (
                      <img
                        src={data.qrCodeDataUrl}
                        alt="Transfer QR Code"
                        className="w-20 h-20 rounded-lg border border-slate-700 bg-white p-1 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500">
                        <QrCode className="w-8 h-8" />
                      </div>
                    )}
                    <div className="space-y-1">
                      <h4 className="text-xs font-semibold text-white">Mobile Camera Scan</h4>
                      <p className="text-[11px] text-slate-400">Scan to open and receive on phone</p>
                      {data.qrCodeDataUrl && (
                        <button
                          type="button"
                          onClick={downloadQrCode}
                          className="mt-1 text-[11px] text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1"
                        >
                          <Download className="w-3 h-3" /> Save QR Image
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-semibold text-white">Manual 8-Digit Code</h4>
                      <p className="text-[11px] text-slate-400">Type on any receiver screen</p>
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/80">
                      <span className="text-base font-mono font-bold tracking-wider text-cyan-400">
                        {data.shareCode}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(data.shareCode, 'raw-code')}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors"
                      >
                        {copiedKey === 'raw-code' ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: SOCIAL & CHAT CHANNELS */}
            {activeTab === 'channels' && (
              <div className="space-y-4">
                <p className="text-xs text-slate-400">
                  Click any platform below to open a pre-filled secure download link:
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {/* WhatsApp */}
                  <a
                    href={`https://api.whatsapp.com/send?text=${encodedText}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-xl flex items-center gap-2.5 text-emerald-300 text-xs font-medium transition-all group"
                  >
                    <MessageCircle className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                    <span>WhatsApp</span>
                  </a>

                  {/* Telegram */}
                  <a
                    href={`https://t.me/share/url?url=${encodedUrl}&text=${encodeURIComponent(`Download ${data.fileCount} file(s) via Drop Code (${data.shareCode})`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 rounded-xl flex items-center gap-2.5 text-sky-300 text-xs font-medium transition-all group"
                  >
                    <Send className="w-4 h-4 text-sky-400 group-hover:scale-110 transition-transform" />
                    <span>Telegram</span>
                  </a>

                  {/* Twitter / X */}
                  <a
                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Shared files via @DropCode: ${shortUrl}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl flex items-center gap-2.5 text-slate-200 text-xs font-medium transition-all group"
                  >
                    <span className="font-bold text-sm">𝕏</span>
                    <span>Twitter / X</span>
                  </a>

                  {/* LinkedIn */}
                  <a
                    href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-600/30 rounded-xl flex items-center gap-2.5 text-blue-300 text-xs font-medium transition-all group"
                  >
                    <Globe className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
                    <span>LinkedIn</span>
                  </a>

                  {/* Reddit */}
                  <a
                    href={`https://reddit.com/submit?url=${encodedUrl}&title=${encodeURIComponent(`Drop Code File Share: ${data.shareCode}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 rounded-xl flex items-center gap-2.5 text-orange-300 text-xs font-medium transition-all group"
                  >
                    <Share2 className="w-4 h-4 text-orange-400 group-hover:scale-110 transition-transform" />
                    <span>Reddit</span>
                  </a>

                  {/* SMS */}
                  <a
                    href={`sms:?body=${encodedText}`}
                    className="p-3 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 rounded-xl flex items-center gap-2.5 text-purple-300 text-xs font-medium transition-all group"
                  >
                    <Smartphone className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
                    <span>Direct SMS</span>
                  </a>
                </div>

                {/* Slack / Discord Copy Block */}
                <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-300">Slack, Discord & Teams Formatted Card</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(shareText, 'chat-card')}
                      className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium"
                    >
                      {copiedKey === 'chat-card' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey === 'chat-card' ? 'Copied' : 'Copy Message'}</span>
                    </button>
                  </div>
                  <pre className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-300 whitespace-pre-wrap select-all">
                    {shareText}
                  </pre>
                </div>
              </div>
            )}

            {/* TAB 3: EMAIL DRAFT */}
            {activeTab === 'email' && (
              <div className="space-y-4">
                <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Recipient Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                      <input
                        type="email"
                        value={recipientEmail}
                        onChange={(e) => setRecipientEmail(e.target.value)}
                        placeholder="colleague@company.com"
                        className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Add a Custom Message <span className="text-slate-500">(included in email body)</span>
                    </label>
                    <textarea
                      rows={2}
                      value={emailNote}
                      onChange={(e) => setEmailNote(e.target.value)}
                      placeholder="Here are the design assets and deliverables we discussed..."
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 resize-none"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      id="launch-email-client-btn"
                      type="button"
                      onClick={handleSendEmailClient}
                      className="flex-1 py-2 px-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2 shadow-sm"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Open in Mail App (Outlook/Apple/Gmail)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(
                          `Subject: Secure File Transfer: ${data.shareCode}\n\n` + decodeURIComponent(emailBody),
                          'email-body'
                        )
                      }
                      className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg border border-slate-700 flex items-center gap-1.5"
                    >
                      {copiedKey === 'email-body' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === 'email-body' ? 'Copied' : 'Copy Email Text'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: MARKDOWN & HTML EMBED */}
            {activeTab === 'embed' && (
              <div className="space-y-4">
                {/* Markdown snippet */}
                <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-cyan-400" />
                      Markdown Format (GitHub, Notion, Obsidian)
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(markdownSnippet, 'markdown')}
                      className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                    >
                      {copiedKey === 'markdown' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey === 'markdown' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <pre className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-cyan-300 overflow-x-auto select-all">
                    {markdownSnippet}
                  </pre>
                </div>

                {/* HTML link snippet */}
                <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                      <Code className="w-3.5 h-3.5 text-blue-400" />
                      HTML Anchor Tag
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(htmlSnippet, 'html')}
                      className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                      {copiedKey === 'html' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey === 'html' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <pre className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-blue-300 overflow-x-auto select-all">
                    {htmlSnippet}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
