export type ShareStatus = 'active' | 'expired' | 'download_limit_reached' | 'revoked';

export type EventType =
  | 'share_created'
  | 'share_accessed'
  | 'download_started'
  | 'download_completed'
  | 'share_expired'
  | 'share_revoked';

export interface StoredFile {
  id: string;
  originalName: string;
  sanitizedName: string;
  storagePath: string;
  mimeType: string;
  size: number;
  checksum: string; // SHA-256
  createdAt: string;
}

export interface FileShare {
  id: string;
  shareCode: string; // formatted XXXX-XXXX
  title?: string;
  note?: string;
  createdAt: string;
  expiresAt: string | null; // ISO date string or null for never
  maxDownloads: number | null; // null for unlimited
  downloadCount: number;
  passwordHash: string | null;
  passwordSalt: string | null;
  passwordEnabled: boolean;
  oneTimeShare: boolean;
  status: ShareStatus;
  files: StoredFile[];
  userId?: string;
  username?: string;
  qrCodeDataUrl?: string;
  shortUrl?: string;
}

export interface User {
  id: string;
  email: string;
  username: string;
  name: string;
  passwordHash: string;
  passwordSalt: string;
  avatarColor: string;
  createdAt: string;
  lastLoginAt?: string;
}

export interface UserSession {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
}

export interface PublicUser {
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

export interface TransferEvent {
  id: string;
  shareId: string;
  shareCode: string;
  eventType: EventType;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface CreateSharePayload {
  title?: string;
  note?: string;
  expiresIn?: '1h' | '6h' | '24h' | '7d' | '30d' | 'never';
  maxDownloads?: number | null; // e.g. 1, 5, 10, 25, 50, 100, null
  password?: string;
  oneTimeShare?: boolean;
  userId?: string;
  username?: string;
}

export interface PublicFileInfo {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  checksum?: string;
  isBrowserPreviewable: boolean;
}

export interface PublicShareResponse {
  shareCode: string;
  title?: string;
  note?: string;
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
}
