-- DROP CODE: Row Level Security (RLS) & Atomic RPC Functions

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share_events ENABLE ROW LEVEL SECURITY;

-- Profiles Policy
CREATE POLICY "Users can view and update their own profile"
    ON public.profiles FOR ALL
    USING (auth.uid() = id);

-- Shares Policy (Controlled public access by exact code)
CREATE POLICY "Public can query active shares by code"
    ON public.shares FOR SELECT
    USING (
        status = 'active' 
        AND (expires_at IS NULL OR expires_at > NOW())
        AND (max_downloads IS NULL OR download_count < max_downloads)
    );

CREATE POLICY "Owners have full access to their shares"
    ON public.shares FOR ALL
    USING (auth.uid() = owner_id);

-- Files Policy
CREATE POLICY "Public can read file metadata associated with active share"
    ON public.files FOR SELECT
    USING (
        id IN (
            SELECT sf.file_id FROM public.share_files sf
            JOIN public.shares s ON sf.share_id = s.id
            WHERE s.status = 'active'
        )
    );

-- Share Events Policy
CREATE POLICY "Public can insert transfer tracking events"
    ON public.share_events FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Share owners can view events for their shares"
    ON public.share_events FOR SELECT
    USING (
        share_id IN (
            SELECT id FROM public.shares WHERE owner_id = auth.uid()
        )
    );

-- Atomic RPC Function: Reserve and Increment Download
CREATE OR REPLACE FUNCTION atomic_reserve_download(p_share_code TEXT)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    remaining_downloads INT
) LANGUAGE plpgsql AS $$
DECLARE
    v_share public.shares%ROWTYPE;
BEGIN
    SELECT * INTO v_share
    FROM public.shares
    WHERE UPPER(share_code) = UPPER(p_share_code)
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Share code not found'::TEXT, 0;
        RETURN;
    END IF;

    IF v_share.status != 'active' THEN
        RETURN QUERY SELECT false, ('Share is ' || v_share.status)::TEXT, 0;
        RETURN;
    END IF;

    IF v_share.expires_at IS NOT NULL AND v_share.expires_at <= NOW() THEN
        UPDATE public.shares SET status = 'expired' WHERE id = v_share.id;
        RETURN QUERY SELECT false, 'Share has expired'::TEXT, 0;
        RETURN;
    END IF;

    IF v_share.max_downloads IS NOT NULL AND v_share.download_count >= v_share.max_downloads THEN
        UPDATE public.shares SET status = 'download_limit_reached' WHERE id = v_share.id;
        RETURN QUERY SELECT false, 'Download limit reached'::TEXT, 0;
        RETURN;
    END IF;

    -- Increment download count atomically
    UPDATE public.shares
    SET download_count = download_count + 1,
        status = CASE 
            WHEN one_time_share THEN 'download_limit_reached'
            WHEN max_downloads IS NOT NULL AND (download_count + 1) >= max_downloads THEN 'download_limit_reached'
            ELSE status
        END,
        updated_at = NOW()
    WHERE id = v_share.id;

    RETURN QUERY SELECT true, 'Download authorized'::TEXT, 
        CASE 
            WHEN v_share.max_downloads IS NULL THEN -1 
            ELSE (v_share.max_downloads - (v_share.download_count + 1))
        END;
END;
$$;
