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

  if (payload.status === "succeeded") {
    const outputUrl = Array.isArray(payload.output) ? payload.output[0] : payload.output;
    if (!outputUrl || typeof outputUrl !== "string") {
      return jsonResponse({ error: "Missing generation output" }, 400);
    }

    const { data, error } = await supabaseAdmin.rpc("finalize_generation_job", {
      p_job_id: jobId,
      p_status: "completed",
      p_output_url: outputUrl,
      p_error_message: null,
    });

    if (error) {
      console.error("Failed to finalize generation job:", error.message);
      return jsonResponse({ error: "Failed to finalize generation" }, 500);
    }

    return jsonResponse(data);
  }

  if (payload.status === "failed" || payload.status === "canceled") {
    const { data, error } = await supabaseAdmin.rpc("finalize_generation_job", {
      p_job_id: jobId,
      p_status: "failed",
      p_output_url: null,
      p_error_message: typeof payload.error === "string" ? payload.error : "Generation failed",
    });

    if (error) {
      console.error("Failed to finalize failed generation job:", error.message);
      return jsonResponse({ error: "Failed to finalize generation" }, 500);
    }

    return jsonResponse(data);
  }

  return jsonResponse({ status: "ignored" });
});
