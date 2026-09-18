-- DROP CODE: Universal Real-Time File Sharing Platform
-- Supabase / PostgreSQL Database Schema (V0 / V1 / V2 / V3)

-- 1. Core Profiles (Optional Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Files Table
CREATE TABLE IF NOT EXISTS public.files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    storage_provider TEXT NOT NULL DEFAULT 'supabase', -- 'local', 'supabase', 's3', 'r2'
    storage_path TEXT NOT NULL,
    original_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    checksum TEXT,
    status TEXT NOT NULL DEFAULT 'available', -- 'available', 'deleted', 'quarantined'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 3. Shares Table
CREATE TABLE IF NOT EXISTS public.shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    share_code VARCHAR(16) UNIQUE NOT NULL,
    owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    expires_at TIMESTAMPTZ,
    max_downloads INT,
    download_count INT DEFAULT 0,
    password_hash TEXT,
    password_salt TEXT,
    password_enabled BOOLEAN DEFAULT FALSE,
    one_time_share BOOLEAN DEFAULT FALSE,
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'expired', 'download_limit_reached', 'revoked'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Share Files (Supports Multi-file Sharing)
CREATE TABLE IF NOT EXISTS public.share_files (
    share_id UUID REFERENCES public.shares(id) ON DELETE CASCADE,
    file_id UUID REFERENCES public.files(id) ON DELETE CASCADE,
    position INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (share_id, file_id)
);

-- 5. Share Realtime & Audit Events
CREATE TABLE IF NOT EXISTS public.share_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    share_id UUID REFERENCES public.shares(id) ON DELETE CASCADE,
    share_code VARCHAR(16) NOT NULL,
    event_type TEXT NOT NULL, -- 'share_created', 'share_accessed', 'download_started', 'download_completed', 'share_expired', 'share_revoked'
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Indexes for High Performance Lookup
CREATE INDEX IF NOT EXISTS idx_shares_code ON public.shares (UPPER(share_code));
CREATE INDEX IF NOT EXISTS idx_shares_status ON public.shares (status);
CREATE INDEX IF NOT EXISTS idx_shares_expires_at ON public.shares (expires_at);
CREATE INDEX IF NOT EXISTS idx_files_storage_path ON public.files (storage_path);
CREATE INDEX IF NOT EXISTS idx_share_events_share_id ON public.share_events (share_id);
CREATE INDEX IF NOT EXISTS idx_share_events_created_at ON public.share_events (created_at DESC);
