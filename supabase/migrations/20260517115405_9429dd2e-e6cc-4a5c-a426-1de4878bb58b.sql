
-- SwQoS access codes table
CREATE TABLE public.swqos_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  stake_packages INTEGER NOT NULL CHECK (stake_packages >= 1 AND stake_packages <= 10),
  duration_days INTEGER NOT NULL CHECK (duration_days > 0),
  price_usd NUMERIC NOT NULL CHECK (price_usd >= 0),
  max_uses INTEGER,
  current_uses INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.swqos_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view swqos codes" ON public.swqos_codes
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert swqos codes" ON public.swqos_codes
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update swqos codes" ON public.swqos_codes
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete swqos codes" ON public.swqos_codes
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_swqos_codes_updated_at
  BEFORE UPDATE ON public.swqos_codes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Validate (authenticated users only)
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
  found RECORD;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN QUERY SELECT false, NULL::TEXT, NULL::INTEGER, NULL::INTEGER, NULL::NUMERIC, 'Authentication required'::TEXT;
    RETURN;
  END IF;

  SELECT * INTO found FROM swqos_codes
  WHERE UPPER(swqos_codes.code) = UPPER(p_code) AND is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::TEXT, NULL::INTEGER, NULL::INTEGER, NULL::NUMERIC, 'Invalid SwQoS code'::TEXT;
    RETURN;
  END IF;

  IF found.expires_at IS NOT NULL AND found.expires_at < NOW() THEN
    RETURN QUERY SELECT false, NULL::TEXT, NULL::INTEGER, NULL::INTEGER, NULL::NUMERIC, 'This code has expired'::TEXT;
    RETURN;
  END IF;

  IF found.max_uses IS NOT NULL AND found.current_uses >= found.max_uses THEN
    RETURN QUERY SELECT false, NULL::TEXT, NULL::INTEGER, NULL::INTEGER, NULL::NUMERIC, 'This code has reached its maximum uses'::TEXT;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, found.code, found.stake_packages, found.duration_days, found.price_usd, NULL::TEXT;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.validate_swqos_code(TEXT) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.validate_swqos_code(TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.increment_swqos_code_usage(p_code TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE swqos_codes
  SET current_uses = current_uses + 1, updated_at = NOW()
  WHERE UPPER(code) = UPPER(p_code) AND is_active = true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.increment_swqos_code_usage(TEXT) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.increment_swqos_code_usage(TEXT) TO authenticated;
