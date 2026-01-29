import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Webhook URL stored securely as environment variable
const DISCORD_WEBHOOK_URL = Deno.env.get('DISCORD_ORDER_WEBHOOK_URL') || '';

interface OrderDetails {
  plan: string;
  commitment: string;
  serverType: string;
  email: string;
  discordId: string | null;
  discordUsername?: string | null;
  rps?: number;
  tps?: number;
  includeShreds?: boolean;
  swqosTier?: number | null;
  swqosLabel?: string | null;
  swqosStakeAmount?: number | null;
  swqosPrice?: number | null;
  totalAmount: number;
  transactionSignature: string;
  isTestMode: boolean;
  rentAccessEnabled?: boolean;
  isTrial?: boolean;
  discountCode?: string | null;
  additionalStakePackages?: number;
  privateShredsEnabled?: boolean;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const orderDetails: OrderDetails = await req.json();
    
    console.log("Sending Discord notification for order:", orderDetails);

    const isFreeOrder = orderDetails.totalAmount === 0 && !orderDetails.isTrial;
    const hasDiscount = !!orderDetails.discountCode;

    // Determine title, color, and emoji based on order type
    let title: string;
    let color: number;
    let thumbnailUrl: string;
    
    if (orderDetails.isTrial) {
      title = "🎁 New Trial Activated";
      color = 3447003; // Blue
      thumbnailUrl = "https://cdn-icons-png.flaticon.com/512/2991/2991195.png";
    } else if (orderDetails.isTestMode) {
      title = "🧪 Test Order Created";
      color = 16776960; // Yellow
      thumbnailUrl = "https://cdn-icons-png.flaticon.com/512/2991/2991148.png";
    } else if (isFreeOrder) {
      title = "🎉 Free Order (100% Discount)";
      color = 10181046; // Purple
      thumbnailUrl = "https://cdn-icons-png.flaticon.com/512/3135/3135706.png";
    } else if (orderDetails.serverType === "dedicated" || orderDetails.serverType === "Dedicated") {
      title = "🚀 New Dedicated Server Order";
      color = 15844367; // Gold
      thumbnailUrl = "https://cdn-icons-png.flaticon.com/512/2991/2991112.png";
    } else {
      title = "✨ New Shared Server Order";
      color = 5763719; // Green
      thumbnailUrl = "https://cdn-icons-png.flaticon.com/512/2991/2991112.png";
    }

    // Build plan details
    const planLines = [
      `> **Type:** ${orderDetails.serverType}`,
      `> **Plan:** ${orderDetails.plan}`,
      `> **Term:** ${orderDetails.isTrial ? "Trial (30 min)" : orderDetails.commitment}`
    ];

    // Build add-ons section for dedicated servers
    const addOnLines: string[] = [];
    const isDedicated = orderDetails.serverType === "dedicated" || orderDetails.serverType === "Dedicated";
    
    if (isDedicated) {
      // Check for shreds (from either field name)
      const hasShreds = orderDetails.includeShreds || orderDetails.privateShredsEnabled;
      addOnLines.push(`> **Private Shreds:** ${hasShreds ? "✅ Yes (+$800/mo)" : "❌ No"}`);
      
      // Check for additional stake packages
      const stakePackages = orderDetails.additionalStakePackages || 0;
      if (stakePackages > 0) {
        const totalStake = 50000 + (stakePackages * 100000);
        addOnLines.push(`> **Extra Stake:** ✅ ${stakePackages}x packages (${totalStake.toLocaleString()} SOL total)`);
      } else {
        addOnLines.push(`> **Extra Stake:** ❌ Base only (50,000 SOL)`);
      }
      
      // Legacy swQoS support
      if (orderDetails.swqosTier !== null && orderDetails.swqosTier !== undefined) {
        addOnLines.push(`> **swQoS:** ✅ ${orderDetails.swqosLabel || "Selected"}`);
      }
    }

