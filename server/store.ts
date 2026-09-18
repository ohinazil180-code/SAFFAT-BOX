import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';
import { FileShare, StoredFile, TransferEvent, ShareStatus, CreateSharePayload } from './types.js';
import { generateRandomShareCode, hashPassword, verifyPassword } from './utils/crypto.js';
import { activeStorageProvider } from './storage/storageProvider.js';

class ShareStore extends EventEmitter {
  private shares: Map<string, FileShare> = new Map(); // key: upper(shareCode)
  private shareIdToCode: Map<string, string> = new Map(); // key: shareId -> shareCode
  private events: TransferEvent[] = [];
  private dataFilePath: string;
  private sseClients: Map<string, Set<(event: TransferEvent) => void>> = new Map(); // key: upper(shareCode)

  constructor() {
    super();
    this.dataFilePath = path.resolve(process.cwd(), 'data', 'shares.json');
    this.loadFromDisk();

    // Run expiration cleanup every 30 seconds
    setInterval(() => {
      this.cleanupExpired();
    }, 30000);
  }

  private loadFromDisk() {
    try {
      if (fs.existsSync(this.dataFilePath)) {
        const raw = fs.readFileSync(this.dataFilePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.shares)) {
          for (const s of parsed.shares) {
            this.shares.set(s.shareCode.toUpperCase(), s);
            this.shareIdToCode.set(s.id, s.shareCode.toUpperCase());
          }
        }
        if (Array.isArray(parsed.events)) {
          this.events = parsed.events.slice(-500); // keep last 500 events
        }
      }
    } catch (err) {
      console.warn('Could not load existing shares from disk, starting fresh', err);
    }
  }

  private saveToDisk() {
    try {
      const dir = path.dirname(this.dataFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const data = {
        shares: Array.from(this.shares.values()),
        events: this.events.slice(-300),
      };
      fs.writeFileSync(this.dataFilePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save shares to disk', err);
    }
  }

  // Subscribe to SSE events for a share code
  public subscribeToShare(shareCode: string, callback: (event: TransferEvent) => void): () => void {
    const codeKey = shareCode.toUpperCase();
    if (!this.sseClients.has(codeKey)) {
      this.sseClients.set(codeKey, new Set());
    }
    const set = this.sseClients.get(codeKey)!;
    set.add(callback);

    return () => {
      set.delete(callback);
      if (set.size === 0) {
        this.sseClients.delete(codeKey);
      }
    };
  }

  public recordEvent(
    shareId: string,
    shareCode: string,
    eventType: TransferEvent['eventType'],
    metadata?: Record<string, any>
  ): TransferEvent {
    const event: TransferEvent = {
      id: crypto.randomUUID(),
      shareId,
      shareCode,
      eventType,
      timestamp: new Date().toISOString(),
      metadata,
    };
    this.events.unshift(event);
    if (this.events.length > 500) {
      this.events.pop();
    }

    // Broadcast to SSE clients subscribed to this code
    const codeKey = shareCode.toUpperCase();
    const set = this.sseClients.get(codeKey);
    if (set) {
      for (const cb of set) {
        try {
          cb(event);
        } catch {
          // Ignore disconnected listener
        }
      }
    }

    this.saveToDisk();
    return event;
  }

  public createShare(files: StoredFile[], options: CreateSharePayload): FileShare {
    // Generate unique collision-checked code
    let code = '';
    do {
      code = generateRandomShareCode();
    } while (this.shares.has(code.toUpperCase()));

    let expiresAt: string | null = null;
    const now = Date.now();
    switch (options.expiresIn) {
      case '1h':
        expiresAt = new Date(now + 3600 * 1000).toISOString();
        break;
      case '6h':
        expiresAt = new Date(now + 6 * 3600 * 1000).toISOString();
        break;
      case '24h':
        expiresAt = new Date(now + 24 * 3600 * 1000).toISOString();
        break;
      case '7d':
        expiresAt = new Date(now + 7 * 24 * 3600 * 1000).toISOString();
        break;
      case '30d':
        expiresAt = new Date(now + 30 * 24 * 3600 * 1000).toISOString();
        break;
      case 'never':
      default:
        expiresAt = null;
        break;
    }

    let passwordHash: string | null = null;
    let passwordSalt: string | null = null;
    if (options.password && options.password.trim().length > 0) {
      const hashed = hashPassword(options.password.trim());
      passwordHash = hashed.hash;
      passwordSalt = hashed.salt;
    }

    const share: FileShare = {
      id: crypto.randomUUID(),
      shareCode: code,
      createdAt: new Date().toISOString(),
      expiresAt,
      maxDownloads: typeof options.maxDownloads === 'number' && options.maxDownloads > 0 ? options.maxDownloads : null,
      downloadCount: 0,
      passwordHash,
      passwordSalt,
      passwordEnabled: !!passwordHash,
      oneTimeShare: !!options.oneTimeShare,
      status: 'active',
      files,
      userId: options.userId,
      username: options.username,
    };

    this.shares.set(code.toUpperCase(), share);
    this.shareIdToCode.set(share.id, code.toUpperCase());

    this.recordEvent(share.id, share.shareCode, 'share_created', {
      fileCount: files.length,
      totalSize: files.reduce((acc, f) => acc + f.size, 0),
      oneTimeShare: share.oneTimeShare,
      maxDownloads: share.maxDownloads,
    });

    this.saveToDisk();
    return share;
  }

  public getShareByCode(code: string, trackAccess: boolean = false): FileShare | null {
    const key = code.toUpperCase();
    const share = this.shares.get(key);
    if (!share) return null;

    // Check expiration dynamically
    if (share.status === 'active' && share.expiresAt && new Date(share.expiresAt).getTime() <= Date.now()) {
      share.status = 'expired';
      this.recordEvent(share.id, share.shareCode, 'share_expired');
      this.saveToDisk();
    }

    // Check download limit reached
    if (share.status === 'active' && share.maxDownloads !== null && share.downloadCount >= share.maxDownloads) {
      share.status = 'download_limit_reached';
      this.saveToDisk();
    }

    if (trackAccess && share.status === 'active') {
      this.recordEvent(share.id, share.shareCode, 'share_accessed', {
        time: new Date().toISOString(),
      });
    }

    return share;
  }

  public verifySharePassword(code: string, passwordAttempt: string): boolean {
    const share = this.getShareByCode(code);
    if (!share || !share.passwordEnabled || !share.passwordHash || !share.passwordSalt) {
      return true; // No password required
    }
    return verifyPassword(passwordAttempt, share.passwordSalt, share.passwordHash);
  }

  // Atomic download reservation
  public reserveDownload(
    code: string,
    fileId?: string
  ): { success: boolean; error?: string; remainingDownloads: number | null; share?: FileShare } {
    const share = this.getShareByCode(code);
    if (!share) {
      return { success: false, error: 'Share not found or expired', remainingDownloads: 0 };
    }

    if (share.status !== 'active') {
      return {
        success: false,
        error: `Share is no longer available (${share.status.replace(/_/g, ' ')})`,
        remainingDownloads: 0,
      };
    }

    if (share.expiresAt && new Date(share.expiresAt).getTime() <= Date.now()) {
      share.status = 'expired';
      this.recordEvent(share.id, share.shareCode, 'share_expired');
      this.saveToDisk();
      return { success: false, error: 'Share has expired', remainingDownloads: 0 };
    }

    if (share.maxDownloads !== null && share.downloadCount >= share.maxDownloads) {
      share.status = 'download_limit_reached';
      this.saveToDisk();
      return { success: false, error: 'Download limit reached', remainingDownloads: 0 };
    }

    // Increment atomically
    share.downloadCount += 1;

    // Check if one-time share or reached limit
    if (share.oneTimeShare) {
      share.status = 'download_limit_reached';
    } else if (share.maxDownloads !== null && share.downloadCount >= share.maxDownloads) {
      share.status = 'download_limit_reached';
    }

    const remaining = share.maxDownloads !== null ? Math.max(0, share.maxDownloads - share.downloadCount) : null;

    const targetFile = fileId ? share.files.find((f) => f.id === fileId) : undefined;

    this.recordEvent(share.id, share.shareCode, 'download_started', {
      fileId,
      fileName: targetFile?.originalName || 'all_files.zip',
      downloadCount: share.downloadCount,
      remaining,
    });

    this.saveToDisk();

    // If one-time share was consumed, trigger physical file purge in background after stream completes
    if (share.oneTimeShare) {
      setTimeout(() => {
        this.purgeShareFiles(share);
      }, 5000); // 5s grace period while download finishes streaming
    }

    return { success: true, remainingDownloads: remaining, share };
  }

  public completeDownload(code: string, fileId?: string) {
    const share = this.getShareByCode(code);
    if (!share) return;
    const targetFile = fileId ? share.files.find((f) => f.id === fileId) : undefined;
    this.recordEvent(share.id, share.shareCode, 'download_completed', {
      fileId,
      fileName: targetFile?.originalName || 'all_files.zip',
      downloadCount: share.downloadCount,
    });
  }

  public revokeShare(code: string): boolean {
    const share = this.getShareByCode(code);
    if (!share) return false;
    share.status = 'revoked';
    this.recordEvent(share.id, share.shareCode, 'share_revoked');
    this.saveToDisk();
    this.purgeShareFiles(share);
    return true;
  }

  public async purgeShareFiles(share: FileShare) {
    for (const f of share.files) {
      try {
        await activeStorageProvider.delete(f.storagePath);
      } catch (err) {
        console.warn(`Failed to delete storage file ${f.storagePath}`, err);
      }
    }
  }

  public async cleanupExpired() {
    const now = Date.now();
    for (const share of this.shares.values()) {
      if (share.status === 'active' && share.expiresAt && new Date(share.expiresAt).getTime() <= now) {
        share.status = 'expired';
        this.recordEvent(share.id, share.shareCode, 'share_expired');
        await this.purgeShareFiles(share);
      }
    }
    this.saveToDisk();
  }

  public getRecentShares(): FileShare[] {
    return Array.from(this.shares.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 50);
  }

  public getRecentEvents(limit: number = 50): TransferEvent[] {
    return this.events.slice(0, limit);
  }

  public getStats() {
    const all = Array.from(this.shares.values());
    const active = all.filter((s) => s.status === 'active');
    const totalFiles = all.reduce((acc, s) => acc + s.files.length, 0);
    const totalBytes = all.reduce((acc, s) => acc + s.files.reduce((fa, f) => fa + f.size, 0), 0);
    const totalDownloads = all.reduce((acc, s) => acc + s.downloadCount, 0);

    return {
      activeSharesCount: active.length,
      totalSharesCount: all.length,
      totalFilesCount: totalFiles,
      totalStorageBytes: totalBytes,
      totalDownloadsServed: totalDownloads,
      recentEventsCount: this.events.length,
    };
  }
}

export const globalShareStore = new ShareStore();
