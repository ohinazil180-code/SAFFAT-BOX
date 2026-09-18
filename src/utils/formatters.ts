export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function formatShareCode(input: string): string {
  if (!input) return '';
  const cleaned = input.toUpperCase().replace(/[^2-9A-HJ-NP-Z]/g, '').slice(0, 8);
  if (cleaned.length > 4) {
    return `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
  }
  return cleaned;
}

export function formatTimeRemaining(expiresAt: string | null): { text: string; isExpired: boolean; urgent: boolean } {
  if (!expiresAt) {
    return { text: 'Never expires', isExpired: false, urgent: false };
  }

  const diffMs = new Date(expiresAt).getTime() - Date.now();
  if (diffMs <= 0) {
    return { text: 'Expired', isExpired: true, urgent: true };
  }

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const urgent = hours < 1;

  if (days > 0) {
    return { text: `${days}d ${hours % 24}h remaining`, isExpired: false, urgent };
  }
  if (hours > 0) {
    return { text: `${hours}h ${minutes % 60}m remaining`, isExpired: false, urgent };
  }
  if (minutes > 0) {
    return { text: `${minutes}m ${seconds % 60}s remaining`, isExpired: false, urgent: true };
  }
  return { text: `${seconds}s remaining`, isExpired: false, urgent: true };
}

export function formatCountdownTimer(expiresAt: string | null, currentTimeMs: number = Date.now()): {
  formatted: string;
  isExpired: boolean;
  urgent: boolean;
  critical: boolean;
  totalSeconds: number;
} {
  if (!expiresAt) {
    return { formatted: 'Never expires', isExpired: false, urgent: false, critical: false, totalSeconds: Infinity };
  }

  const diffMs = new Date(expiresAt).getTime() - currentTimeMs;
  if (diffMs <= 0) {
    return { formatted: '00:00:00 (Expired)', isExpired: true, urgent: true, critical: true, totalSeconds: 0 };
  }

  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');

  let formatted = '';
  if (days > 0) {
    formatted = `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
  } else {
    formatted = `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
  }

  const critical = totalSeconds < 300; // Under 5 minutes
  const urgent = totalSeconds < 3600; // Under 1 hour

  return { formatted, isExpired: false, urgent, critical, totalSeconds };
}

export function formatRelativeTime(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const seconds = Math.max(0, Math.floor(diffMs / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function getFileCategory(mimeType: string, filename: string): 'image' | 'video' | 'audio' | 'pdf' | 'code' | 'archive' | 'document' | 'other' {
  const m = (mimeType || '').toLowerCase();
  const ext = (filename.split('.').pop() || '').toLowerCase();

  if (m.startsWith('image/')) return 'image';
  if (m.startsWith('video/')) return 'video';
  if (m.startsWith('audio/')) return 'audio';
  if (m === 'application/pdf' || ext === 'pdf') return 'pdf';
  if (
    ['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(ext) ||
    m.includes('zip') ||
    m.includes('compressed') ||
    m.includes('tar')
  ) {
    return 'archive';
  }
  if (
    ['js', 'ts', 'jsx', 'tsx', 'py', 'html', 'css', 'json', 'sql', 'sh', 'cpp', 'c', 'java', 'go', 'rs', 'php'].includes(ext) ||
    m.includes('javascript') ||
    m.includes('typescript') ||
    m.includes('json')
  ) {
    return 'code';
  }
  if (
    ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf', 'csv', 'odt', 'ods'].includes(ext) ||
    m.includes('document') ||
    m.includes('sheet') ||
    m.includes('presentation') ||
    m.startsWith('text/')
  ) {
    return 'document';
  }
  return 'other';
}
