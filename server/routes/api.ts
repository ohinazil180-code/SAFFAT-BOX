import express, { Request, Response } from 'express';
import multer from 'multer';
import QRCode from 'qrcode';
import * as archiverModule from 'archiver';
const archiver = (archiverModule as any).default || archiverModule;
import path from 'path';
import crypto from 'crypto';
import { globalShareStore } from '../store.js';
import { globalAuthStore } from '../auth.js';
import { activeStorageProvider } from '../storage/storageProvider.js';
import { calculateChecksum, sanitizeFilename, isBrowserSafePreview, sanitizeShareCode } from '../utils/crypto.js';
import { StoredFile, PublicShareResponse, PublicFileInfo, PublicUser } from '../types.js';

const router = express.Router();

// Helper to extract authenticated user from Authorization header
function getAuthUser(req: Request): PublicUser | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  return globalAuthStore.getUserByToken(token);
}

// Configure multer for memory buffer uploads up to 100MB per file
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB per file
    files: 20, // up to 20 files per share
  },
});

// Helper to verify unlock token
function verifyUnlockToken(code: string, token?: string): boolean {
  if (!token) return false;
  try {
    const [c, exp, hash] = Buffer.from(token, 'base64url').toString('utf-8').split(':::');
    if (c.toUpperCase() !== code.toUpperCase()) return false;
    if (Date.now() > Number(exp)) return false;
    const expectedHash = crypto.createHmac('sha256', 'dropcode-secret-salt').update(`${c}:${exp}`).digest('hex');
    return hash === expectedHash;
  } catch {
    return false;
  }
}

function generateUnlockToken(code: string): string {
  const exp = Date.now() + 24 * 3600 * 1000; // 24h validity
  const hash = crypto.createHmac('sha256', 'dropcode-secret-salt').update(`${code.toUpperCase()}:${exp}`).digest('hex');
  return Buffer.from(`${code.toUpperCase()}:::${exp}:::${hash}`).toString('base64url');
}

// POST /api/shares - Upload files and create share
router.post('/shares', upload.array('files', 20), async (req: Request, res: Response): Promise<void> => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({ error: 'No files provided' });
      return;
    }

    const { expiresIn, maxDownloads, password, oneTimeShare } = req.body;

    const storedFiles: StoredFile[] = [];

    for (const f of files) {
      const fileId = crypto.randomUUID();
      const sanitized = sanitizeFilename(f.originalname);
      const storageSubPath = path.join(fileId.slice(0, 2), `${fileId}_${sanitized}`);

      // Upload via StorageProvider
      await activeStorageProvider.upload(storageSubPath, f.buffer, f.mimetype);

      const checksum = calculateChecksum(f.buffer);

      storedFiles.push({
        id: fileId,
        originalName: f.originalname,
        sanitizedName: sanitized,
        storagePath: storageSubPath,
        mimeType: f.mimetype || 'application/octet-stream',
        size: f.size,
        checksum,
        createdAt: new Date().toISOString(),
      });
    }

    const parsedMaxDownloads = maxDownloads ? parseInt(maxDownloads, 10) : null;
    const isOneTime = oneTimeShare === 'true' || oneTimeShare === true;
    const authUser = getAuthUser(req);

    const share = globalShareStore.createShare(storedFiles, {
      expiresIn: expiresIn || '24h',
      maxDownloads: isOneTime ? 1 : (parsedMaxDownloads && parsedMaxDownloads > 0 ? parsedMaxDownloads : null),
      password: password && password.trim().length > 0 ? password.trim() : undefined,
      oneTimeShare: isOneTime,
      userId: authUser?.id,
      username: authUser?.username,
    });

    // Generate QR Code data URL for the share link
    const host = req.get('host') || 'localhost:3000';
    const proto = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
    const receiveUrl = `${proto}://${host}/?code=${share.shareCode}`;
    const shortUrl = `${proto}://${host}/s/${share.shareCode}`;
    const directDownloadUrl = `${proto}://${host}/api/shares/${share.shareCode}/download/all`;

    let qrCodeDataUrl = '';
    try {
      qrCodeDataUrl = await QRCode.toDataURL(receiveUrl, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 300,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      });
    } catch (qrErr) {
      console.warn('QR code generation warning:', qrErr);
    }

    share.qrCodeDataUrl = qrCodeDataUrl;
    share.shortUrl = shortUrl;

    res.status(201).json({
      success: true,
      share: {
        shareCode: share.shareCode,
        id: share.id,
        createdAt: share.createdAt,
        expiresAt: share.expiresAt,
        maxDownloads: share.maxDownloads,
        oneTimeShare: share.oneTimeShare,
        passwordProtected: share.passwordEnabled,
        fileCount: share.files.length,
        totalSize: share.files.reduce((acc, sf) => acc + sf.size, 0),
        status: share.status,
        userId: share.userId,
        username: share.username,
      },
      shareUrl: receiveUrl,
      shortUrl,
      directDownloadUrl,
      qrCodeDataUrl,
    });
  } catch (error: any) {
    console.error('Error creating share:', error);
    res.status(500).json({ error: error.message || 'Failed to upload and create share' });
  }
});

