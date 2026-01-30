-- Remove the insecure public SELECT policy
DROP POLICY IF EXISTS "Anyone can view unredeemed codes for validation" ON public.access_codes;

-- Create a secure SECURITY DEFINER function to validate and redeem trial codes
CREATE OR REPLACE FUNCTION public.redeem_access_code(
  p_code TEXT,
  p_discord_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code_record RECORD;
  v_user_id UUID;
  v_expires_at TIMESTAMP WITH TIME ZONE;
  v_trial_signature TEXT;
BEGIN
  -- Get the current authenticated user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'You must be logged in to redeem a code'
    );
  END IF;

  -- Validate Discord ID format
  IF p_discord_id IS NULL OR p_discord_id !~ '^\d{17,19}$' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid Discord ID format'
    );
  END IF;

  -- Find and lock the code to prevent race conditions
  SELECT * INTO v_code_record
  FROM access_codes
  WHERE UPPER(code) = UPPER(p_code)
    AND is_redeemed = false
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid or already redeemed code'
    );
  END IF;

  -- Calculate expiration time
  v_expires_at := NOW() + (v_code_record.duration_hours * INTERVAL '1 hour');
  v_trial_signature := 'TRIAL-CODE-' || UPPER(SUBSTRING(gen_random_uuid()::TEXT, 1, 8));

  -- Mark the code as redeemed
  UPDATE access_codes
  SET is_redeemed = true,
      redeemed_by = v_user_id,
      redeemed_at = NOW(),
      access_expires_at = v_expires_at
  WHERE id = v_code_record.id;

  -- Create the trial order
  INSERT INTO orders (
    user_id,
    order_number,
    plan_name,
    commitment,
    server_type,
    location,
    rps,
    tps,
    amount_usd,
    currency_code,
    currency_amount,
    payment_method,
    transaction_signature,
    status,
    expires_at,
    is_test_order
  ) VALUES (
    v_user_id,
    'TEMP',
    'Trial (' || 
      CASE v_code_record.duration_type
        WHEN '1_hour' THEN '1 Hour'
        WHEN '1_day' THEN '1 Day'
        WHEN '1_week' THEN '1 Week'
        WHEN '1_month' THEN '1 Month'
        ELSE v_code_record.duration_type
      END || ')',
    'trial',
    'shared',
    'all',
    100,
    50,
    0,
    'FREE',
    0,
    'trial_code',
    v_trial_signature,
    'active',
    v_expires_at,
    false
  );

  RETURN jsonb_build_object(
    'success', true,
    'duration_type', v_code_record.duration_type,
    'duration_hours', v_code_record.duration_hours,
    'expires_at', v_expires_at,
    'transaction_signature', v_trial_signature
  );
END;
$$;