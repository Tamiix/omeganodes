import { buildCorsHeaders } from "../_shared/cors.ts";

const DISCORD_WEBHOOK_URL = Deno.env.get('DISCORD_REGISTRATION_WEBHOOK_URL') || '';

interface RegistrationDetails {
  email: string;
  username?: string;
  registerDate: string;
}

// Public endpoint — invoked during signup before a session exists.
// CORS is restricted to known origins; inputs are strictly validated.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const details: RegistrationDetails = await req.json();

    const email = typeof details.email === 'string' ? details.email.trim().slice(0, 255) : '';
    if (!EMAIL_RE.test(email)) {
      return new Response(JSON.stringify({ error: 'Invalid email' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const usernameRaw = typeof details.username === 'string' ? details.username : email.split('@')[0];
    const username = usernameRaw.replace(/[^\w.\-]/g, '').slice(0, 64) || email.split('@')[0];
    const domain = email.split('@')[1] || 'Unknown';
    const registerDate = typeof details.registerDate === 'string' ? details.registerDate : new Date().toISOString();
    const date = new Date(registerDate);


    const timestamp = `<t:${Math.floor(date.getTime() / 1000)}:F>`;
    const relativeTime = `<t:${Math.floor(date.getTime() / 1000)}:R>`;

    const embed = {
      title: '🆕  New Account Created',
      color: 0x22C55E,
      thumbnail: {
        url: `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=22C55E&color=fff&size=128&bold=true`,
      },
      fields: [
        {
          name: '👤 Username',
          value: `\`${username}\``,
          inline: true,
        },
        {
          name: '📧 Email',
          value: `\`${email}\``,
          inline: true,
        },
        {
          name: '🌐 Domain',
          value: `\`${domain}\``,
          inline: true,
        },
        {
          name: '📅 Registered',
          value: `${timestamp}\n${relativeTime}`,
          inline: true,
        },
      ],
      footer: {
        text: 'OmegaNode • Registration System',
        icon_url: 'https://omeganodes.lovable.app/omega-logo-new.png',
      },
      timestamp: new Date().toISOString(),
    };

    const discordResponse = await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] }),
    });

    if (!discordResponse.ok) {
      const errorText = await discordResponse.text();
      console.error('Discord webhook error:', errorText);
      throw new Error(`Discord webhook failed: ${discordResponse.status}`);
    }

    console.log('Registration notification sent');
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
