import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Webhook URL stored securely as environment variable
const DISCORD_WEBHOOK_URL = Deno.env.get('DISCORD_REGISTRATION_WEBHOOK_URL') || '';

interface RegistrationDetails {
  email: string;
  registerDate: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const registrationDetails: RegistrationDetails = await req.json();
    
    console.log("Sending Discord registration notification:", registrationDetails);

    const embed = {
      title: "📝 New User Registration",
      color: 3066993, // Green
      fields: [
        {
          name: "📧 User Email",
          value: registrationDetails.email || "Not provided",
          inline: false
        },
        {
          name: "📅 Register Date",
          value: registrationDetails.registerDate || new Date().toISOString(),
          inline: true
        }
      ],
      footer: {
        text: "OmegaNode Registration System"
      },
      timestamp: new Date().toISOString()
    };

    const discordPayload = {
      embeds: [embed]
    };

    const discordResponse = await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(discordPayload),
    });

    if (!discordResponse.ok) {
      const errorText = await discordResponse.text();
      console.error("Discord webhook error:", errorText);
      throw new Error(`Discord webhook failed: ${discordResponse.status}`);
    }

    console.log("Discord registration notification sent successfully");

    return new Response(
      JSON.stringify({ success: true }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error sending Discord registration notification:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
