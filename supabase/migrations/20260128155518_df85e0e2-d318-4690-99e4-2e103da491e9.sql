-- Create table for trial access codes
CREATE TABLE public.access_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  duration_type TEXT NOT NULL CHECK (duration_type IN ('1_hour', '1_day', '1_week', '1_month')),
  duration_hours INTEGER NOT NULL,
  is_redeemed BOOLEAN NOT NULL DEFAULT false,
  redeemed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  redeemed_at TIMESTAMP WITH TIME ZONE,
  access_expires_at TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.access_codes ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can view all access codes"
  ON public.access_codes FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert access codes"
  ON public.access_codes FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update access codes"
  ON public.access_codes FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete access codes"
  ON public.access_codes FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- Users can view codes to redeem them (only unredeemed ones)
CREATE POLICY "Anyone can view unredeemed codes for validation"
  ON public.access_codes FOR SELECT
  USING (is_redeemed = false);

-- Users can update to redeem a code
CREATE POLICY "Users can redeem codes"
  ON public.access_codes FOR UPDATE
  USING (is_redeemed = false AND auth.uid() IS NOT NULL)
  WITH CHECK (redeemed_by = auth.uid());