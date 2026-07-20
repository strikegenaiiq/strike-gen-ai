import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const FLUTTERWAVE_SECRET_HASH = Deno.env.get("FLUTTERWAVE_SECRET_HASH");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (!FLUTTERWAVE_SECRET_HASH || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse({ error: "Server misconfigured" }, 500);
  }

  try {
    // 1. Verify the request is authentically from Flutterwave
    const signature = req.headers.get("verif-hash");
    if (!signature || signature !== FLUTTERWAVE_SECRET_HASH) {
      return jsonResponse({ error: "Unauthorized signature" }, 401);
    }

    const body = await req.json();

    // 2. Only fulfill successful transactions
    if (body.status !== "successful") {
      return jsonResponse({ status: "ignored", reason: "not_successful" });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const userId: string | undefined = body.meta?.user_id;
    const packName: string | undefined = body.meta?.pack_name;
    const planId: string | undefined = body.meta?.plan_id;
    const txRef: string | undefined = body.tx_ref;
    const currency: string = body.currency ?? "USD";

    if (!userId) {
      return jsonResponse({ error: "Missing user metadata" }, 400);
    }
    if (!txRef) {
      return jsonResponse({ error: "Missing transaction reference" }, 400);
    }

    // 3. Handle token pack purchase
    if (packName) {
      const { data: pack, error } = await supabase
        .from("token_packs")
        .select("credits")
        .eq("name", packName)
        .maybeSingle();

      if (error) {
        return jsonResponse({ error: "Failed to fetch pack", detail: error.message }, 500);
      }
      if (!pack) {
        return jsonResponse({ error: `Unknown pack: ${packName}` }, 400);
      }

      const { data: result, error: rpcError } = await supabase.rpc("fulfill_flutterwave_payment", {
        p_user_id: userId,
        p_amount: pack.credits,
        p_tx_type: "pack_purchase",
        p_tx_ref: txRef,
        p_currency: currency,
        p_provider: "flutterwave",
      });

      if (rpcError) {
        return jsonResponse({ error: "Fulfillment failed", detail: rpcError.message }, 500);
      }
      return jsonResponse({ status: "success", fulfillment: result });
    }

    // 4. Handle subscription plan renewals
    if (planId) {
      const { data: plan, error } = await supabase
        .from("subscription_plans")
        .select("included_credits")
        .eq("id", planId)
        .maybeSingle();

      if (error) {
        return jsonResponse({ error: "Failed to fetch plan", detail: error.message }, 500);
      }
      if (!plan) {
        return jsonResponse({ error: `Unknown plan: ${planId}` }, 400);
      }

      const { data: result, error: rpcError } = await supabase.rpc("fulfill_flutterwave_payment", {
        p_user_id: userId,
        p_amount: plan.included_credits,
        p_tx_type: "subscription_grant",
        p_tx_ref: txRef,
        p_currency: currency,
        p_provider: "flutterwave",
      });

      if (rpcError) {
        return jsonResponse({ error: "Fulfillment failed", detail: rpcError.message }, 500);
      }
      return jsonResponse({ status: "success", fulfillment: result });
    }

    return jsonResponse({ error: "No pack_name or plan_id in metadata" }, 400);
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Internal error" },
      500
    );
  }
});
