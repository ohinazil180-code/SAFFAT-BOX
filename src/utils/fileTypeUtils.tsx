import React from 'react';
import {
  FileText,
  Image as ImageIcon,
  Video as VideoIcon,
  Code as CodeIcon,
  FileCode,
  Music,
  FileArchive,
  FileSpreadsheet,
  File as GenericFileIcon,
  Layers,
} from 'lucide-react';
import { PublicFileInfo } from '../types';

export type DetectedFileType =
  | 'pdf'
  | 'image'
  | 'video'
  | 'code'
  | 'audio'
  | 'archive'
  | 'document'
  | 'other';

export interface FileTypeMetadata {
  type: DetectedFileType;
  label: string;
  categoryName: string;
  extensionLabel: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
  glowColor: string;
  badgeClass: string;
  gradient: string;
  icon: React.ComponentType<{ className?: string }>;
}

// Map of common code extensions and MIME types
const CODE_EXTENSIONS = new Set([
  'js', 'ts', 'jsx', 'tsx', 'py', 'html', 'htm', 'css', 'scss', 'sass', 'less',
  'json', 'json5', 'sql', 'sh', 'bash', 'zsh', 'fish', 'cpp', 'cc', 'c', 'h', 'hpp',
  'java', 'go', 'rs', 'php', 'rb', 'lua', 'swift', 'kt', 'kts', 'dart', 'scala',
  'r', 'yml', 'yaml', 'toml', 'xml', 'graphql', 'gql', 'proto', 'dockerfile', 'makefile',
  'env', 'md', 'mdx', 'diff', 'patch', 'vue', 'svelte', 'asm', 's', 'zig', 'wasm'
]);

const CODE_MIME_PATTERNS = [
  'text/javascript',
  'application/javascript',
  'application/x-javascript',
  'text/typescript',
  'application/typescript',
  'text/x-python',
  'application/x-python-code',
  'text/html',
  'text/css',
  'application/json',
  'application/ld+json',
  'text/x-c',
  'text/x-c++',
  'text/x-csharp',
  'text/x-java-source',
  'text/x-go',
  'text/x-rust',
  'text/x-ruby',
  'text/x-php',
  'application/sql',
  'text/x-sql',
  'application/x-sh',
  'text/x-shellscript',
  'text/x-bash',
  'text/markdown',
  'text/x-markdown',
  'application/xml',
  'text/xml',
  'application/yaml',
  'text/yaml',
  'application/x-yaml',
  'application/graphql',
  'text/x-dockerfile',
  'application/x-httpd-php',
];

