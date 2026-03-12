import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

function buildEmbed(order: OrderDetails) {
  const isFreeOrder = order.totalAmount === 0 && !order.isTrial;
  const isDedicated = order.serverType === "dedicated" || order.serverType === "Dedicated";
  const isSwQoS = order.serverType === "swqos";

  // Clean title and accent color
  let title: string;
  let color: number;

  if (order.isTrial) {
    title = "Trial Activated";
    color = 0x3B82F6; // blue
  } else if (order.isTestMode) {
    title = "Test Order";
    color = 0xEAB308; // yellow
  } else if (isFreeOrder) {
    title = "Free Order (100% Discount)";
    color = 0x8B5CF6; // purple
  } else if (isDedicated) {
    title = "Dedicated Server Order";
    color = 0xF59E0B; // amber
  } else if (isSwQoS) {
    title = "swQoS Order";
    color = 0x06B6D4; // cyan
  } else {
    title = "Shared Server Order";
    color = 0x22C55E; // green
  }

  // Product line — shows what was actually ordered
  const product = order.plan || order.serverType || "Unknown";

  // Order details as a compact block
  const detailLines: string[] = [];
  detailLines.push(`**Product:** ${product}`);
  if (!order.isTrial) {
    detailLines.push(`**Term:** ${order.commitment}`);
  }

  // Add-ons (only relevant ones)
  if (isDedicated) {
    const hasShreds = order.includeShreds || order.privateShredsEnabled;
    if (hasShreds) detailLines.push(`**Private Shreds:** Yes`);
    const stakePackages = order.additionalStakePackages || 0;
    if (stakePackages > 0) {
      const totalStake = 50000 + (stakePackages * 100000);
      detailLines.push(`**Extra Stake:** ${stakePackages}x (${totalStake.toLocaleString()} SOL)`);
    }
    if (order.swqosTier !== null && order.swqosTier !== undefined) {
      detailLines.push(`**swQoS:** ${order.swqosLabel || "Selected"}`);
    }
  }
  if (order.rentAccessEnabled) {
    detailLines.push(`**Rent Access:** Enabled`);
  }

  // Payment
  let amountStr: string;
  if (order.isTrial) {
    amountStr = "Free Trial";
  } else if (isFreeOrder) {
    amountStr = "$0.00 (100% off)";
  } else {
    amountStr = `$${(order.totalAmount || 0).toLocaleString()}`;
  }
  detailLines.push(`**Amount:** ${amountStr}`);

  if (order.discountCode) {
    detailLines.push(`**Discount:** \`${order.discountCode}\``);
  }

  // Transaction
  if (!order.isTrial && order.transactionSignature) {
    const sig = order.transactionSignature;
    if (sig.startsWith("FREE-") || sig.startsWith("TEST-") || sig.startsWith("TRIAL-")) {
      detailLines.push(`**Ref:** \`${sig}\``);
    } else {
      const url = `https://solscan.io/tx/${sig}`;
      detailLines.push(`**Tx:** [\`${sig.slice(0, 8)}...${sig.slice(-8)}\`](${url})`);
    }
  }

  // Customer
  detailLines.push(`**Email:** ${order.email || "N/A"}`);
  if (order.discordId) {
    detailLines.push(`**Discord:** <@${order.discordId}>`);
  }

  const fields = [
    {
      name: "\u200b",
      value: detailLines.join("\n"),
      inline: false
    }
  ];

  // Footer
  let footerText: string;
  if (order.isTrial) {
    footerText = "Trial — expires in 30 minutes";
  } else if (order.isTestMode) {
    footerText = "Test order — not real";
  } else {
    footerText = "OmegaNode";
  }

  return {
    title,
    color,
    fields,
    footer: { text: footerText },
    timestamp: new Date().toISOString()
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const orderDetails: OrderDetails = await req.json();
    console.log("Sending Discord notification for order:", orderDetails);

    const isDedicated = orderDetails.serverType === "dedicated" || orderDetails.serverType === "Dedicated";

    // Staff pings
    let pingMessage = isDedicated
      ? "||<@404356986340114442> <@545046451219070980>||"
      : "||<@404356986340114442>||";

    // Label
    let label = "NEW ORDER";
    if (orderDetails.isTrial) label = "TRIAL REQUEST";
    else if (orderDetails.isTestMode) label = "TEST ORDER";
    else if (orderDetails.totalAmount === 0 && !orderDetails.isTrial) label = "FREE ORDER";
    else if (isDedicated) label = "DEDICATED SERVER";

    let content = `**${label}**\n${pingMessage}`;
    if (orderDetails.discordId) {
      content += `\n\nCustomer Discord ID: \`${orderDetails.discordId}\``;
    }

    const embed = buildEmbed(orderDetails);

    const discordResponse = await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, embeds: [embed] }),
    });

    if (!discordResponse.ok) {
      const errorText = await discordResponse.text();
      console.error("Discord webhook error:", errorText);
      throw new Error(`Discord webhook failed: ${discordResponse.status}`);
    }

    console.log("Discord notification sent successfully");

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error sending Discord notification:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
