# DROP CODE — Universal Real-Time File Sharing Platform

> **Share any file. One code. Anywhere.**

DROP CODE is a production-grade universal file sharing platform where users can share real files using a temporary 8-character code (`XXXX-XXXX`). No simulated backend, no fake APIs, and zero plaintext credentials.

---

## 🌟 Core Features

- **Real Universal File Transfer**: Supports images, audio, video, PDF, documents, archives, code, and arbitrary binary payloads up to 100MB per file.
- **Instant Secure Codes**: Cryptographically secure 8-character codes (`XXXX-XXXX`) generated with non-ambiguous alphanumerics (`23456789ABCDEFGHJKMNPQRSTUVWXYZ`) to avoid human transcription errors.
- **Direct Link & QR Code Generation**: 1-click copyable share link (`/?code=XXXX-XXXX`) and auto-generated QR code for mobile camera scanning.
- **Atomic Download Reservation**: Server-side concurrency control decrements download limits, invalidates burned links, and prevents race conditions.
- **Configurable Expiration**: 1 hour, 6 hours, 24 hours, 7 days, 30 days, or Never with an automated background garbage collection daemon.
- **One-Time Self-Destruct**: Auto-burn feature deletes files from storage immediately after the first successful download.
- **Cryptographic Password Protection**: PBKDF2 SHA-512 with 10,000 rounds and random 16-byte cryptographic salts.
- **Safe In-Browser Previews**: Sandboxed preview for browser-safe media (images, audio, video, text/code, PDF) with strict CSP headers preventing XSS.
- **Multi-File Bundles & ZIP Generation**: Dynamic streaming ZIP archiving for multi-file packages.
- **Realtime Transfer Telemetry**: Server-Sent Events (SSE) pipe live updates to senders when recipients access or complete downloads.
- **Decoupled Storage Engine**: `StorageProvider` interface abstraction supporting Local Disk, Supabase Storage, and Cloudflare R2 / S3.

---

## 🏗️ Architecture

```
Client A (Sender)
   │ (Multipart upload with progress)
   ▼
Express Backend (/api/shares)
   ├── StorageProvider (Local Disk / Supabase / R2)
   ├── Cryptographic Engine (PBKDF2, SHA-256 Checksums, Code Gen)
   └── Atomic Transaction & Expiration Daemon
         │
         ▼
Recipient (Client B)
   ├── Enter Code (XXXX-XXXX) or Open Link
   ├── Realtime Event Stream (SSE)
   ├── Safe Browser Sandbox Preview
   └── Atomic Stream Download / ZIP Archive
```

---

## 🚀 Getting Started

### 1. Installation

```bash
npm install
```

### 2. Environment Variables

Create `.env` or check `.env.example`:

```env
PORT=3000
APP_URL=http://localhost:3000
SUPABASE_URL=
SUPABASE_ANON_KEY=
```

### 3. Run Development Server

```bash
npm run dev
```

App starts at `http://localhost:3000`.

### 4. Production Build

```bash
npm run build
npm start
```

---

## 🗄️ Database & Supabase Integration

DROP CODE provides ready-to-run PostgreSQL / Supabase SQL scripts:

- `/supabase/schema.sql`: Table definitions for `files`, `shares`, `share_files`, and `share_events`.
- `/supabase/policies.sql`: Row-Level Security (RLS) policies and atomic PostgreSQL RPC functions (`atomic_reserve_download`).

To deploy to Supabase:
1. Copy the contents of `/supabase/schema.sql` into the Supabase SQL Editor.
2. Execute `/supabase/policies.sql` to enable RLS and atomic functions.

---

## 🔒 Security Baseline

- **Zero Secret Leakage**: No plaintext passwords in database or memory.
- **Strict Filename Sanitization**: Strips path traversal attempts (`../`) and dangerous characters.
- **Content-Disposition**: Downloads use `attachment; filename="..."` with `nosniff`.
- **Pre-emptive Expiration**: Daemon purges expired payloads and orphan files every 30 seconds.
