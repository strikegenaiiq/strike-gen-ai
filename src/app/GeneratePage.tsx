import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useAuth } from "@/auth/AuthContext";
import { supabase } from "@/lib/supabase";
import { estimateGenerationCost } from "@/lib/generationCost";
import { AppShell } from "./AppShell";

type Scope = "standard" | "premium";

type VideoModel = {
  model_id: string;
  display_name: string;
  provider: string;
  pricing_params: {
    defaultResolution: string;
    minDurationSeconds: number;
    maxDurationSeconds: number;
    costPerSecond?: Record<string, number>;
    costPerVideo?: Record<string, number>;
    strikeScope?: Scope;
  };
};

type GenerationJob = {
  id: string;
  model: string;
  status: string;
  progress: number | null;
  request: { prompt?: string } | null;
  created_at: string;
};

type GeneratedAsset = {
  id: string;
  storage_url: string | null;
  generation_status: string;
  error_message: string | null;
  created_at: string;
};

const SCOPE_META: Record<Scope, { label: string; description: string }> = {
  standard: { label: "Standard", description: "Fast, cost-conscious creation" },
  premium: { label: "Premium", description: "Higher-quality generation" },
};

function getScope(model: VideoModel): Scope | null {
  if (model.pricing_params.strikeScope === "standard" || model.pricing_params.strikeScope === "premium") {
    return model.pricing_params.strikeScope;
  }
  if (model.model_id === "wan-2.2-5b-fast") return "standard";
  if (model.model_id === "wan-2.1-t2v-720p") return "premium";
  return null;
}

