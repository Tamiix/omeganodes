import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Grab the next 10 pending emails
    const { data: pending, error: fetchError } = await serviceClient
      .from("email_queue")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(10);

    if (fetchError) {
      throw new Error(`Failed to fetch queue: ${fetchError.message}`);
    }

    if (!pending || pending.length === 0) {
      return new Response(
        JSON.stringify({ processed: 0, message: "Queue empty" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark them as "sending" to prevent double-processing
    const ids = pending.map((e: any) => e.id);
    await serviceClient
      .from("email_queue")
      .update({ status: "sending" })
      .in("id", ids);

    const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

    let sent = 0;
    let failed = 0;

    for (let i = 0; i < pending.length; i++) {
      const item = pending[i];

      // Wait 600ms between sends to stay under Resend's 2 req/s limit
      if (i > 0) await delay(600);

      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: `${item.from_name} <noreply@omegatest.xyz>`,
            to: [item.recipient],
            subject: item.subject,
            html: item.html_content,
          }),
        });

        if (!res.ok) {
          const errBody = await res.text();
          throw new Error(`Resend [${res.status}]: ${errBody}`);
        }

        await serviceClient
          .from("email_queue")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("id", item.id);
        sent++;
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Unknown error";
        console.error(`Failed to send to ${item.recipient}: ${errMsg}`);
        await serviceClient
          .from("email_queue")
          .update({ status: "failed", error: errMsg })
          .eq("id", item.id);
        failed++;
      }
    }

    console.log(`Queue processed: ${sent} sent, ${failed} failed`);

    return new Response(
      JSON.stringify({ processed: pending.length, sent, failed }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error processing email queue:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
