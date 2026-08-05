import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const REPLICATE_API_TOKEN = Deno.env.get("REPLICATE_API_TOKEN");
const REPLICATE_WEBHOOK_SECRET = Deno.env.get("REPLICATE_WEBHOOK_SECRET");

for (const [name, value] of Object.entries({
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  REPLICATE_API_TOKEN,
  REPLICATE_WEBHOOK_SECRET,
})) {
  if (!value) throw new Error(`${name} is required`);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function verifyReplicateWebhook(rawBody: string, webhookId: string, timestamp: string, signatureHeader: string) {
  const timestampSeconds = Number(timestamp);
  if (!Number.isFinite(timestampSeconds)) return false;

  const ageSeconds = Math.abs(Date.now() / 1000 - timestampSeconds);
  if (ageSeconds > 300) return false;

  const secret = REPLICATE_WEBHOOK_SECRET.replace(/^whsec_/, "");
  const key = await crypto.subtle.importKey(
    "raw",
    base64ToBytes(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );

  const signedContent = `${webhookId}.${timestamp}.${rawBody}`;
  const signatures = signatureHeader
    .split(" ")
    .map((value) => value.trim())
    .filter((value) => value.startsWith("v1,"))
    .map((value) => value.slice(3));

  const data = new TextEncoder().encode(signedContent);
  return signatures.some((signature) => {
    try {
      return crypto.subtle.verify("HMAC", key, base64ToBytes(signature), data);
    } catch {
      return false;
    }
  });
}

async function persistReplicateOutput(outputUrl: string, userId: string, jobId: string) {
  const response = await fetch(outputUrl, {
    headers: { Authorization: `Bearer ${REPLICATE_API_TOKEN}` },
  });
  if (!response.ok) {
    throw new Error(`Failed to download Replicate output: ${response.status}`);
  }

  const contentType = response.headers.get("content-type")?.split(";")[0] ?? "video/mp4";
  const extension = contentType === "video/webm" ? "webm" : "mp4";
  const storagePath = `${userId}/${jobId}.${extension}`;
  const bytes = new Uint8Array(await response.arrayBuffer());

  const { error } = await supabaseAdmin.storage
    .from("generated-videos")
    .upload(storagePath, bytes, {
      contentType,
      cacheControl: "31536000",
      upsert: true,
    });

  if (error) throw new Error(`Failed to persist generated video: ${error.message}`);
  return storagePath;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const rawBody = await req.text();
  const webhookId = req.headers.get("webhook-id") ?? "";
  const webhookTimestamp = req.headers.get("webhook-timestamp") ?? "";
  const webhookSignature = req.headers.get("webhook-signature") ?? "";

  const valid = await verifyReplicateWebhook(rawBody, webhookId, webhookTimestamp, webhookSignature);
  if (!valid) return jsonResponse({ error: "Invalid webhook signature" }, 401);

  let payload: {
    id?: string;
    status?: string;
    output?: string | string[] | null;
    error?: string | null;
  };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const url = new URL(req.url);
  const jobId = url.searchParams.get("job_id");
  if (!jobId) return jsonResponse({ error: "Missing job_id" }, 400);

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
    if (!outputUrl || !job.user_id) return jsonResponse({ error: "Missing generated output" }, 422);

    try {
      const storagePath = await persistReplicateOutput(outputUrl, job.user_id, job.id);
      const tokensToCharge = Number(job.request?.tokens_to_charge ?? 0);

      const { error: assetError } = await supabaseAdmin.from("generated_assets").upsert(
        {
          generation_job_id: job.id,
          user_id: job.user_id,
          project_id: job.project_id,
          asset_type: "video",
          provider: job.provider,
          storage_url: null,
          storage_path: storagePath,
          generation_status: "completed",
          tokens_consumed: tokensToCharge,
          meta_parameters: job.request ?? {},
        },
        { onConflict: "generation_job_id" },
      );
      if (assetError) throw new Error(`Failed to record generated asset: ${assetError.message}`);

      if (tokensToCharge > 0) {
        const { error: ledgerError } = await supabaseAdmin.from("token_ledgers").upsert(
          {
            user_id: job.user_id,
            amount: -tokensToCharge,
            transaction_type: "video_generation",
            entry_type: "consumption",
            reference: job.id,
            description: `Video generation: ${job.model}`,
          },
          { onConflict: "reference,transaction_type", ignoreDuplicates: true },
        );
        if (ledgerError) throw new Error(`Failed to deduct generation tokens: ${ledgerError.message}`);
      }

      await supabaseAdmin
        .from("generation_jobs")
        .update({ status: "completed", progress: 100 })
        .eq("id", job.id);

      return jsonResponse({ status: "ok" });
    } catch (error) {
      console.error("Generation completion failed:", error);
      return jsonResponse({ error: "Failed to finalize generation" }, 500);
    }
  }

  if (payload.status === "failed" || payload.status === "canceled") {
    await supabaseAdmin
      .from("generation_jobs")
      .update({ status: "failed", progress: 0 })
      .eq("id", jobId);

    await supabaseAdmin.from("generated_assets").upsert(
      {
        generation_job_id: job.id,
        user_id: job.user_id,
        project_id: job.project_id,
        asset_type: "video",
        provider: job.provider,
        storage_url: null,
        storage_path: null,
        generation_status: "failed",
        tokens_consumed: 0,
        meta_parameters: job.request ?? {},
        error_message: payload.error ?? "Generation failed",
      },
      { onConflict: "generation_job_id" },
    );

    return jsonResponse({ status: "ok" });
  }

  return jsonResponse({ status: "ignored" });
});
