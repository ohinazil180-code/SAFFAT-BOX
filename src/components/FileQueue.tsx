import React from 'react';
import { Trash2, File, Image, Video, Music, Archive, Code, FileText } from 'lucide-react';
import { formatBytes, getFileCategory } from '../utils/formatters';

interface FileQueueProps {
  files: File[];
  onRemoveFile: (index: number) => void;
  onClearAll: () => void;
  disabled?: boolean;
}

export const FileQueue: React.FC<FileQueueProps> = ({ files, onRemoveFile, onClearAll, disabled }) => {
  if (files.length === 0) return null;

  const totalBytes = files.reduce((acc, f) => acc + f.size, 0);

  const getIcon = (category: string) => {
    switch (category) {
      case 'image':
        return <Image className="h-4 w-4 text-emerald-400" />;
      case 'video':
        return <Video className="h-4 w-4 text-rose-400" />;
      case 'audio':
        return <Music className="h-4 w-4 text-amber-400" />;
      case 'archive':
        return <Archive className="h-4 w-4 text-purple-400" />;
      case 'code':
        return <Code className="h-4 w-4 text-cyan-400" />;
      case 'document':
        return <FileText className="h-4 w-4 text-blue-400" />;
      default:
        return <File className="h-4 w-4 text-slate-400" />;
    }
  };

  return (
    <div className="mt-4 rounded-xl border border-white/[0.08] bg-slate-900/40 p-4">
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-slate-400">
            Selected Files ({files.length})
          </span>
          <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-xs text-slate-300">
            {formatBytes(totalBytes)}
          </span>
        </div>
        <button
          id="clear-file-queue-btn"
          onClick={onClearAll}
          disabled={disabled}
          className="text-xs text-slate-400 hover:text-rose-400 transition-colors disabled:opacity-50"
        >
          Clear All
        </button>
      </div>

      <div className="mt-3 divide-y divide-white/[0.04] max-h-60 overflow-y-auto pr-1">
        {files.map((file, index) => {
          const category = getFileCategory(file.type, file.name);
          return (
            <div key={`${file.name}-${index}`} className="flex items-center justify-between py-2.5 px-2 hover:bg-white/[0.02] rounded-lg">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-800/80 border border-white/[0.06]">
                  {getIcon(category)}
                </div>
                <div className="truncate">
                  <p className="truncate text-xs font-medium text-slate-200">{file.name}</p>
                  <p className="font-mono text-[11px] text-slate-400">{formatBytes(file.size)}</p>
                </div>
              </div>

              <button
                id={`remove-file-${index}-btn`}
                onClick={() => onRemoveFile(index)}
                disabled={disabled}
                className="shrink-0 p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors disabled:opacity-50"
                title="Remove file"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
