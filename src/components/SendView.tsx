import React, { useState } from 'react';
import { DropZone } from './DropZone';
import { FileQueue } from './FileQueue';
import { ShareCreatedModal } from './ShareCreatedModal';
import { CreatedShareResult } from '../types';
import { Shield, Clock, DownloadCloud, Lock, Eye, EyeOff, Sparkles, Flame, Check, UserCheck, LogIn } from 'lucide-react';
import { formatBytes } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';

interface SendViewProps {
  onGoToTransfers: () => void;
  onShareCreatedGlobal?: (share: CreatedShareResult) => void;
}

export const SendView: React.FC<SendViewProps> = ({ onGoToTransfers, onShareCreatedGlobal }) => {
  const { user, token, openAuthModal } = useAuth();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [expiresIn, setExpiresIn] = useState<'1h' | '6h' | '24h' | '7d' | '30d' | 'never'>('24h');
  const [maxDownloads, setMaxDownloads] = useState<string>('unlimited');
  const [oneTimeShare, setOneTimeShare] = useState<boolean>(false);
  const [enablePassword, setEnablePassword] = useState<boolean>(false);
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Uploading status
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadedBytes, setUploadedBytes] = useState<number>(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Success result
  const [createdShare, setCreatedShare] = useState<CreatedShareResult | null>(null);

  const handleFilesSelected = (newFiles: File[]) => {
    setSelectedFiles((prev) => [...prev, ...newFiles]);
    setUploadError(null);
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClearAll = () => {
    setSelectedFiles([]);
    setUploadError(null);
  };

  const handleUploadAndCreateShare = async () => {
    if (selectedFiles.length === 0) {
      setUploadError('Please select at least one file to share');
      return;
    }

    if (enablePassword && (!password || password.trim().length === 0)) {
      setUploadError('Please enter a password or disable password protection');
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);
    setUploadError(null);

    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => {
        formData.append('files', file);
      });

      formData.append('expiresIn', expiresIn);
      formData.append('oneTimeShare', String(oneTimeShare));

      if (!oneTimeShare && maxDownloads !== 'unlimited') {
        formData.append('maxDownloads', maxDownloads);
      }

      if (enablePassword && password.trim()) {
        formData.append('password', password.trim());
      }

      // Use XMLHttpRequest for real upload progress
      const xhr = new XMLHttpRequest();

      const uploadPromise = new Promise<{ share: any; shareUrl: string; qrCodeDataUrl: string }>((resolve, reject) => {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 95);
            setUploadProgress(pct);
            setUploadedBytes(e.loaded);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const res = JSON.parse(xhr.responseText);
              resolve(res);
            } catch (parseErr) {
              reject(new Error('Invalid response from server'));
            }
          } else {
            try {
              const errRes = JSON.parse(xhr.responseText);
              reject(new Error(errRes.error || `Upload failed with status ${xhr.status}`));
            } catch {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Network error during file upload'));
        });

        xhr.open('POST', '/api/shares');
        if (token) {
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }
        xhr.send(formData);
      });

      const data = await uploadPromise;
      setUploadProgress(100);

      const result: CreatedShareResult = {
        ...data.share,
        shareUrl: data.shareUrl,
        shortUrl: (data as any).shortUrl,
        directDownloadUrl: (data as any).directDownloadUrl,
        qrCodeDataUrl: data.qrCodeDataUrl,
      };

      setCreatedShare(result);
      if (onShareCreatedGlobal) {
        onShareCreatedGlobal(result);
      }

      // Clear local file list
      setSelectedFiles([]);
      setPassword('');
    } catch (err: any) {
      console.error('Upload error:', err);
      setUploadError(err.message || 'Failed to upload files');
    } finally {
      setIsUploading(false);
    }
  };

  const totalBytes = selectedFiles.reduce((acc, f) => acc + f.size, 0);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      {/* If share created, show success modal */}
      {createdShare ? (
        <ShareCreatedModal
          share={createdShare}
          onClose={() => setCreatedShare(null)}
          onGoToTransfers={onGoToTransfers}
        />
      ) : (
        <div className="space-y-6">
          {/* Hero Section */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3.5 py-1 text-xs font-semibold text-cyan-300 backdrop-blur-md mb-3">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Realtime End-to-End File Transfer</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
              Share any file. One code. <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">Anywhere.</span>
            </h1>
            <p className="mt-2 text-sm text-slate-400 max-w-xl mx-auto">
              Upload your files, receive a secure 8-character temporary code, and share it with your recipient. No account required.
            </p>
          </div>

          {/* Upload Dropzone */}
          <DropZone onFilesSelected={handleFilesSelected} disabled={isUploading} />

          {/* File Queue */}
          <FileQueue
            files={selectedFiles}
            onRemoveFile={handleRemoveFile}
            onClearAll={handleClearAll}
            disabled={isUploading}
          />

          {/* Sharing Security & Expiration Settings */}
          {selectedFiles.length > 0 && (
            <div className="rounded-2xl border border-white/[0.08] bg-slate-900/60 p-5 sm:p-6 backdrop-blur-md">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                <Shield className="h-4 w-4 text-cyan-400" />
                <span>Transfer Configuration & Security</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Expiration */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    <span>Expiration Window</span>
                  </label>
                  <select
                    id="expiration-select"
                    value={expiresIn}
                    onChange={(e: any) => setExpiresIn(e.target.value)}
                    disabled={isUploading}
                    className="w-full rounded-xl border border-white/[0.1] bg-slate-950 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="1h">1 Hour</option>
                    <option value="6h">6 Hours</option>
                    <option value="24h">24 Hours (Default)</option>
                    <option value="7d">7 Days</option>
                    <option value="30d">30 Days</option>
                    <option value="never">Never Expires</option>
                  </select>
                </div>

                {/* Download Limit */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <DownloadCloud className="h-3.5 w-3.5 text-slate-400" />
                    <span>Download Limit</span>
                  </label>
                  <select
                    id="download-limit-select"
                    value={oneTimeShare ? '1' : maxDownloads}
                    onChange={(e) => {
                      if (e.target.value === '1') {
                        setOneTimeShare(true);
                      } else {
                        setOneTimeShare(false);
                        setMaxDownloads(e.target.value);
                      }
                    }}
                    disabled={isUploading}
                    className="w-full rounded-xl border border-white/[0.1] bg-slate-950 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="1">1 Download (One-Time Burn)</option>
                    <option value="5">5 Downloads</option>
                    <option value="10">10 Downloads</option>
                    <option value="25">25 Downloads</option>
                    <option value="50">50 Downloads</option>
                    <option value="100">100 Downloads</option>
                    <option value="unlimited">Unlimited Downloads</option>
                  </select>
                </div>
              </div>

              {/* One-Time Burn Toggle */}
              <div className="mt-4 flex items-center justify-between rounded-xl border border-white/[0.06] bg-slate-950/50 p-3">
                <div className="flex items-center gap-2.5">
                  <div className={`p-1.5 rounded-lg ${oneTimeShare ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-800 text-slate-400'}`}>
                    <Flame className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-200">Self-Destruct (One-Time Share)</p>
                    <p className="text-[11px] text-slate-400">Permanently delete files from server after first successful download.</p>
                  </div>
                </div>
                <button
                  id="one-time-share-toggle"
                  type="button"
                  onClick={() => setOneTimeShare(!oneTimeShare)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    oneTimeShare ? 'bg-rose-500' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      oneTimeShare ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Password Protection Option */}
              <div className="mt-4 rounded-xl border border-white/[0.06] bg-slate-950/50 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-1.5 rounded-lg ${enablePassword ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-800 text-slate-400'}`}>
                      <Lock className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-200">Password Protection</p>
                      <p className="text-[11px] text-slate-400">Require a secret password to preview or download files.</p>
                    </div>
                  </div>
                  <button
                    id="password-protection-toggle"
                    type="button"
                    onClick={() => setEnablePassword(!enablePassword)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      enablePassword ? 'bg-cyan-500' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        enablePassword ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {enablePassword && (
                  <div className="mt-3 relative">
                    <input
                      id="share-password-input"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter a secret password"
                      className="w-full rounded-xl border border-cyan-500/40 bg-slate-900 px-3.5 py-2 pr-10 text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Error message */}
          {uploadError && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-300">
              {uploadError}
            </div>
          )}

          {/* Upload Progress Bar */}
          {isUploading && (
            <div className="rounded-xl border border-white/[0.08] bg-slate-900/80 p-4">
              <div className="flex items-center justify-between text-xs font-mono mb-2">
                <span className="text-cyan-400 font-semibold">UPLOADING PAYLOAD...</span>
                <span className="text-slate-300">
                  {uploadProgress}% ({formatBytes(uploadedBytes)} / {formatBytes(totalBytes)})
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 transition-all duration-150"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Account Status / Attribution Banner */}
          {selectedFiles.length > 0 && !isUploading && (
            <div className="rounded-xl border border-white/[0.08] bg-slate-900/60 p-3.5 flex items-center justify-between gap-3">
              {user ? (
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-7 h-7 rounded-lg bg-gradient-to-br ${
                      user.avatarColor || 'from-cyan-500 to-blue-600'
                    } flex items-center justify-center text-white font-bold text-xs shrink-0`}
                  >
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-200">
                      Uploading as <span className="text-cyan-400 font-semibold font-mono">@{user.username}</span>
                    </p>
                    <p className="text-[11px] text-slate-400">
                      This transfer will be saved to your dashboard for live tracking and revocation.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2 w-2 rounded-full bg-amber-400"></span>
                    <span className="text-xs text-slate-300">
                      Guest mode active. Want persistent tracking & link management?
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => openAuthModal('signup')}
                    className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 hover:underline whitespace-nowrap ml-2"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Sign In / Up</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Primary Action Button */}
          {selectedFiles.length > 0 && !isUploading && (
            <button
              id="upload-create-share-btn"
              onClick={handleUploadAndCreateShare}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-600 px-6 py-4 text-sm font-bold text-white shadow-lg shadow-cyan-500/20 hover:from-cyan-400 hover:to-indigo-500 hover:shadow-cyan-500/30 transition-all"
            >
              <Sparkles className="h-4 w-4" />
              <span>Generate Share Code ({selectedFiles.length} {selectedFiles.length === 1 ? 'file' : 'files'})</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
