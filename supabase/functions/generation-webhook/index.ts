import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL) throw new Error("SUPABASE_URL is required");
if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required");

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const url = new URL(req.url);
  const jobId = url.searchParams.get("job_id");
  if (!jobId) return jsonResponse({ error: "Missing job_id" }, 400);

  let payload;
  try {
    payload = await req.json();
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
