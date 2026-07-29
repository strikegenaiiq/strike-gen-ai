import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");

if (!SUPABASE_URL) throw new Error("SUPABASE_URL is required");
if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required");
if (!PAYSTACK_SECRET_KEY) throw new Error("PAYSTACK_SECRET_KEY is required");

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function logRejection(reason: string, metadata: Record<string, unknown>) {
  await supabaseAdmin.from("audit_logs").insert({
    action: "paystack_webhook_rejected",
    target_type: "payment",
    description: reason,
    metadata,
  });
}

// Paystack signs the raw request body with HMAC-SHA512 using your secret key.
// Unlike Flutterwave's static-hash comparison, this one is a real HMAC.
async function verifySignature(rawBody: string, signature: string): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(PAYSTACK_SECRET_KEY),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const computedHex = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return computedHex === signature;
}

async function verifyWithPaystack(reference: string): Promise<{ ok: boolean; data?: any }> {
  const resp = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } },
  );
  const json = await resp.json().catch(() => ({}));
  if (!resp.ok) return { ok: false, data: json };
  const tx = json?.data;
  const ok = json?.status === true && tx?.status === "success";
  return { ok, data: tx };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const rawBody = await req.text();
  const signature = req.headers.get("x-paystack-signature") ?? "";

  const validSignature = signature && (await verifySignature(rawBody, signature));
  if (!validSignature) {
    return jsonResponse({ error: "Unauthorized signature" }, 401);
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  if (payload?.event !== "charge.success") {
    return jsonResponse({ status: "ignored", reason: "unhandled_event" }, 200);
  }

  const reference: string | undefined = payload?.data?.reference;
  const userId: string | undefined = payload?.data?.metadata?.user_id;
  const planIdRaw = payload?.data?.metadata?.plan_id;
  const packIdRaw = payload?.data?.metadata?.pack_id;

  if (!reference) return jsonResponse({ error: "Missing reference" }, 400);
  if (!userId) {
    await logRejection("Missing user_id in webhook metadata", { reference });
    return jsonResponse({ error: "Missing user_id" }, 400);
  }
  if (!planIdRaw && !packIdRaw) {
    await logRejection("Missing plan_id/pack_id in webhook metadata", { reference, userId });
    return jsonResponse({ error: "Missing plan_id or pack_id" }, 400);
  }

  const verified = await verifyWithPaystack(reference);
  if (!verified.ok) {
    await logRejection("Paystack verification failed", { reference, userId, response: verified.data });
    return jsonResponse({ status: "ignored", reason: "not_verified" }, 200);
  }

  const paymentType: "subscription" | "token_purchase" = planIdRaw ? "subscription" : "token_purchase";
  const planId = planIdRaw ? Number(planIdRaw) : null;
  const packId = packIdRaw ? Number(packIdRaw) : null;

  const verifiedAmount = Number(verified.data?.amount ?? 0) / 100;
  const verifiedCurrency: string = verified.data?.currency ?? "NGN";

  let expectedPrice: number | null = null;
  if (paymentType === "subscription") {
    const { data: plan } = await supabaseAdmin
      .from("subscription_plans")
      .select("monthly_price_usd, is_active")
      .eq("id", planId)
      .maybeSingle();
    if (!plan || !plan.is_active) {
      await logRejection("Unknown or inactive plan_id", { reference, userId, planId });
      return jsonResponse({ error: "Unknown plan" }, 400);
    }
    expectedPrice = Number(plan.monthly_price_usd);
  } else {
    const { data: pack } = await supabaseAdmin
      .from("token_packs")
      .select("price_usd, is_active")
      .eq("id", packId)
      .maybeSingle();
    if (!pack || !pack.is_active) {
      await logRejection("Unknown or inactive pack_id", { reference, userId, packId });
      return jsonResponse({ error: "Unknown pack" }, 400);
    }
    expectedPrice = Number(pack.price_usd);
  }

  if (verifiedCurrency === "USD" && expectedPrice !== null) {
    const tolerance = 0.01;
    if (Math.abs(verifiedAmount - expectedPrice) > tolerance) {
      await logRejection("Amount mismatch", {
        reference, userId, expectedPrice, verifiedAmount, verifiedCurrency,
      });
      return jsonResponse({ error: "Amount mismatch" }, 400);
    }
  } else {
    await supabaseAdmin.from("audit_logs").insert({
      action: "paystack_webhook_currency_mismatch",
      target_type: "payment",
      description: "Verified amount currency differs from stored USD price; skipped strict amount check",
      metadata: { reference, userId, expectedPrice, verifiedAmount, verifiedCurrency },
    });
  }

  const { data: result, error: rpcError } = await supabaseAdmin.rpc("fulfill_flutterwave_payment", {
    p_user_id: userId,
    p_tx_ref: reference,
    p_payment_type: paymentType,
    p_plan_id: paymentType === "subscription" ? planId : null,
    p_pack_id: paymentType === "token_purchase" ? packId : null,
    p_amount_paid: verifiedAmount,
    p_currency: verifiedCurrency,
    p_provider: "paystack",
  });

  if (rpcError) {
    await logRejection("Fulfillment RPC failed", { reference, userId, error: rpcError.message });
    return jsonResponse({ error: "Fulfillment failed" }, 500);
  }

  return jsonResponse({ status: "ok", result });
});
