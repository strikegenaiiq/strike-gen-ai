import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const REPLICATE_WEBHOOK_SECRET = Deno.env.get("REPLICATE_WEBHOOK_SECRET");

if (!SUPABASE_URL) throw new Error("SUPABASE_URL is required");
if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required");
if (!REPLICATE_WEBHOOK_SECRET) throw new Error("REPLICATE_WEBHOOK_SECRET is required");

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS = 300;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a[i] ^ b[i];
  return difference === 0;
}

async function verifyReplicateWebhook(body: string, req: Request) {
  const webhookId = req.headers.get("webhook-id");
  const webhookTimestamp = req.headers.get("webhook-timestamp");
  const webhookSignature = req.headers.get("webhook-signature");

  if (!webhookId || !webhookTimestamp || !webhookSignature) return false;

  const timestamp = Number(webhookTimestamp);
  if (!Number.isInteger(timestamp)) return false;
  if (Math.abs(Math.floor(Date.now() / 1000) - timestamp) > WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS) return false;

  const secret = REPLICATE_WEBHOOK_SECRET.startsWith("whsec_")
    ? REPLICATE_WEBHOOK_SECRET.slice("whsec_".length)
    : REPLICATE_WEBHOOK_SECRET;

  let secretBytes: Uint8Array;
  try {
    secretBytes = base64ToBytes(secret);
  } catch {
    return false;
  }

  const key = await crypto.subtle.importKey(
    "raw",
    secretBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signedContent = `${webhookId}.${webhookTimestamp}.${body}`;
  const expected = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedContent)),
  );

  return webhookSignature.split(" ").some((signature) => {
    const [version, encodedSignature] = signature.split(",", 2);
    if (version !== "v1" || !encodedSignature) return false;
    try {
      return constantTimeEqual(expected, base64ToBytes(encodedSignature));
    } catch {
      return false;
    }
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const url = new URL(req.url);
  const jobId = url.searchParams.get("job_id");
  if (!jobId) return jsonResponse({ error: "Missing job_id" }, 400);

  const body = await req.text();
  if (!(await verifyReplicateWebhook(body, req))) {
    return jsonResponse({ error: "Invalid webhook signature" }, 401);
  }

  let payload;
  try {
    payload = JSON.parse(body);
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const { data: job, error: jobError } = await supabaseAdmin
    .from("generation_jobs")
    .select("id, user_id, project_id, provider, model, request, status")
    .eq("id", jobId)
    .single();

  if (jobError || !job) return jsonResponse({ error: "Job not found" }, 404);

  if (job.status === "completed" || job.status === "failed") {
    return jsonResponse({ status: "already_processed" });
  }

  if (payload.status === "succeeded") {
    const outputUrl = Array.isArray(payload.output) ? payload.output[0] : payload.output;
    const tokensToCharge = job.request?.tokens_to_charge ?? 0;

    await supabaseAdmin
      .from("generation_jobs")
      .update({ status: "completed", progress: 100 })
      .eq("id", jobId);

    const { error: assetError } = await supabaseAdmin.from("generated_assets").insert({
      user_id: job.user_id,
      project_id: job.project_id,
      asset_type: "video",
      provider: job.provider,
      storage_url: outputUrl,
      generation_status: "completed",
      tokens_consumed: tokensToCharge,
      meta_parameters: job.request,
    });
    if (assetError) console.error("Failed to insert generated_asset:", assetError.message);

    if (tokensToCharge > 0) {
      const { error: ledgerError } = await supabaseAdmin.from("token_ledgers").insert({
        user_id: job.user_id,
        amount: -tokensToCharge,
        transaction_type: "video_generation",
        entry_type: "consumption",
        reference: jobId,
        description: `Video generation: ${job.model}`,
      });
      if (ledgerError) console.error("Failed to deduct token_ledgers:", ledgerError.message);
    }

    return jsonResponse({ status: "ok" });
  }

  if (payload.status === "failed" || payload.status === "canceled") {
    await supabaseAdmin
      .from("generation_jobs")
      .update({ status: "failed", progress: 0 })
      .eq("id", jobId);

    await supabaseAdmin.from("generated_assets").insert({
      user_id: job.user_id,
      project_id: job.project_id,
      asset_type: "video",
      provider: job.provider,
      generation_status: "failed",
      tokens_consumed: 0,
      meta_parameters: job.request,
      error_message: payload.error ?? "Generation failed",
    });

    return jsonResponse({ status: "ok" });
  }

  return jsonResponse({ status: "ignored" });
});
