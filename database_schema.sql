-- ==========================================
-- GOLF CHARITY PLATFORM - SUPABASE SCHEMA (IDEMPOTENT)
-- ==========================================

-- 1. Charities Table
CREATE TABLE IF NOT EXISTS public.charities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  category TEXT DEFAULT 'community',
  logo_emoji TEXT DEFAULT '🤝',
  total_received NUMERIC DEFAULT 0,
  supporter_count INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Profiles Table (Extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  handicap INTEGER DEFAULT 0,
  subscription_status TEXT DEFAULT 'inactive' CHECK (subscription_status IN ('active', 'inactive', 'cancelled')),
  subscription_plan TEXT CHECK (subscription_plan IN ('monthly', 'yearly', null)),
  selected_charity_id UUID REFERENCES public.charities(id) ON DELETE SET NULL,
  draw_entries INTEGER DEFAULT 0,
  total_contributed NUMERIC DEFAULT 0,
  avatar_initials TEXT,
  country TEXT DEFAULT 'UK', -- 14 Scalability
  currency TEXT DEFAULT 'GBP', -- 14 Scalability
  account_type TEXT DEFAULT 'individual' CHECK (account_type IN ('individual', 'corporate')), -- 14 Scalability
  current_streak INTEGER DEFAULT 0, -- 20 Engagement Features
  last_activity_at TIMESTAMPTZ, -- 20 Engagement Features
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add charity_percentage if not exists (08 Requirement)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='charity_percentage') THEN
        ALTER TABLE public.profiles ADD COLUMN charity_percentage NUMERIC DEFAULT 10;
    END IF;
    -- 20 Engagement Features
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='current_streak') THEN
        ALTER TABLE public.profiles ADD COLUMN current_streak INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='last_activity_at') THEN
        ALTER TABLE public.profiles ADD COLUMN last_activity_at TIMESTAMPTZ;
    END IF;
END $$;

-- Trigger to create profile and subscription on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, avatar_initials, subscription_plan, subscription_status)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'name',
    LEFT(UPPER(new.raw_user_meta_data->>'name'), 2),
    new.raw_user_meta_data->>'plan',
    CASE WHEN new.raw_user_meta_data->>'plan' IS NOT NULL THEN 'active' ELSE 'inactive' END
  ) ON CONFLICT (id) DO NOTHING;
  
  IF new.raw_user_meta_data->>'plan' IS NOT NULL THEN
    INSERT INTO public.subscriptions (user_id, plan, status, amount, mock_payment_id, next_billing_date)
    VALUES (
      new.id,
      new.raw_user_meta_data->>'plan',
      'active',
      CASE WHEN new.raw_user_meta_data->>'plan' = 'yearly' THEN 99.99 ELSE 9.99 END,
      'MOCK_' || LEFT(gen_random_uuid()::text, 8),
      CASE WHEN new.raw_user_meta_data->>'plan' = 'yearly' THEN now() + interval '1 year' ELSE now() + interval '1 month' END
    );
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Subscriptions (Mock)
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  plan TEXT NOT NULL CHECK (plan IN ('monthly', 'yearly')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),
  amount NUMERIC NOT NULL,
  mock_payment_id TEXT,
  next_billing_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Scores Table
CREATE TABLE IF NOT EXISTS public.scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  course_name TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_strokes INTEGER NOT NULL,
  total_stableford INTEGER NOT NULL,
  handicap INTEGER NOT NULL,
  holes JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Draws Table
