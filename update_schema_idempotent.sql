-- IDEMPOTENT UPDATE SCRIPT (Sections 08 & 09)
-- Run this in your Supabase SQL Editor

-- 1. Update Profiles with Charity Percentage
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='charity_percentage') THEN
        ALTER TABLE public.profiles ADD COLUMN charity_percentage NUMERIC DEFAULT 10;
    END IF;
END $$;

-- 2. Create Winners Table (09 Winner Verification)
CREATE TABLE IF NOT EXISTS public.winners (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  draw_id UUID REFERENCES public.draws(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  match_count INTEGER NOT NULL,
  prize_amount NUMERIC NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'paid', 'rejected')),
  proof_url TEXT,
  admin_notes TEXT,
  verified_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Update Winners RLS (Safe Re-run)
ALTER TABLE public.winners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Winners are viewable by owners and admins" ON public.winners;
CREATE POLICY "Winners are viewable by owners and admins" ON public.winners FOR SELECT USING (
  auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "Users can update own winner proof" ON public.winners;
CREATE POLICY "Users can update own winner proof" ON public.winners FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can update winner status" ON public.winners;
CREATE POLICY "Admins can update winner status" ON public.winners FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "System can insert winners" ON public.winners;
CREATE POLICY "System can insert winners" ON public.winners FOR INSERT WITH CHECK (true);
