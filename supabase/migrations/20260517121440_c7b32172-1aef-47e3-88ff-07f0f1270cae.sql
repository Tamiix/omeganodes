CREATE OR REPLACE FUNCTION public.validate_swqos_code(p_code TEXT)
RETURNS TABLE(
  is_valid BOOLEAN,
  code TEXT,
  stake_packages INTEGER,
  duration_days INTEGER,
  price_usd NUMERIC,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row swqos_codes%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN QUERY SELECT false, NULL::TEXT, NULL::INTEGER, NULL::INTEGER, NULL::NUMERIC, 'Authentication required'::TEXT;
    RETURN;
  END IF;

  SELECT * INTO v_row FROM swqos_codes
  WHERE UPPER(swqos_codes.code) = UPPER(p_code) AND swqos_codes.is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::TEXT, NULL::INTEGER, NULL::INTEGER, NULL::NUMERIC, 'Invalid SwQoS code'::TEXT;
    RETURN;
  END IF;

  IF v_row.expires_at IS NOT NULL AND v_row.expires_at < NOW() THEN
    RETURN QUERY SELECT false, NULL::TEXT, NULL::INTEGER, NULL::INTEGER, NULL::NUMERIC, 'This code has expired'::TEXT;
    RETURN;
  END IF;

  IF v_row.max_uses IS NOT NULL AND v_row.current_uses >= v_row.max_uses THEN
    RETURN QUERY SELECT false, NULL::TEXT, NULL::INTEGER, NULL::INTEGER, NULL::NUMERIC, 'This code has reached its maximum uses'::TEXT;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, v_row.code, v_row.stake_packages, v_row.duration_days, v_row.price_usd, NULL::TEXT;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.validate_swqos_code(TEXT) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.validate_swqos_code(TEXT) TO authenticated;