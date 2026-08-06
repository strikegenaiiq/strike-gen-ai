import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const REPLICATE_API_TOKEN = Deno.env.get("REPLICATE_API_TOKEN");
const BACKEND_BASE_URL = Deno.env.get("BACKEND_BASE_URL");
const FRONTEND_BASE_URL = Deno.env.get("FRONTEND_BASE_URL");

for (const [name, val] of Object.entries({ SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, REPLICATE_API_TOKEN, BACKEND_BASE_URL, FRONTEND_BASE_URL })) {
  if (!val) throw new Error(`${name} is required`);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const corsHeaders = {
  "Access-Control-Allow-Origin": FRONTEND_BASE_URL,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...corsHeaders } });
}

const GENERATION_SCOPES: Record<string, string> = {
  standard: "wan-2.2-5b-fast",
  premium: "wan-2.1-t2v-720p",
};

const REPLICATE_MODELS: Record<string, string> = {
  "wan-2.1-t2v-720p": "wavespeedai/wan-2.1-t2v-720p",
  "wan-2.2-5b-fast": "wan-video/wan-2.2-5b-fast",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });

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

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const scope = typeof body.scope === "string" ? body.scope : "";
  const modelId = GENERATION_SCOPES[scope];
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  const requestedDuration = typeof body.durationSeconds === "number" ? body.durationSeconds : undefined;
  const requestedResolution = typeof body.resolution === "string" ? body.resolution : undefined;
  const requestedAspectRatio = typeof body.aspectRatio === "string" ? body.aspectRatio : undefined;
  const requestedSeed = Number.isInteger(body.seed) ? body.seed as number : undefined;

  if (!scope || !modelId) return jsonResponse({ error: "Unsupported generation scope" }, 400);
  if (!prompt) return jsonResponse({ error: "prompt is required" }, 400);
  if (prompt.length > 4000) return jsonResponse({ error: "Prompt is too long" }, 400);

  const replicateModel = REPLICATE_MODELS[modelId];
  if (!replicateModel) return jsonResponse({ error: "Generation scope is not wired to a provider" }, 400);

  try {
    const { data: model, error: modelError } = await supabaseAdmin
      .from("ai_models")
      .select("model_type, active, pricing_unit, pricing_params, provider")
      .eq("model_id", modelId)
      .single();
    if (modelError || !model || !model.active || model.model_type !== "video") {
      return jsonResponse({ error: "Generation model is unavailable" }, 404);
    }

    const pricingParams = model.pricing_params ?? {};
    const minDuration = Number(pricingParams.minDurationSeconds ?? 5);
    const maxDuration = Number(pricingParams.maxDurationSeconds ?? minDuration);
    const finalDuration = requestedDuration ?? minDuration;
    const finalResolution = requestedResolution ?? pricingParams.defaultResolution;

    if (!Number.isFinite(finalDuration) || finalDuration < minDuration || finalDuration > maxDuration) {
      return jsonResponse({ error: `Duration must be between ${minDuration} and ${maxDuration} seconds` }, 400);
    }

    const supportedResolutions = pricingParams.costPerVideo
      ? Object.keys(pricingParams.costPerVideo)
      : Object.keys(pricingParams.costPerSecond ?? {});
    if (!finalResolution || !supportedResolutions.includes(finalResolution)) {
      return jsonResponse({ error: "Unsupported resolution for selected scope" }, 400);
    }

    const { data: costData, error: costError } = await supabaseAdmin.rpc("calculate_generation_cost", {
      p_model_id: modelId,
      p_duration_seconds: finalDuration,
      p_resolution: finalResolution,
    });
    if (costError || !costData?.[0]) throw new Error(`Cost calculation failed: ${costError?.message}`);
    const tokensToCharge = costData[0].tokens_to_charge;

    const { data: balance, error: balanceError } = await supabaseAdmin.rpc("get_user_balance", { p_user_id: userId });
    if (balanceError) throw new Error(`Balance check failed: ${balanceError.message}`);
    if ((balance ?? 0) < tokensToCharge) {
      return jsonResponse({ error: "Insufficient token balance", required: tokensToCharge, available: balance }, 402);
    }

    let { data: existingProject } = await supabaseAdmin.from("projects").select("id").eq("user_id", userId).eq("status", "active").limit(1).maybeSingle();
    let projectId = existingProject?.id;
    if (!projectId) {
      const { data: newProject, error: projectError } = await supabaseAdmin.from("projects").insert({ user_id: userId, name: "My Videos", project_type: "video" }).select("id").single();
      if (projectError) throw new Error(`Failed to create default project: ${projectError.message}`);
      projectId = newProject.id;
    }

    const framesPerSecond = Number(pricingParams.framesPerSecond ?? 16);
    const minFrames = Number(pricingParams.minFrames ?? 81);
    const maxFrames = Number(pricingParams.maxFrames ?? 121);
    const numFrames = Math.min(maxFrames, Math.max(minFrames, Math.round(finalDuration * framesPerSecond)));
    const aspectRatio = requestedAspectRatio ?? pricingParams.defaultAspectRatio ?? "16:9";

    const providerInput = modelId === "wan-2.2-5b-fast"
      ? {
          prompt,
          num_frames: numFrames,
          resolution: finalResolution,
          aspect_ratio: aspectRatio,
          frames_per_second: framesPerSecond,
          go_fast: true,
          ...(requestedSeed !== undefined ? { seed: requestedSeed } : {}),
        }
      : {
          prompt,
          num_frames: numFrames,
          aspect_ratio: aspectRatio,
          frames_per_second: framesPerSecond,
          fast_mode: "Balanced",
          sample_steps: 30,
          sample_guide_scale: 5,
          sample_shift: 5,
          ...(requestedSeed !== undefined ? { seed: requestedSeed } : {}),
        };

    const { data: job, error: jobError } = await supabaseAdmin.from("generation_jobs").insert({
      user_id: userId,
      project_id: projectId,
      provider: model.provider,
      model: modelId,
      request: { scope, prompt, duration_seconds: finalDuration, resolution: finalResolution, aspect_ratio: aspectRatio, tokens_to_charge: tokensToCharge, provider_input: providerInput },
      status: "queued",
      progress: 0,
    }).select("id, request").single();
    if (jobError) throw new Error(`Failed to create generation job: ${jobError.message}`);

    const resp = await fetch(`https://api.replicate.com/v1/models/${replicateModel}/predictions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${REPLICATE_API_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ input: providerInput, webhook: `${BACKEND_BASE_URL}/functions/v1/generation-webhook?job_id=${job.id}`, webhook_events_filter: ["completed"] }),
    });
    const replicateData = await resp.json();
    if (!resp.ok) throw new Error(`Replicate submit failed: ${JSON.stringify(replicateData)}`);

    await supabaseAdmin.from("generation_jobs").update({
      status: "processing",
      request: { ...job.request, provider_job_id: replicateData.id, replicate_model: replicateModel },
    }).eq("id", job.id);

    return jsonResponse({ jobId: job.id, status: "processing", scope, tokensToCharge });
  } catch (err) {
    console.error("Generation submission failed:", err);
    return jsonResponse({ error: "Generation submission failed" }, 500);
  }
});