const ARCHIVE_EXTENSIONS = new Set(['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'iso', 'dmg', 'pkg', 'deb', 'rpm']);
const DOCUMENT_EXTENSIONS = new Set(['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf', 'csv', 'odt', 'ods', 'odp']);
const VIDEO_EXTENSIONS = new Set(['mp4', 'mkv', 'webm', 'mov', 'avi', 'wmv', 'flv', 'm4v', '3gp', 'ts', 'ogv']);
const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'ico', 'tiff', 'tif', 'avif', 'heic', 'heif', 'psd', 'ai']);
const AUDIO_EXTENSIONS = new Set(['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'wma', 'opus', 'mid', 'midi']);

/**
 * Automatically detects file type primarily based on MIME type,
 * with intelligent fallback to file extension when MIME type is missing or generic.
 */
export function detectFileType(mimeType?: string | null, filename?: string | null): FileTypeMetadata {
  const mime = (mimeType || '').trim().toLowerCase();
  const name = (filename || '').trim().toLowerCase();
  const ext = name.includes('.') ? name.split('.').pop() || '' : '';

  // 1. PDF detection (MIME type primary)
  if (
    mime === 'application/pdf' ||
    mime === 'application/x-pdf' ||
    mime === 'application/acrobat' ||
    mime === 'applications/vnd.pdf' ||
    mime === 'text/pdf' ||
    ext === 'pdf'
  ) {
    return {
      type: 'pdf',
      label: 'PDF',
      categoryName: 'PDF Document',
      extensionLabel: 'PDF',
      textColor: 'text-rose-400',
      bgColor: 'bg-rose-500/10',
      borderColor: 'border-rose-500/25',
      glowColor: 'shadow-rose-500/20',
      badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
      gradient: 'from-rose-500 to-red-600',
      icon: FileText,
    };
  }

  // 2. Image detection (MIME type image/*)
  if (mime.startsWith('image/') || IMAGE_EXTENSIONS.has(ext)) {
    return {
      type: 'image',
      label: 'IMAGE',
      categoryName: 'Image File',
      extensionLabel: ext ? ext.toUpperCase() : 'IMG',
      textColor: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10',
      borderColor: 'border-cyan-500/25',
      glowColor: 'shadow-cyan-500/20',
      badgeClass: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
      gradient: 'from-cyan-400 to-blue-500',
      icon: ImageIcon,
    };
  }

  // 3. Video detection (MIME type video/*)
  if (mime.startsWith('video/') || VIDEO_EXTENSIONS.has(ext)) {
    return {
      type: 'video',
      label: 'VIDEO',
      categoryName: 'Video Media',
      extensionLabel: ext ? ext.toUpperCase() : 'VID',
      textColor: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/25',
      glowColor: 'shadow-purple-500/20',
      badgeClass: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
      gradient: 'from-purple-500 to-indigo-600',
      icon: VideoIcon,
    };
  }

  // 4. Code / Script detection (MIME types & scripts)
  const isCodeMime = CODE_MIME_PATTERNS.some((pattern) => mime.includes(pattern));
  if (isCodeMime || CODE_EXTENSIONS.has(ext)) {
    return {
      type: 'code',
      label: 'CODE',
      categoryName: 'Source Code',
      extensionLabel: ext ? ext.toUpperCase() : 'CODE',
      textColor: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/25',
      glowColor: 'shadow-emerald-500/20',
      badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
      gradient: 'from-emerald-400 to-teal-600',
      icon: CodeIcon,
    };
  }

  // 5. Audio detection
  if (mime.startsWith('audio/') || AUDIO_EXTENSIONS.has(ext)) {
    return {
      type: 'audio',
      label: 'AUDIO',
      categoryName: 'Audio Track',
      extensionLabel: ext ? ext.toUpperCase() : 'AUD',
      textColor: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/25',
      glowColor: 'shadow-amber-500/20',
      badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
      gradient: 'from-amber-400 to-orange-500',
      icon: Music,
    };
  }

  // 6. Archive / Compressed
  if (
    ARCHIVE_EXTENSIONS.has(ext) ||
    mime.includes('zip') ||
    mime.includes('compressed') ||
    mime.includes('tar') ||
    mime.includes('archive') ||
    mime === 'application/x-gzip' ||
    mime === 'application/x-bzip2'
  ) {
    return {
      type: 'archive',
      label: 'ARCHIVE',
      categoryName: 'Compressed Archive',
      extensionLabel: ext ? ext.toUpperCase() : 'ZIP',
      textColor: 'text-indigo-400',
      bgColor: 'bg-indigo-500/10',
      borderColor: 'border-indigo-500/25',
      glowColor: 'shadow-indigo-500/20',
      badgeClass: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
      gradient: 'from-indigo-400 to-violet-600',
      icon: FileArchive,
    };
  }

  // 7. General Office Documents / Text
  if (
    DOCUMENT_EXTENSIONS.has(ext) ||
    mime.includes('word') ||
    mime.includes('document') ||
    mime.includes('sheet') ||
    mime.includes('excel') ||
    mime.includes('powerpoint') ||
    mime.includes('presentation') ||
    mime.startsWith('text/')
  ) {
    return {
      type: 'document',
      label: 'DOC',
      categoryName: 'Document File',
      extensionLabel: ext ? ext.toUpperCase() : 'DOC',
      textColor: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/25',
      glowColor: 'shadow-blue-500/20',
      badgeClass: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
      gradient: 'from-blue-400 to-sky-600',
      icon: FileSpreadsheet,
    };
  }

  // 8. Other / Unknown binary
  return {
    type: 'other',
    label: 'FILE',
    categoryName: 'Data File',
    extensionLabel: ext ? ext.toUpperCase() : 'FILE',
    textColor: 'text-slate-400',
    bgColor: 'bg-slate-800/60',
    borderColor: 'border-white/[0.08]',
    glowColor: 'shadow-slate-500/10',
    badgeClass: 'bg-slate-800 text-slate-300 border-slate-700',
    gradient: 'from-slate-500 to-slate-700',
    icon: GenericFileIcon,
  };
}

export interface FileTypeIconProps {
  mimeType?: string | null;
  filename?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showBadge?: boolean;
  withBackground?: boolean;
  className?: string;
  iconClassName?: string;
}

/**
 * Reusable FileTypeIcon React component for automatic detection
 * and rendering of specific MIME type icons (PDF, Image, Video, Code, etc.)
 */
export const FileTypeIcon: React.FC<FileTypeIconProps> = ({
  mimeType,
  filename,
  size = 'sm',
  showBadge = false,
  withBackground = true,
  className = '',
  iconClassName = '',
}) => {
  const meta = detectFileType(mimeType, filename);
  const IconComponent = meta.icon;

  const sizeStyles = {
    xs: { box: 'h-5 w-5 rounded-md', icon: 'h-3 w-3', badgeText: 'text-[9px] px-1 py-0.2' },
    sm: { box: 'h-7 w-7 rounded-lg', icon: 'h-3.5 w-3.5', badgeText: 'text-[10px] px-1.5 py-0.5' },
    md: { box: 'h-9 w-9 rounded-xl', icon: 'h-4.5 w-4.5', badgeText: 'text-[11px] px-2 py-0.5' },
    lg: { box: 'h-11 w-11 rounded-xl', icon: 'h-5.5 w-5.5', badgeText: 'text-xs px-2.5 py-1' },
    xl: { box: 'h-14 w-14 rounded-2xl', icon: 'h-7 w-7', badgeText: 'text-xs px-3 py-1' },
  }[size];

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <div
        className={`flex shrink-0 items-center justify-center border transition-all ${sizeStyles.box} ${
          withBackground ? `${meta.bgColor} ${meta.borderColor}` : 'border-transparent bg-transparent'
        }`}
        title={`${meta.categoryName} (${filename || mimeType || 'file'})`}
      >
        <IconComponent className={`${sizeStyles.icon} ${meta.textColor} ${iconClassName}`} />
      </div>

      {showBadge && (
        <span
          className={`font-mono font-bold tracking-wider rounded border uppercase ${sizeStyles.badgeText} ${meta.badgeClass}`}
        >
          {meta.label}
        </span>
      )}
    </div>
  );
};

/**
 * Analyzes an array of files in a transfer to determine the primary or dominant file type,
 * plus type distribution for high-density transfer cards.
 */
export function analyzeTransferFiles(files?: PublicFileInfo[], fileNames?: string[]): {
  primary: FileTypeMetadata;
  isMixed: boolean;
  typeCounts: Record<DetectedFileType, number>;
  distinctTypes: DetectedFileType[];
} {
  const counts: Record<DetectedFileType, number> = {
    pdf: 0,
    image: 0,
    video: 0,
    code: 0,
    audio: 0,
    archive: 0,
    document: 0,
    other: 0,
  };

  if (files && files.length > 0) {
    for (const f of files) {
      const type = detectFileType(f.mimeType, f.originalName).type;
      counts[type] = (counts[type] || 0) + 1;
    }
  } else if (fileNames && fileNames.length > 0) {
    for (const name of fileNames) {
      const type = detectFileType(undefined, name).type;
      counts[type] = (counts[type] || 0) + 1;
    }
  } else {
    counts.other = 1;
  }

  const distinctTypes = (Object.keys(counts) as DetectedFileType[]).filter((t) => counts[t] > 0);
  const isMixed = distinctTypes.length > 1;

  // Find dominant type with highest count
  let dominantType: DetectedFileType = 'other';
  let maxCount = -1;
  for (const t of distinctTypes) {
    if (counts[t] > maxCount) {
      maxCount = counts[t];
      dominantType = t;
    }
  }

  // If mixed, create a hybrid representation
  if (isMixed) {
    return {
      primary: {
        type: dominantType,
        label: 'MIXED',
        categoryName: 'Multi-Type Bundle',
        extensionLabel: `${distinctTypes.length} TYPES`,
        textColor: 'text-cyan-300',
        bgColor: 'bg-cyan-500/10',
        borderColor: 'border-cyan-500/25',
        glowColor: 'shadow-cyan-500/20',
        badgeClass: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
        gradient: 'from-cyan-500 via-indigo-500 to-purple-600',
        icon: Layers,
      },
      isMixed: true,
      typeCounts: counts,
      distinctTypes,
    };
  }

  return {
    primary: detectFileType(
      files?.[0]?.mimeType,
      files?.[0]?.originalName || fileNames?.[0]
    ),
    isMixed: false,
    typeCounts: counts,
    distinctTypes,
  };
}
