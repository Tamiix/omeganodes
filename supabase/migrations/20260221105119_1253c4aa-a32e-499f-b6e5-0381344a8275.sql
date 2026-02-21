
-- Add pending referral code columns to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS pending_referral_code TEXT,
  ADD COLUMN IF NOT EXISTS referral_code_status TEXT NOT NULL DEFAULT 'none';

-- Function for users to request a custom referral code
CREATE OR REPLACE FUNCTION public.request_referral_code(p_code TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  clean_code TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'You must be logged in');
  END IF;

  clean_code := LOWER(TRIM(p_code));

  -- Validate format: 3-20 chars, alphanumeric and hyphens, must start/end with alphanumeric
  IF clean_code !~ '^[a-z0-9][a-z0-9-]{1,18}[a-z0-9]$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Code must be 3-20 characters, alphanumeric and hyphens only, cannot start or end with a hyphen');
  END IF;

  -- Check if code is already taken as active referral_code
  IF EXISTS (SELECT 1 FROM profiles WHERE LOWER(referral_code) = clean_code AND user_id != auth.uid()) THEN
    RETURN jsonb_build_object('success', false, 'error', 'This code is already taken');
  END IF;

  -- Check if code is pending by another user
  IF EXISTS (SELECT 1 FROM profiles WHERE LOWER(pending_referral_code) = clean_code AND user_id != auth.uid() AND referral_code_status = 'pending') THEN
    RETURN jsonb_build_object('success', false, 'error', 'This code is already pending approval');
  END IF;

  -- Set the pending code
  UPDATE profiles 
  SET pending_referral_code = clean_code, 
      referral_code_status = 'pending'
  WHERE user_id = auth.uid();

  RETURN jsonb_build_object('success', true, 'code', clean_code);
END;
$$;

-- Function for admins to approve or reject referral code requests
CREATE OR REPLACE FUNCTION public.review_referral_code(p_user_id UUID, p_action TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_profile RECORD;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin access required');
  END IF;

  IF p_action NOT IN ('approve', 'reject') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid action');
  END IF;

  SELECT * INTO v_profile FROM profiles WHERE user_id = p_user_id;

  IF NOT FOUND OR v_profile.referral_code_status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'No pending request found');
  END IF;

  IF p_action = 'approve' THEN
    UPDATE profiles 
    SET referral_code = v_profile.pending_referral_code,
        pending_referral_code = NULL,
        referral_code_status = 'approved'
    WHERE user_id = p_user_id;
  ELSE
    UPDATE profiles 
    SET pending_referral_code = NULL,
        referral_code_status = 'rejected'
    WHERE user_id = p_user_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'action', p_action);
END;
$$;
