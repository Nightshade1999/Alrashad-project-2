-- Migration 0005: Add roles and admin bypass for RLS

-- 1. Add role to user_profiles
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';

-- 2. Update patient policy to allow admin bypass
-- Standard user: can ONLY see their own patients.
-- Admin user: can see ALL patients.
DROP POLICY IF EXISTS "Users can only access their own patients" ON public.patients;
CREATE POLICY "Users can only access their own patients"
  ON public.patients FOR ALL TO authenticated
  USING (
    (auth.uid() = user_id) OR
    (EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE user_id = auth.uid() AND role = 'admin'
    ))
  )
  WITH CHECK (
    (auth.uid() = user_id) OR
    (EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE user_id = auth.uid() AND role = 'admin'
    ))
  );

-- 3. Update visits policy to allow admin bypass
DROP POLICY IF EXISTS "Users can only access visits for their patients" ON public.visits;
CREATE POLICY "Users can only access visits for their patients"
  ON public.visits FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.patients
      WHERE public.patients.id = public.visits.patient_id
        AND (
          public.patients.user_id = auth.uid() OR
          EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_id = auth.uid() AND role = 'admin'
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.patients
      WHERE public.patients.id = public.visits.patient_id
        AND (
          public.patients.user_id = auth.uid() OR
          EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_id = auth.uid() AND role = 'admin'
          )
        )
    )
  );

-- 4. Update investigations policy to allow admin bypass
DROP POLICY IF EXISTS "Users can only access investigations for their patients" ON public.investigations;
CREATE POLICY "Users can only access investigations for their patients"
  ON public.investigations FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.patients
      WHERE public.patients.id = public.investigations.patient_id
        AND (
          public.patients.user_id = auth.uid() OR
          EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_id = auth.uid() AND role = 'admin'
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.patients
      WHERE public.patients.id = public.investigations.patient_id
        AND (
          public.patients.user_id = auth.uid() OR
          EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_id = auth.uid() AND role = 'admin'
          )
        )
    )
  );
