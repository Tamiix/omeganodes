CREATE OR REPLACE FUNCTION public.validate_discount_code(code_to_validate text, server_type text)
RETURNS TABLE(is_valid boolean, code text, discount_type text, discount_value numeric, applicable_to text, error_message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    found_code RECORD;
BEGIN
    SELECT dc.* INTO found_code
    FROM discount_codes dc
    WHERE UPPER(dc.code) = UPPER(code_to_validate)
    AND dc.is_active = true
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN QUERY SELECT 
            false::BOOLEAN, NULL::TEXT, NULL::TEXT, NULL::NUMERIC, NULL::TEXT,
            'Invalid discount code'::TEXT;
        RETURN;
    END IF;

    IF found_code.expires_at IS NOT NULL AND found_code.expires_at < NOW() THEN
        RETURN QUERY SELECT 
            false::BOOLEAN, NULL::TEXT, NULL::TEXT, NULL::NUMERIC, NULL::TEXT,
            'This discount code has expired'::TEXT;
        RETURN;
    END IF;

    IF found_code.max_uses IS NOT NULL AND found_code.current_uses >= found_code.max_uses THEN
        RETURN QUERY SELECT 
            false::BOOLEAN, NULL::TEXT, NULL::TEXT, NULL::NUMERIC, NULL::TEXT,
            'This discount code has reached its maximum uses'::TEXT;
        RETURN;
    END IF;

    -- Check applicability: 'all' matches everything, 'both' matches shared+dedicated, otherwise exact match
    IF found_code.applicable_to = 'all' THEN
        -- matches everything
        NULL;
    ELSIF found_code.applicable_to = 'both' THEN
        IF server_type NOT IN ('shared', 'dedicated') THEN
            RETURN QUERY SELECT 
                false::BOOLEAN, NULL::TEXT, NULL::TEXT, NULL::NUMERIC, NULL::TEXT,
                'This code is only valid for shared and dedicated servers'::TEXT;
            RETURN;
        END IF;
    ELSIF found_code.applicable_to != server_type THEN
        RETURN QUERY SELECT 
            false::BOOLEAN, NULL::TEXT, NULL::TEXT, NULL::NUMERIC, NULL::TEXT,
            ('This code is only valid for ' || found_code.applicable_to || ' plans')::TEXT;
        RETURN;
    END IF;

    RETURN QUERY SELECT 
        true::BOOLEAN, found_code.code::TEXT, found_code.discount_type::TEXT,
        found_code.discount_value::NUMERIC, found_code.applicable_to::TEXT, NULL::TEXT;
END;
$$;