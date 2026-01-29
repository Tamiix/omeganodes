-- Add applicable_to column to discount_codes table
-- Values: 'shared', 'dedicated', 'both' (default)
ALTER TABLE public.discount_codes 
ADD COLUMN applicable_to text NOT NULL DEFAULT 'both';

-- Add a check constraint to ensure valid values
ALTER TABLE public.discount_codes 
ADD CONSTRAINT discount_codes_applicable_to_check 
CHECK (applicable_to IN ('shared', 'dedicated', 'both'));