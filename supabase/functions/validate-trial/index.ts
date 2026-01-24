import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-forwarded-for, x-real-ip',
};

interface TrialRequest {
  discordId: string;
  fingerprint: string;
  email?: string;
  userId?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const trialRequest: TrialRequest = await req.json();
    
    console.log("Validating trial request:", { 
      discordId: trialRequest.discordId, 
      fingerprint: trialRequest.fingerprint?.substring(0, 20) + '...' 
    });

    // Get IP address from headers (Cloudflare/proxy headers)
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                      req.headers.get('x-real-ip') ||
                      req.headers.get('cf-connecting-ip') ||
                      'unknown';
    
    console.log("Client IP:", ipAddress);

    // Check if this Discord ID has already used a trial
    const { data: discordCheck, error: discordError } = await supabase
      .from('trial_usage')
      .select('id, created_at')
      .eq('discord_id', trialRequest.discordId)
      .limit(1);

    if (discordError) {
      console.error("Error checking Discord ID:", discordError);
      throw new Error("Database error");
    }

    if (discordCheck && discordCheck.length > 0) {
      console.log("Trial already used by this Discord ID");
      return new Response(
        JSON.stringify({ 
          allowed: false, 
          reason: "discord_id",
          message: "This Discord ID has already used a trial." 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Check if this IP address has already used a trial
    if (ipAddress !== 'unknown') {
      const { data: ipCheck, error: ipError } = await supabase
        .from('trial_usage')
        .select('id, created_at')
        .eq('ip_address', ipAddress)
        .limit(1);

      if (ipError) {
        console.error("Error checking IP:", ipError);
        throw new Error("Database error");
      }

      if (ipCheck && ipCheck.length > 0) {
        console.log("Trial already used from this IP address");
        return new Response(
          JSON.stringify({ 
            allowed: false, 
            reason: "ip_address",
            message: "A trial has already been used from this network." 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }
    }

    // Check if this fingerprint has already used a trial
    if (trialRequest.fingerprint) {
      const { data: fingerprintCheck, error: fingerprintError } = await supabase
        .from('trial_usage')
        .select('id, created_at')
        .eq('fingerprint', trialRequest.fingerprint)
        .limit(1);

      if (fingerprintError) {
        console.error("Error checking fingerprint:", fingerprintError);
        throw new Error("Database error");
      }

      if (fingerprintCheck && fingerprintCheck.length > 0) {
        console.log("Trial already used from this device");
        return new Response(
          JSON.stringify({ 
            allowed: false, 
            reason: "fingerprint",
            message: "A trial has already been used on this device." 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }
    }

    // All checks passed - record the trial usage
    const { error: insertError } = await supabase
      .from('trial_usage')
      .insert({
        user_id: trialRequest.userId || null,
        discord_id: trialRequest.discordId,
        ip_address: ipAddress,
        fingerprint: trialRequest.fingerprint || 'unknown',
        email: trialRequest.email || null
      });

    if (insertError) {
      console.error("Error recording trial usage:", insertError);
      throw new Error("Failed to record trial usage");
    }

    console.log("Trial validated and recorded successfully");
    
    return new Response(
      JSON.stringify({ 
        allowed: true, 
        message: "Trial approved" 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error validating trial:", error);
    return new Response(
      JSON.stringify({ error: errorMessage, allowed: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