// GET /api/shares/:code - Lookup share metadata
router.get('/shares/:code', async (req: Request, res: Response): Promise<void> => {
  try {
    const rawCode = req.params.code;
    const code = sanitizeShareCode(rawCode);

    const share = globalShareStore.getShareByCode(code, true);
    if (!share) {
      res.status(404).json({ error: 'Share not found or has been revoked', code: 'INVALID_CODE' });
      return;
    }

    if (share.status === 'expired') {
      res.status(410).json({ error: 'This share has expired', code: 'EXPIRED_SHARE', status: 'expired' });
      return;
    }

    if (share.status === 'download_limit_reached') {
      res.status(410).json({ error: 'Download limit has been reached for this share', code: 'DOWNLOAD_LIMIT_REACHED', status: 'download_limit_reached' });
      return;
    }

    if (share.status === 'revoked') {
      res.status(410).json({ error: 'This share was revoked by the sender', code: 'REVOKED_SHARE', status: 'revoked' });
      return;
    }

    // Check password protection
    const authHeader = req.headers.authorization?.replace(/^Bearer\s+/i, '');
    const token = (req.query.token as string) || authHeader;
    const isUnlocked = !share.passwordEnabled || verifyUnlockToken(code, token);

    const downloadsRemaining = share.maxDownloads !== null ? Math.max(0, share.maxDownloads - share.downloadCount) : null;
    const totalSize = share.files.reduce((acc, f) => acc + f.size, 0);

    const publicFiles: PublicFileInfo[] = share.files.map((f) => ({
      id: f.id,
      originalName: isUnlocked ? f.originalName : 'Protected File',
      mimeType: isUnlocked ? f.mimeType : 'application/octet-stream',
      size: f.size,
      isBrowserPreviewable: isUnlocked ? isBrowserSafePreview(f.mimeType, f.originalName) : false,
    }));

    const response: PublicShareResponse = {
      shareCode: share.shareCode,
      createdAt: share.createdAt,
      expiresAt: share.expiresAt,
      maxDownloads: share.maxDownloads,
      downloadCount: share.downloadCount,
      downloadsRemaining,
      passwordProtected: share.passwordEnabled,
      isUnlocked,
      oneTimeShare: share.oneTimeShare,
      status: share.status,
      totalSize,
      files: publicFiles,
    };

    res.json(response);
  } catch (error: any) {
    console.error('Error fetching share:', error);
    res.status(500).json({ error: 'Failed to retrieve share' });
  }
});

// POST /api/shares/:code/unlock - Unlock password-protected share
router.post('/shares/:code/unlock', (req: Request, res: Response): void => {
  try {
    const rawCode = req.params.code;
    const code = sanitizeShareCode(rawCode);
    const { password } = req.body;

    if (!password) {
      res.status(400).json({ error: 'Password required' });
      return;
    }

    const share = globalShareStore.getShareByCode(code);
    if (!share) {
      res.status(404).json({ error: 'Share not found' });
      return;
    }

    const isValid = globalShareStore.verifySharePassword(code, password);
    if (!isValid) {
      res.status(401).json({ error: 'Incorrect password', code: 'INVALID_PASSWORD' });
      return;
    }

    const token = generateUnlockToken(code);
    res.json({ success: true, token });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to unlock share' });
  }
});

