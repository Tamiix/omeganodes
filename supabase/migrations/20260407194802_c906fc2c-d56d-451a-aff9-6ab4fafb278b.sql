
SELECT cron.schedule(
  'discord-validator-stats-check',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT value FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL' LIMIT 1) || '/functions/v1/discord-validator-stats',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT value FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY' LIMIT 1)
    ),
    body := '{}'::jsonb
  );
  $$
);
