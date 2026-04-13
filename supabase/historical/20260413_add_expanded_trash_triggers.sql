-- 20260413_add_expanded_trash_triggers.sql
-- Expands the recycle bin tracking to cover latest system modules.

-- Pharmacy Inventory
DROP TRIGGER IF EXISTS tr_trash_pharmacy_inventory ON public.pharmacy_inventory;
CREATE TRIGGER tr_trash_pharmacy_inventory
    BEFORE DELETE ON public.pharmacy_inventory
    FOR EACH ROW EXECUTE FUNCTION public.proc_move_to_trash();

-- Nurse Instructions
DROP TRIGGER IF EXISTS tr_trash_nurse_instructions ON public.nurse_instructions;
CREATE TRIGGER tr_trash_nurse_instructions
    BEFORE DELETE ON public.nurse_instructions
    FOR EACH ROW EXECUTE FUNCTION public.proc_move_to_trash();

-- Clinical Referrals
DROP TRIGGER IF EXISTS tr_trash_referrals ON public.referrals;
CREATE TRIGGER tr_trash_referrals
    BEFORE DELETE ON public.referrals
    FOR EACH ROW EXECUTE FUNCTION public.proc_move_to_trash();
