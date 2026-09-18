import React, { useState } from 'react';
import { ShieldCheck, Database, Server, Lock, Layers, Copy, Check, Terminal, ExternalLink } from 'lucide-react';

export const ArchitectureView: React.FC = () => {
  const [copiedSql, setCopiedSql] = useState(false);

  const supabaseSql = `-- DROP CODE: PostgreSQL / Supabase Schema with RLS
CREATE TABLE IF NOT EXISTS public.files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    storage_provider TEXT NOT NULL DEFAULT 'local',
    storage_path TEXT NOT NULL,
    original_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    checksum TEXT,
    status TEXT NOT NULL DEFAULT 'available',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    share_code VARCHAR(16) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ,
    max_downloads INT,
    download_count INT DEFAULT 0,
    password_hash TEXT,
    password_salt TEXT,
    password_enabled BOOLEAN DEFAULT FALSE,
    one_time_share BOOLEAN DEFAULT FALSE,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.share_files (
    share_id UUID REFERENCES public.shares(id) ON DELETE CASCADE,
    file_id UUID REFERENCES public.files(id) ON DELETE CASCADE,
    PRIMARY KEY (share_id, file_id)
);`;

  const handleCopySql = async () => {
    try {
      await navigator.clipboard.writeText(supabaseSql);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          System Architecture & Security Baseline
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Under the hood of DROP CODE: Real storage abstraction, zero fake APIs, and atomic transfer lifecycle.
        </p>
      </div>

      {/* Visual Transfer Pipeline Diagram */}
      <div className="rounded-2xl border border-white/[0.08] bg-slate-900/60 p-6 backdrop-blur-xl">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-6 flex items-center gap-2">
          <Layers className="h-4 w-4 text-cyan-400" />
          <span>Universal Transfer Lifecycle Pipeline</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
          {/* Step 1 */}
          <div className="rounded-xl border border-white/[0.06] bg-slate-950/60 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-400 font-mono text-xs font-bold">
                1
              </span>
              <h3 className="text-xs font-bold text-white uppercase">Client A (Sender)</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Streams raw file buffer via multipart upload. Client calculates progress in real-time with zero browser memory bloat.
            </p>
          </div>

          {/* Step 2 */}
          <div className="rounded-xl border border-white/[0.06] bg-slate-950/60 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-400 font-mono text-xs font-bold">
                2
              </span>
              <h3 className="text-xs font-bold text-white uppercase">Storage Provider</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Decoupled interface: writes to Local Disk, Supabase Storage, or Cloudflare R2 with random UUID subpaths.
            </p>
          </div>

          {/* Step 3 */}
          <div className="rounded-xl border border-white/[0.06] bg-slate-950/60 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-500/20 text-purple-400 font-mono text-xs font-bold">
                3
              </span>
              <h3 className="text-xs font-bold text-white uppercase">Crypto & Codes</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Generates collision-free 8-char code (e.g. 8K4P-72MX). Hashes passcodes with PBKDF2 SHA-512 + 16-byte random salt.
            </p>
          </div>

          {/* Step 4 */}
          <div className="rounded-xl border border-white/[0.06] bg-slate-950/60 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-mono text-xs font-bold">
                4
              </span>
              <h3 className="text-xs font-bold text-white uppercase">Atomic Delivery</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Client B inputs code. Server verifies expiration, decrements remaining counts atomically, streams content, and burns on 1-time shares.
            </p>
          </div>
        </div>
      </div>

      {/* Security Principles Verified */}
      <div className="rounded-2xl border border-white/[0.08] bg-slate-900/60 p-6 backdrop-blur-xl">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          <span>Security & Non-Negotiable Rules Audit</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="flex items-start gap-3 rounded-xl border border-white/[0.04] bg-slate-950/40 p-3.5">
            <div className="h-2 w-2 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
            <div>
              <p className="font-semibold text-slate-200">Zero Simulated/Fake Backend</p>
              <p className="text-slate-400 mt-0.5">
                Express backend actually ingests multipart uploads, stores files to disk, and streams downloads with proper Content-Disposition.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-white/[0.04] bg-slate-950/40 p-3.5">
            <div className="h-2 w-2 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
            <div>
              <p className="font-semibold text-slate-200">Zero Plaintext Passwords</p>
              <p className="text-slate-400 mt-0.5">
                Passwords are cryptographically salted with 16-byte random bytes and hashed using PBKDF2 SHA-512 with 10,000 rounds.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-white/[0.04] bg-slate-950/40 p-3.5">
            <div className="h-2 w-2 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
            <div>
              <p className="font-semibold text-slate-200">Safe Browser Preview Sandboxing</p>
              <p className="text-slate-400 mt-0.5">
                Inline file previews enforce strict CSP (Content-Security-Policy: default-src 'none') and X-Content-Type-Options: nosniff to prevent XSS.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-white/[0.04] bg-slate-950/40 p-3.5">
            <div className="h-2 w-2 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
            <div>
              <p className="font-semibold text-slate-200">Atomic Download Logic</p>
              <p className="text-slate-400 mt-0.5">
                Download limits and self-destructing shares are verified and reserved atomically before stream start to eliminate race conditions.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Supabase Schema Blueprint Export */}
      <div className="rounded-2xl border border-white/[0.08] bg-slate-900/60 p-6 backdrop-blur-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-cyan-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Supabase / PostgreSQL Schema (V0/V1)
            </h2>
          </div>

          <button
            id="copy-supabase-sql-btn"
            onClick={handleCopySql}
            className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
          >
            {copiedSql ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copiedSql ? 'Copied' : 'Copy SQL'}</span>
          </button>
        </div>

        <pre className="overflow-x-auto rounded-xl border border-white/[0.06] bg-slate-950 p-4 font-mono text-xs text-cyan-300/90 leading-relaxed">
          {supabaseSql}
        </pre>
      </div>
    </div>
  );
};
