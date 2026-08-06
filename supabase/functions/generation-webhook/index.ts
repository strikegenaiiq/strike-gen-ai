import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const REPLICATE_WEBHOOK_SECRET = Deno.env.get("REPLICATE_WEBHOOK_SECRET");

if (!SUPABASE_URL) throw new Error("SUPABASE_URL is required");
if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required");
if (!REPLICATE_WEBHOOK_SECRET) throw new Error("REPLICATE_WEBHOOK_SECRET is required");

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const STORAGE_BUCKET = "generated-videos";
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

  const secret = REPLICATE_WEBHOOK_SECRET.startsWith("whsec_") ? REPLICATE_WEBHOOK_SECRET.slice("whsec_".length) : REPLICATE_WEBHOOK_SECRET;
  let secretBytes: Uint8Array;
  try { secretBytes = base64ToBytes(secret); } catch { return false; }

  const key = await crypto.subtle.importKey("raw", secretBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signedContent = `${webhookId}.${webhookTimestamp}.${body}`;
  const expected = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedContent)));

  return webhookSignature.split(" ").some((signature) => {
    const [version, encodedSignature] = signature.split(",", 2);
    if (version !== "v1" || !encodedSignature) return false;
    try { return constantTimeEqual(expected, base64ToBytes(encodedSignature)); } catch { return false; }
  });
}

async function persistVideo(jobId: string, outputUrl: string) {
  const response = await fetch(outputUrl);
  if (!response.ok || !response.body) throw new Error(`Failed to download generated video (${response.status})`);

  const contentType = response.headers.get("content-type")?.split(";", 1)[0] ?? "video/mp4";
  if (contentType !== "video/mp4") throw new Error(`Unsupported generated video content type: ${contentType}`);

  const contentLength = response.headers.get("content-length");
  if (contentLength && Number(contentLength) > 50 * 1024 * 1024) throw new Error("Generated video exceeds the 50 MB storage limit");

  const storagePath = `generations/${jobId}.mp4`;
  const { error } = await supabaseAdmin.storage.from(STORAGE_BUCKET).upload(storagePath, response.body, {
    contentType: "video/mp4", cacheControl: "31536000", upsert: false,
  });
  if (error) {
    if (error.message.toLowerCase().includes("already exists")) return storagePath;
    throw error;
  }
  return storagePath;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const url = new URL(req.url);
  const jobId = url.searchParams.get("job_id");
  if (!jobId) return jsonResponse({ error: "Missing job_id" }, 400);

  const body = await req.text();
  if (!(await verifyReplicateWebhook(body, req))) return jsonResponse({ error: "Invalid webhook signature" }, 401);

  const webhookId = req.headers.get("webhook-id")!;
  let payload: Record<string, unknown>;
  try { payload = JSON.parse(body); } catch { return jsonResponse({ error: "Invalid JSON" }, 400); }

  const { error: eventError } = await supabaseAdmin.from("generation_webhook_events").insert({ webhook_id: webhookId });
  if (eventError) {
    if (eventError.code === "23505") return jsonResponse({ status: "already_processed" });
    console.error("Failed to record webhook event:", eventError.message);
    return jsonResponse({ error: "Webhook could not be recorded" }, 500);
  }

  if (payload.status === "succeeded") {
    const outputUrl = Array.isArray(payload.output) ? payload.output[0] : payload.output;
    if (!outputUrl || typeof outputUrl !== "string") return jsonResponse({ error: "Missing generation output" }, 400);

    try {
      const storagePath = await persistVideo(jobId, outputUrl);
      const { data, error } = await supabaseAdmin.rpc("finalize_generation_job", {
        p_job_id: jobId, p_status: "completed", p_output_url: null, p_error_message: null,
        p_storage_bucket: STORAGE_BUCKET, p_storage_path: storagePath,
      });
      if (error) throw error;
      return jsonResponse(data);
    } catch (error) {
      console.error("Failed to persist/finalize generated video:", error);
      return jsonResponse({ error: "Failed to persist generated video" }, 500);
    }
  }

  if (payload.status === "failed" || payload.status === "canceled") {
    const { data, error } = await supabaseAdmin.rpc("finalize_generation_job", {
      p_job_id: jobId, p_status: "failed", p_output_url: null,
      p_error_message: typeof payload.error === "string" ? payload.error : "Generation failed",
      p_storage_bucket: null, p_storage_path: null,
    });
    if (error) {
      console.error("Failed to finalize failed generation job:", error.message);
      return jsonResponse({ error: "Failed to finalize generation" }, 500);
    }
    return jsonResponse(data);
  }

  return jsonResponse({ status: "ignored" });
});