// GET /api/shares/:code/preview/:fileId - Safe in-browser preview
router.get('/shares/:code/preview/:fileId', async (req: Request, res: Response): Promise<void> => {
  try {
    const code = sanitizeShareCode(req.params.code);
    const fileId = req.params.fileId;

    const share = globalShareStore.getShareByCode(code);
    if (!share || share.status !== 'active') {
      res.status(404).send('Share not available');
      return;
    }

    // Verify unlock if password protected
    if (share.passwordEnabled) {
      const token = (req.query.token as string) || req.headers.authorization?.replace(/^Bearer\s+/i, '');
      if (!verifyUnlockToken(code, token)) {
        res.status(401).send('Password required to preview');
        return;
      }
    }

    const file = share.files.find((f) => f.id === fileId);
    if (!file) {
      res.status(404).send('File not found in share');
      return;
    }

    if (!isBrowserSafePreview(file.mimeType, file.originalName)) {
      res.status(400).send('File type cannot be safely previewed in browser');
      return;
    }

    // Safe sandbox headers
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${file.sanitizedName}"`);
    res.setHeader('Content-Security-Policy', "default-src 'none'; media-src 'self' data:; img-src 'self' data:; style-src 'unsafe-inline'");
    res.setHeader('X-Content-Type-Options', 'nosniff');

    const stream = await activeStorageProvider.downloadStream(file.storagePath);
    stream.pipe(res);
  } catch (error: any) {
    console.error('Preview error:', error);
    res.status(500).send('Failed to stream preview');
  }
});

// GET /api/shares/:code/download/:fileId - Atomic individual file download
router.get('/shares/:code/download/:fileId', async (req: Request, res: Response): Promise<void> => {
  try {
    const code = sanitizeShareCode(req.params.code);
    const fileId = req.params.fileId;

    const share = globalShareStore.getShareByCode(code);
    if (!share) {
      res.status(404).json({ error: 'Share not found' });
      return;
    }

    // Verify password if protected
    if (share.passwordEnabled) {
      const token = (req.query.token as string) || req.headers.authorization?.replace(/^Bearer\s+/i, '');
      if (!verifyUnlockToken(code, token)) {
        res.status(401).json({ error: 'Password required' });
        return;
      }
    }

    const file = share.files.find((f) => f.id === fileId);
    if (!file) {
      res.status(404).json({ error: 'File not found in share' });
      return;
    }

    // Atomically reserve download
    const reservation = globalShareStore.reserveDownload(code, fileId);
    if (!reservation.success) {
      res.status(410).json({ error: reservation.error || 'Download not authorized' });
      return;
    }

    res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.sanitizedName)}"`);
    res.setHeader('Content-Length', file.size.toString());
    res.setHeader('X-Content-Type-Options', 'nosniff');

    const stream = await activeStorageProvider.downloadStream(file.storagePath);

    stream.on('end', () => {
      globalShareStore.completeDownload(code, fileId);
    });

    stream.pipe(res);
  } catch (error: any) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Download failed' });
  }
});

