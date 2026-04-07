-- Add ESR, CRP and Other Labs to investigations
ALTER TABLE investigations 
ADD COLUMN IF NOT EXISTS esr NUMERIC,
ADD COLUMN IF NOT EXISTS crp NUMERIC,
ADD COLUMN IF NOT EXISTS other_labs JSONB DEFAULT '[]'::jsonb;
