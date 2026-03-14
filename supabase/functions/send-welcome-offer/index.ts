import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOGO_URL = "https://mmkornqvbafkricqixgk.supabase.co/storage/v1/object/public/email-assets/omega-logo-new.png";

function generateCode(prefix: string): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = prefix;
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function buildWelcomeEmail(
  sharedCode: string,
  dedicatedCode: string
): string {
  const codeCard = (label: string, discount: string, code: string) => `
    <div style="background:linear-gradient(135deg,#13132a 0%,#1a1a35 100%);border:1px solid rgba(91,78,228,0.2);border-radius:12px;padding:20px 24px;margin-bottom:12px;">
      <p style="font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#888;margin:0 0 8px;font-weight:600;">${label} &mdash; ${discount} off</p>
      <p style="font-size:28px;font-weight:800;color:#7C6FF7;letter-spacing:4px;margin:0;font-family:'Courier New',monospace;">${code}</p>
    </div>`;

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');</style>
</head>
<body style="margin:0;padding:0;background-color:#0a0a14;font-family:'Inter',system-ui,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:48px 32px;">

<img src="${LOGO_URL}" width="36" height="36" alt="OmegaNodes" style="display:block;margin-bottom:32px;" />

<h1 style="font-size:26px;font-weight:800;color:#ffffff;margin:0 0 12px;line-height:1.3;">Welcome to OmegaNodes 🎉</h1>

<p style="font-size:14px;color:#a0a3b1;line-height:1.6;margin:0 0 28px;">
  Thanks for signing up! As a welcome gift, here are exclusive discount codes for your first month on our Solana node infrastructure.
</p>

<div style="margin-bottom:28px;">
  ${codeCard("Shared Servers", "25%", sharedCode)}
  ${codeCard("Dedicated Servers", "15%", dedicatedCode)}
</div>

<p style="font-size:13px;color:#888;margin:0 0 24px;">Apply the code at checkout. Valid for your first monthly purchase only.</p>

<div style="text-align:center;margin-bottom:8px;">
  <a href="https://omeganodes.io/#pricing" style="display:inline-block;background:linear-gradient(135deg,#5B4EE4,#7C6FF7);color:#fff;font-size:14px;font-weight:600;border-radius:10px;padding:14px 32px;text-decoration:none;box-shadow:0 4px 20px rgba(91,78,228,0.35);">View Plans</a>
</div>

<div style="margin-top:48px;padding-top:24px;border-top:1px solid rgba(255,255,255,0.06);">
  <p style="font-size:11px;color:#555;margin:0;">OmegaNodes &middot; Solana Node Infrastructure</p>
</div>

</div></body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Missing email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use a nil UUID for system-generated codes
    const systemUuid = "00000000-0000-0000-0000-000000000000";

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Generate unique codes
    const sharedCode = generateCode("WELCOME-S-");
    const dedicatedCode = generateCode("WELCOME-D-");

    // Set expiry to 30 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Create discount codes in DB
    const { error: codeError } = await serviceClient
      .from("discount_codes")
      .insert([
        {
          code: sharedCode,
          discount_type: "percentage",
          discount_value: 25,
          applicable_to: "shared",
          max_uses: 1,
          expires_at: expiresAt.toISOString(),
          created_by: systemUuid,
          is_active: true,
        },
        {
          code: dedicatedCode,
          discount_type: "percentage",
          discount_value: 15,
          applicable_to: "dedicated",
          max_uses: 1,
          expires_at: expiresAt.toISOString(),
          created_by: systemUuid,
          is_active: true,
        },
      ]);

    if (codeError) {
      throw new Error(`Failed to create discount codes: ${codeError.message}`);
    }

    // Queue welcome email
    const htmlContent = buildWelcomeEmail(sharedCode, dedicatedCode);

    const { error: emailError } = await serviceClient
      .from("email_queue")
      .insert({
        recipient: email,
        subject: "Welcome to OmegaNodes — here's your discount 🎁",
        html_content: htmlContent,
        from_name: "OmegaNodes",
        status: "pending",
        created_by: userId,
      });

    if (emailError) {
      throw new Error(`Failed to queue welcome email: ${emailError.message}`);
    }

    return new Response(
      JSON.stringify({ success: true, sharedCode, dedicatedCode }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error sending welcome offer:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
