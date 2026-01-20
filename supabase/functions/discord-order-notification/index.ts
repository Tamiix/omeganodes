import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1463233069296128206/cAjHrTSSNs0GzT5vKSHf1mqyjGPeWawlDDBDUOiGU5y81hJBhzKfP6RW0uDIV2f_OlK0";

interface OrderDetails {
  plan: string;
  commitment: string;
  serverType: string;
  email: string;
  rps: number;
  tps: number;
  includeShreds: boolean;
  swqosTier: number | null;
  swqosLabel: string | null;
  totalAmount: number;
  transactionSignature: string;
  isTestMode: boolean;
  rentAccessEnabled?: boolean;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const orderDetails: OrderDetails = await req.json();
    
    console.log("Sending Discord notification for order:", orderDetails);

    const checkMark = "✅";
    const crossMark = "❌";

    const embed = {
      title: orderDetails.isTestMode ? "🧪 Test Order Received" : "🎉 New Order Received",
      color: orderDetails.isTestMode ? 16776960 : 5763719, // Yellow for test, Green for real
      fields: [
        {
          name: "📦 Plan Details",
          value: `**Server Type:** ${orderDetails.serverType}\n**Commitment:** ${orderDetails.commitment}\n**Plan:** ${orderDetails.plan}`,
          inline: false
        },
        {
          name: "📊 Specifications",
          value: `**RPS:** ${orderDetails.rps.toLocaleString()}\n**TPS:** ${orderDetails.tps.toLocaleString()}`,
          inline: true
        },
        {
          name: "➕ Add-ons",
          value: `**Private Shreds:** ${orderDetails.includeShreds ? checkMark : crossMark}\n**swQoS Stake:** ${orderDetails.swqosTier !== null ? `${checkMark} (${orderDetails.swqosLabel})` : crossMark}`,
          inline: true
        },
        {
          name: "💰 Payment",
          value: `**Total:** $${orderDetails.totalAmount.toLocaleString()}`,
          inline: true
        },
        {
          name: "📧 Customer",
          value: orderDetails.email || "Not provided",
          inline: false
        },
        {
          name: "🔗 Transaction",
          value: `[View on Solscan](https://solscan.io/tx/${orderDetails.transactionSignature})`,
          inline: false
        }
      ],
      footer: {
        text: orderDetails.isTestMode ? "Test Mode - Not a real order" : "OmegaNode Order System"
      },
      timestamp: new Date().toISOString()
    };

    // Add rent access field if enabled
    if (orderDetails.rentAccessEnabled) {
      embed.fields.splice(3, 0, {
        name: "🔄 Rent Access",
        value: `${checkMark} Enabled (+15%)`,
        inline: true
      });
    }

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

    console.log("Discord notification sent successfully");

    return new Response(
      JSON.stringify({ success: true }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error sending Discord notification:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
