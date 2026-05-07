import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildCorsHeaders } from "../_shared/cors.ts";
import { checkRateLimit, clientKey, rateLimitResponse } from "../_shared/rate-limit.ts";

const DISCORD_WEBHOOK_URL = Deno.env.get('DISCORD_ORDER_WEBHOOK_URL') || '';

const MAX_BODY_BYTES = 8 * 1024; // 8 KB cap for order payloads
const STR = (max: number) => (v: unknown) => typeof v === 'string' && v.length <= max;
const NUM = (min: number, max: number) => (v: unknown) =>
  typeof v === 'number' && isFinite(v) && v >= min && v <= max;

function validateOrder(o: any): { ok: true; data: OrderDetails } | { ok: false; error: string } {
  if (!o || typeof o !== 'object') return { ok: false, error: 'Invalid payload' };
  if (!STR(64)(o.plan)) return { ok: false, error: 'Invalid plan' };
  if (!STR(64)(o.commitment)) return { ok: false, error: 'Invalid commitment' };
  if (!STR(32)(o.serverType)) return { ok: false, error: 'Invalid serverType' };
  if (!STR(255)(o.email)) return { ok: false, error: 'Invalid email' };
  if (o.discordId != null && !(typeof o.discordId === 'string' && /^\d{17,19}$/.test(o.discordId)))
    return { ok: false, error: 'Invalid discordId' };
  if (o.discordUsername != null && !STR(64)(o.discordUsername))
    return { ok: false, error: 'Invalid discordUsername' };
  if (!NUM(0, 1_000_000)(o.totalAmount)) return { ok: false, error: 'Invalid totalAmount' };
  if (!STR(128)(o.transactionSignature ?? '')) return { ok: false, error: 'Invalid transactionSignature' };
  if (typeof o.isTestMode !== 'boolean') return { ok: false, error: 'Invalid isTestMode' };
  if (o.discountCode != null && !STR(64)(o.discountCode)) return { ok: false, error: 'Invalid discountCode' };
  if (o.swqosLabel != null && !STR(64)(o.swqosLabel)) return { ok: false, error: 'Invalid swqosLabel' };
  return { ok: true, data: o as OrderDetails };
}

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
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require authenticated user — order notifications are tied to a real customer.
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(authHeader.replace('Bearer ', ''));
    if (claimsErr || !claimsData?.claims?.sub) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub;

    // Rate limit per authenticated user: 10 order notifications / minute
    const rl = checkRateLimit(`order:${userId}`, { limit: 10, windowMs: 60_000 });
    if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

    // Body size cap
    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) {
      return new Response(JSON.stringify({ error: 'Payload too large' }), {
        status: 413,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    let parsed: unknown;
    try { parsed = JSON.parse(raw); } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const validation = validateOrder(parsed);
    if (!validation.ok) {
      return new Response(JSON.stringify({ error: validation.error }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const orderDetails: OrderDetails = validation.data;

    const isDedicated = orderDetails.serverType === "dedicated" || orderDetails.serverType === "Dedicated";

    // Staff pings
    const isSwQoS = orderDetails.serverType === "swqos";
    const hasShreds = orderDetails.includeShreds || orderDetails.privateShredsEnabled;
    const needsSecondPing = isDedicated || isSwQoS || hasShreds;
    let pingMessage = needsSecondPing
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
    console.error("Error sending Discord notification:", error);
    return new Response(
      JSON.stringify({ error: 'Internal error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
