
CREATE TABLE public.email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  from_name TEXT NOT NULL DEFAULT 'OmegaNodes',
  status TEXT NOT NULL DEFAULT 'pending',
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sent_at TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL
);

ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage email queue"
  ON public.email_queue FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.is_owner(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.is_owner(auth.uid()));

CREATE INDEX idx_email_queue_status ON public.email_queue (status) WHERE status = 'pending';