CREATE TABLE IF NOT EXISTS public.draws (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  prize_pool NUMERIC DEFAULT 0,
  charity_pool NUMERIC DEFAULT 0,
  total_subscribers INTEGER DEFAULT 0,
  winning_numbers INTEGER[] DEFAULT '{}',
  is_published BOOLEAN DEFAULT false,
  logic_type TEXT DEFAULT 'random',
  rollover_amount NUMERIC DEFAULT 0,
  winner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  winner_name TEXT,
  prize_amount NUMERIC DEFAULT 0,
  run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Winners Table (09 Winner Verification)
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


-- 7. Donations Table (19 Independent Donations)
CREATE TABLE IF NOT EXISTS public.donations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  charity_id UUID REFERENCES public.charities(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  payment_method TEXT DEFAULT 'card',
  status TEXT DEFAULT 'success',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) - ALL IDEMPOTENT
-- ==========================================

ALTER TABLE public.charities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draws ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.winners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

-- Charities Policies
DROP POLICY IF EXISTS "Charities are viewable by everyone" ON public.charities;
CREATE POLICY "Charities are viewable by everyone" ON public.charities FOR SELECT USING (true);

-- Profiles Policies
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Subscriptions Policies
DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.subscriptions;
CREATE POLICY "Users can view own subscriptions" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own subscriptions" ON public.subscriptions;
CREATE POLICY "Users can insert own subscriptions" ON public.subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own subscriptions" ON public.subscriptions;
CREATE POLICY "Users can update own subscriptions" ON public.subscriptions FOR UPDATE USING (auth.uid() = user_id);

-- Scores Policies
DROP POLICY IF EXISTS "Scores are viewable by everyone" ON public.scores;
CREATE POLICY "Scores are viewable by everyone" ON public.scores FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can insert own scores" ON public.scores;
CREATE POLICY "Users can insert own scores" ON public.scores FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Draws Policies
DROP POLICY IF EXISTS "Draws are viewable by everyone" ON public.draws;
CREATE POLICY "Draws are viewable by everyone" ON public.draws FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can insert draws" ON public.draws;
CREATE POLICY "Admins can insert draws" ON public.draws FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
DROP POLICY IF EXISTS "Admins can update draws" ON public.draws;
CREATE POLICY "Admins can update draws" ON public.draws FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Winners Policies
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


-- ==========================================
-- SEED DATA (Charities)
-- ==========================================
INSERT INTO public.charities (name, description, category, logo_emoji) VALUES
('Golf Foundation', 'Bringing golf to young people across the UK.', 'sport', '⛳'),
('Macmillan Cancer Support', 'Supporting people living with cancer.', 'health', '💚'),
('WWF', 'Protecting nature and wildlife.', 'environment', '🐼'),
('Children in Need', 'Transforming lives of children.', 'education', '🌟'),
('Local Community Trust', 'Investing in local communities.', 'community', '🤝'),
('Alzheimers Society', 'Funding research and providing support.', 'health', '🟣')
ON CONFLICT (name) DO NOTHING;

-- ==========================================
-- AUTO-CONFIRM EMAILS BYPASS
-- ==========================================
CREATE OR REPLACE FUNCTION public.auto_confirm_user()
RETURNS TRIGGER AS $$
BEGIN
  new.email_confirmed_at = now();
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_before ON auth.users;
CREATE TRIGGER on_auth_user_created_before
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.auto_confirm_user();

-- 12. Campaigns Table (14 Scalability)
CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  target_amount NUMERIC,
  current_amount NUMERIC DEFAULT 0,
  charity_id UUID REFERENCES public.charities(id),
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 13. System Notifications Table (13 Technical)
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info', -- 'info', 'win', 'draw', 'system'
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for Notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

-- RLS for Campaigns (Public View)
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view active campaigns" ON public.campaigns;
CREATE POLICY "Anyone can view active campaigns" ON public.campaigns
  FOR SELECT USING (active = true);

-- 14. Donations Policies (19 Independent Donations)
DROP POLICY IF EXISTS "Users can view own donations" ON public.donations;
CREATE POLICY "Users can view own donations" ON public.donations FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own donations" ON public.donations;
CREATE POLICY "Users can insert own donations" ON public.donations FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins can view all donations" ON public.donations;
CREATE POLICY "Admins can view all donations" ON public.donations FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
