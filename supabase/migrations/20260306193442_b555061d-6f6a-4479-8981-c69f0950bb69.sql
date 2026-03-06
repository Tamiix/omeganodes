CREATE OR REPLACE FUNCTION public.increment_discount_code_usage(p_code TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE discount_codes
  SET current_uses = current_uses + 1,
      updated_at = NOW()
  WHERE UPPER(code) = UPPER(p_code)
    AND is_active = true;
END;
$$;