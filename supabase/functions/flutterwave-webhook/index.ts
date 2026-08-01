import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const FLUTTERWAVE_SECRET_KEY = Deno.env.get("FLUTTERWAVE_SECRET_KEY");
const FLUTTERWAVE_SECRET_HASH = Deno.env.get("FLUTTERWAVE_WEBHOOK_SECRET");

if (!SUPABASE_URL) throw new Error("SUPABASE_URL is required");
if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required");
if (!FLUTTERWAVE_SECRET_KEY) throw new Error("FLUTTERWAVE_SECRET_KEY is required");
if (!FLUTTERWAVE_SECRET_HASH) throw new Error("FLUTTERWAVE_WEBHOOK_SECRET is required");

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function logRejection(reason, metadata) {
  await supabaseAdmin.from("audit_logs").insert({
    action: "flutterwave_webhook_rejected",
    target_type: "payment",
    description: reason,
    metadata,
  });
}

async function verifyWithFlutterwave(txRef) {
  const resp = await fetch(
    `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(txRef)}`,
    { headers: { Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}` } },
  );
  const json = await resp.json().catch(() => ({}));
  if (!resp.ok) return { ok: false, data: json };
  const tx = json?.data;
  const ok = json?.status === "success" && tx?.status === "successful";
  return { ok, data: tx };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const signature = req.headers.get("verif-hash") ?? "";
  if (!signature || signature !== FLUTTERWAVE_SECRET_HASH) {
    return jsonResponse({ error: "Unauthorized signature" }, 401);
  }

  const rawBody = await req.text();
  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const txRef = payload?.data?.tx_ref ?? payload?.tx_ref;
  const userId = payload?.data?.meta?.user_id ?? payload?.meta?.user_id;
  const planIdRaw = payload?.data?.meta?.plan_id ?? payload?.meta?.plan_id;
  const packIdRaw = payload?.data?.meta?.pack_id ?? payload?.meta?.pack_id;

  if (!txRef) return jsonResponse({ error: "Missing tx_ref" }, 400);
  if (!userId) {
    await logRejection("Missing user_id in webhook metadata", { txRef });
    return jsonResponse({ error: "Missing user_id" }, 400);
  }
  if (!planIdRaw && !packIdRaw) {
    await logRejection("Missing plan_id/pack_id in webhook metadata", { txRef, userId });
    return jsonResponse({ error: "Missing plan_id or pack_id" }, 400);
  }

  const verified = await verifyWithFlutterwave(txRef);
  if (!verified.ok) {
    await logRejection("Flutterwave verification failed", { txRef, userId, response: verified.data });
    return jsonResponse({ status: "ignored", reason: "not_verified" }, 200);
  }

  const paymentType = planIdRaw ? "subscription" : "token_purchase";
  const planId = planIdRaw ? Number(planIdRaw) : null;
  const packId = packIdRaw ? Number(packIdRaw) : null;
  const verifiedAmount = Number(verified.data?.amount ?? 0);
  const verifiedCurrency = verified.data?.currency ?? "NGN";

  const { data: intent, error: intentError } = await supabaseAdmin
    .from("payment_intents")
    .select("expected_amount, expected_currency, status")
    .eq("tx_ref", txRef)
    .maybeSingle();

  if (intentError || !intent) {
    await logRejection("No matching payment_intent found", { txRef, userId, error: intentError?.message });
    return jsonResponse({ error: "No matching payment intent" }, 400);
  }

  if (intent.status === "fulfilled") {
    return jsonResponse({ status: "already_processed" });
  }

  if (intent.expected_currency !== verifiedCurrency) {
    await logRejection("Currency mismatch vs locked intent", {
      txRef, userId, expected: intent.expected_currency, actual: verifiedCurrency,
    });
    return jsonResponse({ error: "Currency mismatch" }, 400);
  }

  const tolerance = 0.01;
  if (verifiedAmount + tolerance < Number(intent.expected_amount)) {
    await logRejection("Underpayment vs locked intent", {
      txRef, userId, expected: intent.expected_amount, verifiedAmount, verifiedCurrency,
    });
    return jsonResponse({ error: "Amount does not meet expected charge" }, 400);
  }

  const { data: result, error: rpcError } = await supabaseAdmin.rpc("fulfill_payment", {
    p_user_id: userId,
    p_tx_ref: txRef,
    p_payment_type: paymentType,
    p_plan_id: paymentType === "subscription" ? planId : null,
    p_pack_id: paymentType === "token_purchase" ? packId : null,
    p_amount_paid: verifiedAmount,
    p_currency: verifiedCurrency,
    p_provider: "flutterwave",
  });

  if (rpcError) {
    await logRejection("Fulfillment RPC failed", { txRef, userId, error: rpcError.message });
    return jsonResponse({ error: "Fulfillment failed" }, 500);
  }

  return jsonResponse({ status: "ok", result });
});
