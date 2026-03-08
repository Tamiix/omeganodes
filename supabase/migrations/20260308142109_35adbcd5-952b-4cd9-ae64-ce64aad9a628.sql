
-- Drop the broken cron job
SELECT cron.unschedule('process-email-queue-every-minute');

-- Recreate with pg_net's http_post
SELECT cron.schedule(
  'process-email-queue-every-minute',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://mmkornqvbafkricqixgk.supabase.co/functions/v1/process-email-queue',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ta29ybnF2YmFma3JpY3FpeGdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3NDUyOTIsImV4cCI6MjA4NDMyMTI5Mn0.vNv7w3BfRkYLfq-CzqpvAB55ASlnBN6Vrr41pPaaxDU"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
