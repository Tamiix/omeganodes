-- Remove the public SELECT policy that exposes all discount codes
DROP POLICY IF EXISTS "Anyone can validate active codes" ON public.discount_codes;

-- Create a secure RPC function to validate discount codes without exposing details
CREATE OR REPLACE FUNCTION public.validate_discount_code(code_to_validate TEXT, server_type TEXT)
RETURNS TABLE(
    is_valid BOOLEAN,
    code TEXT,
    discount_type TEXT,
    discount_value NUMERIC,
    applicable_to TEXT,
    error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    found_code RECORD;
BEGIN
    -- Find the discount code
    SELECT dc.* INTO found_code
    FROM discount_codes dc
    WHERE UPPER(dc.code) = UPPER(code_to_validate)
    AND dc.is_active = true
    LIMIT 1;

    -- Code not found or inactive
    IF NOT FOUND THEN
        RETURN QUERY SELECT 
            false::BOOLEAN,
            NULL::TEXT,
            NULL::TEXT,
            NULL::NUMERIC,
            NULL::TEXT,
            'Invalid discount code'::TEXT;
        RETURN;
    END IF;

    -- Check if expired
    IF found_code.expires_at IS NOT NULL AND found_code.expires_at < NOW() THEN
        RETURN QUERY SELECT 
            false::BOOLEAN,
            NULL::TEXT,
            NULL::TEXT,
            NULL::NUMERIC,
            NULL::TEXT,
            'This discount code has expired'::TEXT;
        RETURN;
    END IF;

    -- Check if max uses reached
    IF found_code.max_uses IS NOT NULL AND found_code.current_uses >= found_code.max_uses THEN
        RETURN QUERY SELECT 
            false::BOOLEAN,
            NULL::TEXT,
            NULL::TEXT,
            NULL::NUMERIC,
            NULL::TEXT,
            'This discount code has reached its maximum uses'::TEXT;
        RETURN;
    END IF;

    -- Check if applicable to the server type
    IF found_code.applicable_to != 'both' AND found_code.applicable_to != server_type THEN
        RETURN QUERY SELECT 
            false::BOOLEAN,
            NULL::TEXT,
            NULL::TEXT,
            NULL::NUMERIC,
            NULL::TEXT,
            ('This code is only valid for ' || found_code.applicable_to || ' servers')::TEXT;
        RETURN;
    END IF;

    -- Valid code - return details
    RETURN QUERY SELECT 
        true::BOOLEAN,
        found_code.code::TEXT,
        found_code.discount_type::TEXT,
        found_code.discount_value::NUMERIC,
        found_code.applicable_to::TEXT,
        NULL::TEXT;
END;
$$;