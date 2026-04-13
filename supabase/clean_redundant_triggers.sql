-- ============================================================
-- CLEANUP: REDUNDANT RECYCLE BIN TRIGGERS
-- Run this in your Supabase SQL Editor to stop double-logging
-- ============================================================

DO $$ 
BEGIN
    -- 1. Pharmacy Cleanup
    DROP TRIGGER IF EXISTS tr_trash_inventory ON public.pharmacy_inventory;
    
    -- 2. Laboratory (Investigations) Cleanup
    -- Cleaning all known and potential legacy variants
    DROP TRIGGER IF EXISTS tr_trash_labs ON public.investigations;
    DROP TRIGGER IF EXISTS tr_trash_investigation ON public.investigations;
    DROP TRIGGER IF EXISTS tr_investigations_trash ON public.investigations;
    
    -- 3. Miscellaneous Cleanup
    DROP TRIGGER IF EXISTS tr_trash_nursing ON public.nurse_instructions;
    DROP TRIGGER IF EXISTS tr_trash_instruction ON public.nurse_instructions;
    
    -- 4. Auth Cleanup (Fixing duplicate profile creation triggers)
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    
    RAISE NOTICE 'Legacy redundant triggers have been successfully removed.';
END $$;