// GET /api/shares/:code/download-all - Multi-file ZIP download
router.get(['/shares/:code/download-all', '/shares/:code/download/all'], async (req: Request, res: Response): Promise<void> => {
  try {
    const code = sanitizeShareCode(req.params.code);

    const share = globalShareStore.getShareByCode(code);
    if (!share) {
      res.status(404).json({ error: 'Share not found' });
      return;
    }

    // Verify password if protected
    if (share.passwordEnabled) {
      const token = (req.query.token as string) || req.headers.authorization?.replace(/^Bearer\s+/i, '');
      if (!verifyUnlockToken(code, token)) {
        res.status(401).json({ error: 'Password required' });
        return;
      }
    }

    // Atomically reserve download
    const reservation = globalShareStore.reserveDownload(code);
    if (!reservation.success) {
      res.status(410).json({ error: reservation.error || 'Download not authorized' });
      return;
    }

    const archive = archiver('zip', {
      zlib: { level: 6 },
    });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="dropcode_${code}.zip"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');

    archive.pipe(res);

    for (const file of share.files) {
      try {
        const stream = await activeStorageProvider.downloadStream(file.storagePath);
        archive.append(stream, { name: file.originalName });
      } catch (err) {
        console.warn(`Failed to append file ${file.originalName} to archive`, err);
      }
    }

    archive.on('finish', () => {
      globalShareStore.completeDownload(code);
    });

    await archive.finalize();
  } catch (error: any) {
    console.error('ZIP download error:', error);
    res.status(500).json({ error: 'ZIP download failed' });
  }
});

