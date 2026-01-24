-- Create table to track trial usage for abuse prevention
CREATE TABLE public.trial_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  discord_id TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trial_usage ENABLE ROW LEVEL SECURITY;

-- Admins can view all trial usage
CREATE POLICY "Admins can view all trial usage"
ON public.trial_usage
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow inserts from edge functions (service role)
CREATE POLICY "Service role can insert trial usage"
ON public.trial_usage
FOR INSERT
WITH CHECK (true);

-- Create indexes for fast lookups
CREATE INDEX idx_trial_usage_ip ON public.trial_usage(ip_address);
CREATE INDEX idx_trial_usage_fingerprint ON public.trial_usage(fingerprint);
CREATE INDEX idx_trial_usage_discord_id ON public.trial_usage(discord_id);