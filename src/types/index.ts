export type ShareStatus = 'active' | 'expired' | 'download_limit_reached' | 'revoked';

export interface PublicFileInfo {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  checksum?: string;
  isBrowserPreviewable: boolean;
}

export interface PublicShare {
  shareCode: string;
  createdAt: string;
  expiresAt: string | null;
  maxDownloads: number | null;
  downloadCount: number;
  downloadsRemaining: number | null;
  passwordProtected: boolean;
  isUnlocked: boolean;
  oneTimeShare: boolean;
  status: ShareStatus;
  totalSize: number;
  files: PublicFileInfo[];
  userId?: string;
  username?: string;
  shortUrl?: string;
}

export interface CreatedShareResult {
  shareCode: string;
  id: string;
  createdAt: string;
  expiresAt: string | null;
  maxDownloads: number | null;
  oneTimeShare: boolean;
  passwordProtected: boolean;
  fileCount: number;
  totalSize: number;
  status: ShareStatus;
  shareUrl: string;
  shortUrl?: string;
  directDownloadUrl?: string;
  qrCodeDataUrl: string;
  userId?: string;
  username?: string;
}

export interface User {
  id: string;
  email: string;
  username: string;
  name: string;
  avatarColor: string;
  createdAt: string;
}

export interface UserStats {
  totalShares: number;
  activeShares: number;
  totalDownloads: number;
  totalStorageBytes: number;
}

export interface AuthResponse {
  success: boolean;
  user: User;
  token: string;
}

export interface TransferEvent {
  id: string;
  shareId: string;
  shareCode: string;
  eventType: 'share_created' | 'share_accessed' | 'download_started' | 'download_completed' | 'share_expired' | 'share_revoked';
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface PlatformStats {
  activeSharesCount: number;
  totalSharesCount: number;
  totalFilesCount: number;
  totalStorageBytes: number;
  totalDownloadsServed: number;
  recentEventsCount: number;
  storageEngine: string;
}

export interface RecentTransferItem {
  id: string;
  shareCode: string;
  createdAt: string;
  expiresAt: string | null;
  maxDownloads: number | null;
  downloadCount: number;
  passwordProtected: boolean;
  oneTimeShare: boolean;
  status: ShareStatus;
  fileCount: number;
  totalSize: number;
  fileNames: string[];
  files?: PublicFileInfo[];
  userId?: string;
  username?: string;
  qrCodeDataUrl?: string;
  shortUrl?: string;
}
