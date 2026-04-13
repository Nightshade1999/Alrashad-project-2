-- ============================================================
-- ENABLE REALTIME FOR CLINICAL NOTIFICATIONS
-- Ensures NotificationCenter and NurseHub receive live updates
-- ============================================================

-- 1. Create the publication if it doesn't exist (Supabase default is supabase_realtime)
-- We use a DO block to safely handle cases where the publication might already exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END $$;

-- 2. Add tables to the publication safely
DO $$
BEGIN
    -- Add notifications if missing
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'notifications'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;

    -- Add nurse_instructions if missing
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'nurse_instructions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.nurse_instructions;
    END IF;
END $$;

-- 3. Set Replica Identity
-- For INSERT events, DEFAULT is enough. For UPDATE/DELETE, FULL is recommended
-- to ensure the frontend receives the old record data as well.
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.nurse_instructions REPLICA IDENTITY FULL;