export function GeneratePage() {
  const { session } = useAuth();
  const [models, setModels] = useState<VideoModel[]>([]);
  const [scope, setScope] = useState<Scope>("standard");
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState(5);
  const [resolution, setResolution] = useState("720p");
  const [estimatedCredits, setEstimatedCredits] = useState<number | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<GenerationJob[]>([]);
  const [assets, setAssets] = useState<GeneratedAsset[]>([]);

  const scopedModels = useMemo(() => {
    const result = new Map<Scope, VideoModel>();
    for (const model of models) {
      const modelScope = getScope(model);
      if (modelScope && !result.has(modelScope)) result.set(modelScope, model);
    }
    return result;
  }, [models]);

  const selectedModel = scopedModels.get(scope) ?? scopedModels.get("standard");

  const refreshBalance = async () => {
    if (!session) return;
    const { data, error } = await supabase.from("token_ledgers").select("amount");
    if (!error && data) {
      setBalance(data.reduce((total, row) => total + Number(row.amount || 0), 0));
    }
  };

  const refreshJobsAndAssets = async () => {
    const [{ data: jobData }, { data: assetData }] = await Promise.all([
      supabase
        .from("generation_jobs")
        .select("id, model, status, progress, request, created_at")
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("generated_assets")
        .select("id, storage_url, generation_status, error_message, created_at")
        .order("created_at", { ascending: false })
        .limit(8),
    ]);
    if (jobData) setJobs(jobData as GenerationJob[]);
    if (assetData) setAssets(assetData as GeneratedAsset[]);
  };

  useEffect(() => {
    if (!session) return;
    supabase
      .from("ai_models")
      .select("model_id, display_name, provider, pricing_params")
      .eq("model_type", "video")
      .eq("active", true)
      .then(({ data }) => {
        if (data) setModels(data as VideoModel[]);
      });
    refreshBalance();
    refreshJobsAndAssets();
    const interval = setInterval(() => {
      refreshBalance();
      refreshJobsAndAssets();
    }, 5000);
    return () => clearInterval(interval);
  }, [session]);

  useEffect(() => {
    if (!selectedModel) return;
    const min = selectedModel.pricing_params.minDurationSeconds;
    const max = selectedModel.pricing_params.maxDurationSeconds;
    setDuration((current) => Math.min(Math.max(current, min), max));
    setResolution(selectedModel.pricing_params.defaultResolution);
  }, [selectedModel?.model_id]);

  useEffect(() => {
    if (!selectedModel) {
      setEstimatedCredits(null);
      return;
    }
    let cancelled = false;
    estimateGenerationCost({
      modelId: selectedModel.model_id,
      durationSeconds: duration,
      resolution,
    })
      .then((tokens) => {
        if (!cancelled) setEstimatedCredits(tokens);
      })
      .catch(() => {
        if (!cancelled) setEstimatedCredits(null);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedModel?.model_id, duration, resolution]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!session || !selectedModel || !prompt.trim()) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-video`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          modelId: selectedModel.model_id,
          prompt: prompt.trim(),
          durationSeconds: duration,
          resolution,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Generation failed. Please try again.");

      setPrompt("");
      await Promise.all([refreshBalance(), refreshJobsAndAssets()]);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell title="Turn an idea into a video">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_330px]">
        <section>
          <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-white/[0.09] via-white/[0.04] to-transparent p-5 shadow-2xl shadow-black/30 sm:p-7">
            <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-white/[0.07] blur-3xl" />
            <div className="relative">
              <div className="mb-6 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-white/45">Describe it. Strike creates it.</p>
                </div>
                <div className="rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-xs text-white/65">
                  {balance === null ? "— credits" : `${balance.toLocaleString()} credits`}
                </div>
              </div>

              <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
                {(Object.keys(SCOPE_META) as Scope[]).map((item) => {
                  const available = Boolean(scopedModels.get(item));
                  return (
                    <button
                      key={item}
                      type="button"
                      disabled={!available}
                      onClick={() => setScope(item)}
                      className={`min-w-[132px] rounded-2xl border px-4 py-3 text-left transition ${
                        scope === item && available
                          ? "border-white/30 bg-white text-black"
                          : "border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-35"
                      }`}
                    >
                      <div className="text-sm font-semibold">{SCOPE_META[item].label}</div>
                      <div className={`mt-1 text-[11px] ${scope === item && available ? "text-black/55" : "text-white/35"}`}>
                        {available ? SCOPE_META[item].description : "Coming soon"}
                      </div>
                    </button>
                  );
                })}
              </div>

              <form onSubmit={onSubmit}>
                <div className="rounded-3xl border border-white/10 bg-black/30 p-4 transition focus-within:border-white/25 sm:p-5">
                  <textarea
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                    rows={7}
                    maxLength={2000}
                    className="w-full resize-none bg-transparent text-base leading-7 text-white outline-none placeholder:text-white/25"
                    placeholder="A cinematic night drive through Lagos, neon reflections on wet streets, smooth camera movement..."
                    required
                  />
                  <div className="mt-3 flex items-center justify-between text-[11px] text-white/30">
                    <span>{prompt.length}/2000</span>
                    <span>Keep prompts clear and visual</span>
                  </div>
                </div>

                {selectedModel && (
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <label className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                      <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">Duration</span>
                      <span className="mt-1 block text-sm font-semibold">{duration}s</span>
                      <input
                        type="range"
                        min={selectedModel.pricing_params.minDurationSeconds}
                        max={selectedModel.pricing_params.maxDurationSeconds}
                        value={duration}
                        onChange={(event) => setDuration(Number(event.target.value))}
                        className="mt-4 w-full accent-white"
                      />
                    </label>

                    <label className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                      <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">Resolution</span>
                      <select
                        value={resolution}
                        onChange={(event) => setResolution(event.target.value)}
                        className="mt-2 w-full bg-transparent text-sm font-semibold outline-none"
                      >
                        {Object.keys(selectedModel.pricing_params.costPerSecond ?? selectedModel.pricing_params.costPerVideo ?? {}).map((item) => (
                          <option key={item} value={item} className="bg-[#111214]">{item}</option>
                        ))}
                      </select>
                    </label>

                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                      <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">Generation</span>
                      <span className="mt-1 block text-sm font-semibold">{estimatedCredits === null ? "Calculating…" : `${estimatedCredits} credits`}</span>
                      <span className="mt-2 block text-[11px] leading-5 text-white/35">Final charge is confirmed server-side.</span>
                    </div>
                  </div>
                )}

                {submitError && (
                  <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
                    {submitError}
                    {balance !== null && estimatedCredits !== null && balance < estimatedCredits && (
                      <button type="button" onClick={() => window.location.assign("/app/pricing")} className="ml-2 font-semibold underline underline-offset-4">
                        Get credits
                      </button>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting || !selectedModel || !prompt.trim() || estimatedCredits === null}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-4 text-sm font-bold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <span>{submitting ? "Creating your video…" : "Generate video"}</span>
                  {!submitting && estimatedCredits !== null && <span className="text-black/45">· {estimatedCredits} credits</span>}
                </button>
              </form>
            </div>
          </div>

          <section className="mt-8">
            <div className="mb-4 flex items-end justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30">Your studio</p>
                <h2 className="mt-1 text-lg font-semibold">Recent generations</h2>
              </div>
              <span className="text-xs text-white/30">Auto-refreshing</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {assets.map((asset) => (
                <div key={asset.id} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
                  {asset.generation_status === "completed" && asset.storage_url ? (
                    <video src={asset.storage_url} controls preload="metadata" className="aspect-video w-full bg-black object-cover" />
                  ) : (
                    <div className="flex aspect-video items-center justify-center bg-gradient-to-br from-white/[0.08] to-transparent p-5 text-center">
                      <div>
                        <div className="mx-auto mb-3 h-2 w-2 animate-pulse rounded-full bg-white" />
                        <p className={`text-sm ${asset.generation_status === "failed" ? "text-red-200" : "text-white/55"}`}>
                          {asset.generation_status === "failed" ? asset.error_message ?? "Generation failed" : "Creating your video…"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {assets.length === 0 && (
                <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-white/30 sm:col-span-2">
                  Your first creation will appear here.
                </div>
              )}
            </div>
          </section>
        </section>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30">Selected scope</p>
            <h2 className="mt-2 text-xl font-semibold">{SCOPE_META[scope].label}</h2>
            <p className="mt-2 text-sm leading-6 text-white/45">{SCOPE_META[scope].description}. Strike keeps provider details behind the scenes.</p>
            <div className="mt-5 space-y-3 border-t border-white/10 pt-4 text-sm">
              <div className="flex justify-between"><span className="text-white/40">Engine</span><span>{selectedModel?.display_name ?? "Loading…"}</span></div>
              <div className="flex justify-between"><span className="text-white/40">Output</span><span>{resolution}</span></div>
              <div className="flex justify-between"><span className="text-white/40">Charge</span><span>{estimatedCredits === null ? "—" : `${estimatedCredits} credits`}</span></div>
            </div>
          </div>

          <button onClick={() => window.location.assign("/app/pricing")} className="w-full rounded-3xl border border-white/10 bg-white/[0.04] p-5 text-left transition hover:bg-white/[0.07]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30">Need more?</p>
            <div className="mt-2 flex items-center justify-between">
              <span className="font-semibold">Get credits</span>
              <span className="text-white/40">→</span>
            </div>
            <p className="mt-2 text-xs leading-5 text-white/35">You can renew or buy more credits immediately—even if you used your current balance today.</p>
          </button>
        </aside>
      </div>

      <section className="mt-10 rounded-3xl border border-white/10 bg-white/[0.025] p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30">Activity</p>
            <h2 className="mt-1 text-base font-semibold">Generation queue</h2>
          </div>
          <span className="text-xs text-white/30">{jobs.length} recent</span>
        </div>
        <div className="space-y-2">
          {jobs.map((job) => (
            <div key={job.id} className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.025] px-4 py-3">
              <div className="h-2 w-2 shrink-0 rounded-full bg-white/50" />
              <p className="min-w-0 flex-1 truncate text-sm text-white/60">{job.request?.prompt ?? "Untitled generation"}</p>
              <span className="shrink-0 text-xs capitalize text-white/30">{job.status}</span>
              {job.progress !== null && <span className="hidden shrink-0 text-xs text-white/25 sm:block">{job.progress}%</span>}
            </div>
          ))}
          {jobs.length === 0 && <p className="py-4 text-center text-sm text-white/25">No generation activity yet.</p>}
        </div>
      </section>
    </AppShell>
  );
}
