
-- Add referral_code column to profiles
ALTER TABLE public.profiles ADD COLUMN referral_code TEXT UNIQUE;

-- Create referrals tracking table
CREATE TABLE public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL,
  referred_id UUID NOT NULL,
  order_id UUID REFERENCES public.orders(id),
  order_amount_usd NUMERIC NOT NULL DEFAULT 0,
  commission_amount NUMERIC NOT NULL DEFAULT 0,
  commission_rate NUMERIC NOT NULL DEFAULT 0.10,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Users can view their own referrals (as referrer)
CREATE POLICY "Users can view referrals they made" ON public.referrals
  FOR SELECT USING (auth.uid() = referrer_id);

-- Users can view referrals where they are referred
CREATE POLICY "Users can view their own referred entries" ON public.referrals
  FOR SELECT USING (auth.uid() = referred_id);

-- Admins can view all referrals
CREATE POLICY "Admins can view all referrals" ON public.referrals
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Service/system can insert referrals (via edge function or RPC)
CREATE POLICY "System can insert referrals" ON public.referrals
  FOR INSERT WITH CHECK (auth.uid() = referred_id);

-- Admins can manage referrals
CREATE POLICY "Admins can update referrals" ON public.referrals
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete referrals" ON public.referrals
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Create function to generate referral code
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := 'OMEGA-' || UPPER(SUBSTRING(gen_random_uuid()::TEXT, 1, 6));
    SELECT EXISTS(SELECT 1 FROM profiles WHERE referral_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  UPDATE profiles SET referral_code = new_code WHERE user_id = auth.uid();
  RETURN new_code;
END;
$$;

-- Create function to validate a referral code and get referrer info
CREATE OR REPLACE FUNCTION public.validate_referral_code(p_code TEXT)
RETURNS TABLE(is_valid BOOLEAN, referrer_id UUID, referrer_username TEXT, error_message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  found_profile RECORD;
BEGIN
  SELECT p.user_id, p.username INTO found_profile
  FROM profiles p
  WHERE UPPER(p.referral_code) = UPPER(p_code)
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false::BOOLEAN, NULL::UUID, NULL::TEXT, 'Invalid referral code'::TEXT;
    RETURN;
  END IF;

  -- Can't refer yourself
  IF found_profile.user_id = auth.uid() THEN
    RETURN QUERY SELECT false::BOOLEAN, NULL::UUID, NULL::TEXT, 'You cannot use your own referral code'::TEXT;
    RETURN;
  END IF;

  RETURN QUERY SELECT true::BOOLEAN, found_profile.user_id, found_profile.username, NULL::TEXT;
END;
$$;