    // Rent access
    if (orderDetails.rentAccessEnabled) {
      addOnLines.push(`> **Rent Access:** ✅ Enabled (+15%)`);
    }

    // Build payment section
    const paymentLines: string[] = [];
    if (orderDetails.isTrial) {
      paymentLines.push(`> **Amount:** \`FREE TRIAL\``);
    } else if (isFreeOrder) {
      paymentLines.push(`> **Amount:** \`$0.00\` (100% discounted)`);
    } else {
      paymentLines.push(`> **Amount:** \`$${(orderDetails.totalAmount || 0).toLocaleString()}\``);
    }

    // Discount code info
    if (hasDiscount) {
      paymentLines.push(`> **Discount Code:** 🏷️ \`${orderDetails.discountCode}\``);
    } else {
      paymentLines.push(`> **Discount Code:** None used`);
    }

    // Transaction link
    if (!orderDetails.isTrial && orderDetails.transactionSignature) {
      if (orderDetails.transactionSignature.startsWith("FREE-")) {
        paymentLines.push(`> **Reference:** \`${orderDetails.transactionSignature}\``);
      } else if (orderDetails.transactionSignature.startsWith("TEST-") || orderDetails.transactionSignature.startsWith("TRIAL-")) {
        paymentLines.push(`> **Reference:** \`${orderDetails.transactionSignature}\``);
      } else {
        paymentLines.push(`> **Transaction:** [View on Solscan](https://solscan.io/tx/${orderDetails.transactionSignature})`);
      }
    }

    const fields = [
      {
        name: "📦 Server Details",
        value: planLines.join("\n"),
        inline: false
      }
    ];

    // Add add-ons field if there are any
    if (addOnLines.length > 0) {
      fields.push({
        name: "➕ Add-ons & Options",
        value: addOnLines.join("\n"),
        inline: false
      });
    }

    fields.push({
      name: "💳 Payment Information",
      value: paymentLines.join("\n"),
      inline: false
    });

    fields.push({
      name: "👤 Customer Details",
      value: [
        `> **Email:** ${orderDetails.email || "Not provided"}`,
        `> **Discord:** ${orderDetails.discordId ? `<@${orderDetails.discordId}>` : "Not provided"}`
      ].join("\n"),
      inline: false
    });

    const embed = {
      title,
      color,
      thumbnail: {
        url: thumbnailUrl
      },
      fields,
      footer: {
        text: orderDetails.isTrial 
          ? "🕐 Trial expires in 30 minutes" 
          : orderDetails.isTestMode 
            ? "⚠️ This is a TEST order - not real" 
            : isFreeOrder
              ? "🎉 100% discount applied"
              : "OmegaNode • Powered by Solana",
        icon_url: "https://cdn-icons-png.flaticon.com/512/2991/2991112.png"
      },
      timestamp: new Date().toISOString()
    };

    // Build content with staff pings AND customer Discord ID as plain text (for copying)
    let contentMessage = "||<@404356986340114442> <@545046451219070980>||";
    
    // Add order type indicator
    if (orderDetails.isTrial) {
      contentMessage = "**🎁 TRIAL REQUEST**\n" + contentMessage;
    } else if (orderDetails.isTestMode) {
      contentMessage = "**🧪 TEST ORDER**\n" + contentMessage;
    } else if (isFreeOrder) {
      contentMessage = "**🎉 FREE ORDER (Discount Code)**\n" + contentMessage;
    } else if (isDedicated) {
      contentMessage = "**🚀 DEDICATED SERVER**\n" + contentMessage;
    } else {
      contentMessage = "**✨ NEW ORDER**\n" + contentMessage;
    }
    
    if (orderDetails.discordId) {
      contentMessage += `\n\n📋 **Customer Discord ID:** \`${orderDetails.discordId}\``;
    }

    const discordPayload = {
      content: contentMessage,
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
