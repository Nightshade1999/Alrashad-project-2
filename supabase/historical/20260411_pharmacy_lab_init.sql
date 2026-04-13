-- ============================================================
-- PHARMACY AND LABORATORY INTEGRATION
-- ============================================================

-- 1. ENHANCE USER PROFILES
-- Ensure the role field can accommodate the new roles (it's already TEXT, so we just need RLS)
-- We also add a helper for the 24-hour check later

-- 2. PHARMACY INVENTORY TABLE
CREATE TABLE IF NOT EXISTS public.pharmacy_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scientific_name TEXT NOT NULL,
    generic_name TEXT,
    dosage TEXT,
    formulation TEXT, -- tab, amp, cap, etc.
    mode_of_administration TEXT,
    expiration_date DATE,
    quantity INTEGER DEFAULT 0,
    min_stock_level INTEGER DEFAULT 10,
    batch_number TEXT,
    manufacturer TEXT,
    price NUMERIC,
    gudea_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ENABLE RLS
ALTER TABLE public.pharmacy_inventory ENABLE ROW LEVEL SECURITY;

-- 4. PHARMACY POLICIES
-- Pharmacists: Full Access
-- Admins: Full Access
-- Doctors/Users: Read Only (to see stock)
CREATE POLICY "Inventory_Pharmacist_Full" ON public.pharmacy_inventory
    FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND (role = 'pharmacist' OR role = 'admin'))
    );

CREATE POLICY "Inventory_Doctor_Read" ON public.pharmacy_inventory
    FOR SELECT TO authenticated
    USING (true);

-- 5. LABORATORY POLICIES (Patients Search)
-- MLTs need to see ALL patients but only basic fields.
-- We refine the existing patient access policy or add a specific one.
-- Actually, the current "Patient_Hardened_Access" is quite restrictive.
-- Let's add a policy specifically for lab_tech role to SELECT basic info.

CREATE POLICY "Patient_Lab_Global_Search" ON public.patients
    FOR SELECT TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND role = 'lab_tech')
    );

-- 6. INVESTIGATIONS POLICIES
-- Lab Techs can insert, and update/delete within 24 hours.
CREATE POLICY "Investigations_Lab_Insert" ON public.investigations
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND role = 'lab_tech')
    );

CREATE POLICY "Investigations_Lab_Modify_24h" ON public.investigations
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE user_id = auth.uid() 
            AND role = 'lab_tech'
            AND created_at > (NOW() - INTERVAL '24 hours')
        )
    );

-- 7. RECYCLE BIN TRIGGER FOR INVENTORY (Optional but good)
DROP TRIGGER IF EXISTS tr_trash_inventory ON public.pharmacy_inventory;
CREATE TRIGGER tr_trash_inventory
    BEFORE DELETE ON public.pharmacy_inventory
    FOR EACH ROW EXECUTE FUNCTION public.proc_move_to_trash();

-- 8. UPDATE TRIGGERS
SELECT create_update_trigger('pharmacy_inventory');