// GET /api/shares/:code/events - Realtime SSE events for sender/receiver
router.get('/shares/:code/events', (req: Request, res: Response): void => {
  const code = sanitizeShareCode(req.params.code);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  // Send initial connected event
  res.write(`data: ${JSON.stringify({ type: 'connected', shareCode: code, timestamp: new Date().toISOString() })}\n\n`);

  const unsubscribe = globalShareStore.subscribeToShare(code, (event) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  });

  // Keep-alive heartbeat every 15s
  const heartbeat = setInterval(() => {
    res.write(': ping\n\n');
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
});

// POST /api/shares/:code/revoke - Sender manual revocation
router.post('/shares/:code/revoke', (req: Request, res: Response): void => {
  const code = sanitizeShareCode(req.params.code);
  const success = globalShareStore.revokeShare(code);
  if (!success) {
    res.status(404).json({ error: 'Share not found' });
    return;
  }
  res.json({ success: true, message: 'Share revoked and files purged' });
});

// GET /api/transfers/recent - Get recent transfers
router.get('/transfers/recent', (req: Request, res: Response): void => {
  const shares = globalShareStore.getRecentShares().map((s) => ({
    id: s.id,
    shareCode: s.shareCode,
    createdAt: s.createdAt,
    expiresAt: s.expiresAt,
    maxDownloads: s.maxDownloads,
    downloadCount: s.downloadCount,
    passwordProtected: s.passwordEnabled,
    oneTimeShare: s.oneTimeShare,
    status: s.status,
    fileCount: s.files.length,
    totalSize: s.files.reduce((a, f) => a + f.size, 0),
    fileNames: s.files.map((f) => f.originalName),
    userId: s.userId,
    username: s.username,
    qrCodeDataUrl: s.qrCodeDataUrl,
    shortUrl: s.shortUrl,
    files: s.files.map((f) => ({
      id: f.id,
      originalName: f.originalName,
      mimeType: f.mimeType,
      size: f.size,
      checksum: f.checksum,
      isBrowserPreviewable: isBrowserSafePreview(f.mimeType, f.originalName),
    })),
  }));
  res.json(shares);
});

// ==========================================
// AUTHENTICATION & USER MANAGEMENT ROUTES
// ==========================================

// POST /api/auth/signup - Real-time register user
router.post('/auth/signup', (req: Request, res: Response): void => {
  try {
    const { email, username, password, name } = req.body;
    if (!email || !username || !password) {
      res.status(400).json({ error: 'Please provide email, username, and password' });
      return;
    }

    const result = globalAuthStore.createUser({ email, username, password, name });
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    res.status(201).json({
      success: true,
      user: result.user,
      token: result.token,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Signup failed' });
  }
});

// POST /api/auth/login - Real-time login user
router.post('/auth/login', (req: Request, res: Response): void => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      res.status(400).json({ error: 'Please enter your username/email and password' });
      return;
    }

    const result = globalAuthStore.authenticateUser(identifier, password);
    if (!result.success) {
      res.status(401).json({ error: result.error });
      return;
    }

    res.json({
      success: true,
      user: result.user,
      token: result.token,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Login failed' });
  }
});

// GET /api/auth/me - Current user session and personal stats
router.get('/auth/me', (req: Request, res: Response): void => {
  const user = getAuthUser(req);
  if (!user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  const stats = globalAuthStore.getUserStats(user.id);
  res.json({ success: true, user, stats });
});

// POST /api/auth/logout - Terminate session
router.post('/auth/logout', (req: Request, res: Response): void => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    globalAuthStore.deleteSession(token);
  }
  res.json({ success: true, message: 'Logged out successfully' });
});

// GET /api/auth/check-username - Real-time username availability check
router.get('/auth/check-username', (req: Request, res: Response): void => {
  const username = req.query.username as string;
  if (!username) {
    res.json({ available: false, message: 'Username is required' });
    return;
  }
  const available = globalAuthStore.isUsernameAvailable(username);
  res.json({
    available,
    message: available ? 'Username is available' : 'Username is taken or invalid',
  });
});

// GET /api/auth/community-stats - Live community statistics
router.get('/auth/community-stats', (req: Request, res: Response): void => {
  const stats = globalAuthStore.getActiveCommunityStats();
  res.json({ success: true, stats });
});

// GET /api/user/shares - Get shares created by logged-in user
router.get('/user/shares', (req: Request, res: Response): void => {
  const user = getAuthUser(req);
  if (!user) {
    res.status(401).json({ error: 'Authentication required to view your shares' });
    return;
  }

  const userShares = globalShareStore
    .getRecentShares()
    .filter((s) => s.userId === user.id)
    .map((s) => ({
      id: s.id,
      shareCode: s.shareCode,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
      maxDownloads: s.maxDownloads,
      downloadCount: s.downloadCount,
      passwordProtected: s.passwordEnabled,
      oneTimeShare: s.oneTimeShare,
      status: s.status,
      fileCount: s.files.length,
      totalSize: s.files.reduce((a, f) => a + f.size, 0),
      fileNames: s.files.map((f) => f.originalName),
      userId: s.userId,
      username: s.username,
      files: s.files.map((f) => ({
        id: f.id,
        originalName: f.originalName,
        mimeType: f.mimeType,
        size: f.size,
        checksum: f.checksum,
        isBrowserPreviewable: isBrowserSafePreview(f.mimeType, f.originalName),
      })),
    }));

  res.json({ success: true, shares: userShares });
});

// DELETE /api/user/shares/:code - Revoke/Delete user's own share
router.delete('/user/shares/:code', (req: Request, res: Response): void => {
  const user = getAuthUser(req);
  if (!user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const code = sanitizeShareCode(req.params.code);
  const share = globalShareStore.getShareByCode(code);
  if (!share) {
    res.status(404).json({ error: 'Share not found' });
    return;
  }

  if (share.userId && share.userId !== user.id) {
    res.status(403).json({ error: 'You do not have permission to delete this share' });
    return;
  }

  globalShareStore.revokeShare(code);
  res.json({ success: true, message: 'Share deleted successfully' });
});

// GET /api/events/live - Global real-time SSE stream across Drop Code
router.get('/events/live', (req: Request, res: Response): void => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  // Send initial message
  res.write(`data: ${JSON.stringify({ type: 'connected', time: new Date().toISOString() })}\n\n`);

  // Subscribe to auth events
  const unsubAuth = globalAuthStore.subscribe((event) => {
    res.write(`data: ${JSON.stringify({ category: 'auth', ...event })}\n\n`);
  });

  const heartbeat = setInterval(() => {
    res.write(': ping\n\n');
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
    unsubAuth();
  });
});

// GET /api/events/recent - Get recent audit/transfer activity log
router.get('/events/recent', (req: Request, res: Response): void => {
  const events = globalShareStore.getRecentEvents(50);
  res.json(events);
});

// GET /api/stats - Platform stats
router.get('/stats', (req: Request, res: Response): void => {
  const stats = globalShareStore.getStats();
  res.json({
    ...stats,
    storageEngine: activeStorageProvider.name,
    timestamp: new Date().toISOString(),
  });
});

// GET /api/health
router.get('/health', (req: Request, res: Response): void => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

export default router;
