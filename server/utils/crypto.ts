import crypto from 'crypto';
import path from 'path';

// Clean alphabet avoiding 0, O, 1, I, L to prevent human transcription errors
const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

export function generateRandomShareCode(): string {
  const bytes = crypto.randomBytes(8);
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  // Format as XXXX-XXXX
  return `${result.slice(0, 4)}-${result.slice(4, 8)}`;
}

export function sanitizeShareCode(input: string): string {
  if (!input) return '';
  const cleaned = input.toUpperCase().replace(/[^2-9A-HJ-NP-Z]/g, '');
  if (cleaned.length >= 8) {
    return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 8)}`;
  }
  return cleaned;
}

export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const finalSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, finalSalt, 10000, 64, 'sha512').toString('hex');
  return { hash, salt: finalSalt };
}

export function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  const computed = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(computed, 'hex'), Buffer.from(expectedHash, 'hex'));
  } catch {
    return false;
  }
}

export function calculateChecksum(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

export function sanitizeFilename(originalName: string): string {
  const parsed = path.parse(originalName || 'file');
  const safeName = parsed.name.replace(/[^a-zA-Z0-9_\-\.]/g, '_').slice(0, 100) || 'file';
  const safeExt = parsed.ext.replace(/[^a-zA-Z0-9\.]/g, '').slice(0, 10);
  return `${safeName}${safeExt}`;
}

export function isBrowserSafePreview(mimeType: string, filename: string): boolean {
  const lowerMime = (mimeType || '').toLowerCase();
  const lowerExt = path.extname(filename || '').toLowerCase();

  // Images
  if (
    ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/x-icon'].includes(lowerMime) ||
    ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.ico'].includes(lowerExt)
  ) {
    return true;
  }

  // Audio
  if (
    ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/aac', 'audio/flac'].includes(lowerMime) ||
    ['.mp3', '.wav', '.ogg', '.webm', '.aac', '.flac'].includes(lowerExt)
  ) {
    return true;
  }

  // Video
  if (
    ['video/mp4', 'video/webm', 'video/ogg'].includes(lowerMime) ||
    ['.mp4', '.webm', '.ogv'].includes(lowerExt)
  ) {
    return true;
  }

  // PDF
  if (lowerMime === 'application/pdf' || lowerExt === '.pdf') {
    return true;
  }

  // Text / Code
  if (
    lowerMime.startsWith('text/') ||
    ['application/json', 'application/javascript', 'application/typescript', 'application/xml'].includes(lowerMime) ||
    ['.txt', '.md', '.json', '.js', '.ts', '.tsx', '.jsx', '.css', '.html', '.csv', '.xml', '.yml', '.yaml', '.log', '.sh', '.py', '.sql'].includes(lowerExt)
  ) {
    return true;
  }

  return false;
}
