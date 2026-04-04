
CREATE TABLE public.stake_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  total_stake numeric NOT NULL,
  activating_stake numeric NOT NULL DEFAULT 0,
  deactivating_stake numeric NOT NULL DEFAULT 0,
  activating_count integer NOT NULL DEFAULT 0,
  deactivating_count integer NOT NULL DEFAULT 0,
  stake_accounts_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.stake_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view stake snapshots" ON public.stake_snapshots
  FOR SELECT TO public USING (true);

CREATE POLICY "Service role can insert stake snapshots" ON public.stake_snapshots
  FOR INSERT TO public WITH CHECK (true);
