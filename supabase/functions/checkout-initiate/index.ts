import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");
const FLUTTERWAVE_SECRET_KEY = Deno.env.get("FLUTTERWAVE_SECRET_KEY");
const EXCHANGE_RATE_API_KEY = Deno.env.get("EXCHANGE_RATE_API_KEY");
const FRONTEND_BASE_URL = Deno.env.get("FRONTEND_BASE_URL");

for (const [name, val] of Object.entries({
  SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY,
  PAYSTACK_SECRET_KEY, FLUTTERWAVE_SECRET_KEY, EXCHANGE_RATE_API_KEY, FRONTEND_BASE_URL,
})) {
  if (!val) throw new Error(`${name} is required`);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function getLiveFxRate(from, to) {
  const res = await fetch(`https://v6.exchangerate-api.com/v6/${EXCHANGE_RATE_API_KEY}/pair/${from}/${to}`);
  if (!res.ok) throw new Error(`FX rate fetch failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  if (data.result !== "success") throw new Error(`FX rate API error: ${JSON.stringify(data)}`);
  return { rate: data.conversion_rate, source: "exchangerate-api.com", fetchedAt: new Date().toISOString() };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) return jsonResponse({ error: "Missing Authorization header" }, 401);

  const supabaseAsUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  const { data: userData, error: userError } = await supabaseAsUser.auth.getUser(token);
  if (userError || !userData?.user) return jsonResponse({ error: "Not authenticated" }, 401);
  const userId = userData.user.id;
  const userEmail = userData.user.email;
  if (!userEmail) return jsonResponse({ error: "User has no email on file" }, 400);

  let body;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const { provider, planId, packId } = body;
  if (provider !== "paystack" && provider !== "flutterwave") {
    return jsonResponse({ error: "provider must be 'paystack' or 'flutterwave'" }, 400);
  }
  if (!planId && !packId) return jsonResponse({ error: "planId or packId is required" }, 400);

  try {
    const paymentType = planId ? "subscription" : "token_purchase";
    let usdPrice;

    if (paymentType === "subscription") {
      const { data: plan, error } = await supabaseAdmin
        .from("subscription_plans")
        .select("monthly_price_usd, is_active")
        .eq("id", planId)
        .single();
      if (error || !plan || !plan.is_active) return jsonResponse({ error: "Plan not found or inactive" }, 404);
      usdPrice = plan.monthly_price_usd;
    } else {
      const { data: pack, error } = await supabaseAdmin
        .from("token_packs")
        .select("price_usd, is_active")
        .eq("id", packId)
        .single();
      if (error || !pack || !pack.is_active) return jsonResponse({ error: "Token pack not found or inactive" }, 404);
      usdPrice = pack.price_usd;
    }

    const targetCurrency = "NGN";
    const fx = await getLiveFxRate("USD", targetCurrency);
    const expectedAmount = Math.ceil(usdPrice * fx.rate * 100) / 100;
    const txRef = `sga_${crypto.randomUUID()}`;

    const { error: intentError } = await supabaseAdmin.from("payment_intents").insert({
      tx_ref: txRef,
      user_id: userId,
      payment_type: paymentType,
      plan_id: paymentType === "subscription" ? planId : null,
      pack_id: paymentType === "token_purchase" ? packId : null,
      expected_amount: expectedAmount,
      expected_currency: targetCurrency,
      usd_reference_price: usdPrice,
      fx_rate_used: fx.rate,
      fx_rate_source: fx.source,
      fx_rate_fetched_at: fx.fetchedAt,
      status: "pending",
    });

    if (intentError) throw new Error(`Failed to write payment_intent: ${intentError.message}`);

    const metadata = {
      user_id: userId,
      plan_id: paymentType === "subscription" ? planId : undefined,
      pack_id: paymentType === "token_purchase" ? packId : undefined,
    };

    if (provider === "paystack") {
      const resp = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          email: userEmail,
          amount: Math.round(expectedAmount * 100),
          currency: targetCurrency,
          reference: txRef,
          metadata,
        }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.status) throw new Error(`Paystack initialize failed: ${JSON.stringify(data)}`);
      return jsonResponse({ checkoutUrl: data.data.authorization_url, txRef, expectedAmount, currency: targetCurrency });
    } else {
      const resp = await fetch("https://api.flutterwave.com/v3/payments", {
        method: "POST",
        headers: { Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          tx_ref: txRef,
          amount: expectedAmount,
          currency: targetCurrency,
          customer: { email: userEmail },
          meta: metadata,
          redirect_url: `${FRONTEND_BASE_URL}/checkout/callback`,
        }),
      });
      const data = await resp.json();
      if (!resp.ok || data.status !== "success") throw new Error(`Flutterwave initialize failed: ${JSON.stringify(data)}`);
      return jsonResponse({ checkoutUrl: data.data.link, txRef, expectedAmount, currency: targetCurrency });
    }
  } catch (err) {
    console.error("Checkout initiation failed:", err);
    return jsonResponse({ error: "Checkout initiation failed" }, 500);
  }
});
