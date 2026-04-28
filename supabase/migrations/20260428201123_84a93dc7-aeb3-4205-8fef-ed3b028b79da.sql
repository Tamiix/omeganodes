SELECT cron.unschedule('validator-epoch-check-1min');
SELECT cron.schedule(
  'validator-epoch-check-30min',
  '*/30 * * * *',
  $$
  select net.http_post(
    url:='https://mmkornqvbafkricqixgk.supabase.co/functions/v1/discord-validator-stats',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ta29ybnF2YmFma3JpY3FpeGdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3NDUyOTIsImV4cCI6MjA4NDMyMTI5Mn0.vNv7w3BfRkYLfq-CzqpvAB55ASlnBN6Vrr41pPaaxDU"}'::jsonb,
    body:='{"time": "scheduled"}'::jsonb
  ) as request_id;
  $$
);