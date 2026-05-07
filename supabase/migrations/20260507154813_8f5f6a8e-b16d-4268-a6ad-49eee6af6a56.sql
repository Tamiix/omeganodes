REVOKE EXECUTE ON FUNCTION public.validate_discount_code(text, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.validate_discount_code(text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.validate_referral_code(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.validate_referral_code(text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.increment_discount_code_usage(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.increment_discount_code_usage(text) TO authenticated;