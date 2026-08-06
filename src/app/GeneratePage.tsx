import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useAuth } from "@/auth/AuthContext";
import { supabase } from "@/lib/supabase";
import { AppShell } from "./AppShell";

const STORAGE_BUCKET = "generated-videos";

const SCOPE_DEFS = [
  { id: "standard", label: "Standard", modelId: "wan-2.2-5b-fast", description: "Fast, economical creation", enabled: true },
  { id: "premium", label: "Premium", modelId: "wan-2.1-t2v-720p", description: "Higher-quality generation", enabled: true },
  { id: "ultra", label: "Ultra", modelId: null, description: "Best available quality", enabled: false },
  { id: "pro", label: "Pro Creator", modelId: null, description: "Built for frequent production", enabled: false },
] as const;

type PricingParams = {
  minDurationSeconds: number;
  maxDurationSeconds: number;
  defaultResolution: string;
  costPerSecond?: Record<string, number>;
  costPerVideo?: Record<string, number>;
};

type Model = {
  model_id: string;
  display_name: string;
  provider: string;
  pricing_unit: string;
  pricing_params: PricingParams;
};

type Job = {
  id: string;
  model: string;
  status: string;
  progress: number | null;
  request: { prompt?: string } | null;
  created_at: string;
};

type Asset = {
  id: string;
  storage_bucket: string | null;
  storage_path: string | null;
  generation_status: string;
  error_message: string | null;
  created_at: string;
  signedUrl?: string;
};

export function GeneratePage() {
  const { session } = useAuth();
  const [models, setModels] = useState<Model[]>([]);
  const [scopeId, setScopeId] = useState("standard");
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState(5);
  const [resolution, setResolution] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  const selectedScope = SCOPE_DEFS.find((scope) => scope.id === scopeId) ?? SCOPE_DEFS[0];
  const selectedModel = models.find((model) => model.model_id === selectedScope.modelId);

  useEffect(() => {
    supabase
      .from("ai_models")
      .select("model_id, display_name, provider, pricing_unit, pricing_params")
      .eq("model_type", "video")
      .eq("active", true)
      .then(({ data }) => {
        if (!data) return;
        setModels(data as Model[]);
        const standardModel = (data as Model[]).find((model) => model.model_id === "wan-2.2-5b-fast");
        if (standardModel) {
          setDuration(standardModel.pricing_params.minDurationSeconds);
          setResolution(standardModel.pricing_params.defaultResolution);
        }
      });
  }, []);

  const refreshJobsAndAssets = async () => {
    setLoading(true);
    const [{ data: jobData }, { data: assetData }] = await Promise.all([
      supabase
        .from("generation_jobs")
        .select("id, model, status, progress, request, created_at")
        .order("created_at", { ascending: false })
        .limit(6),
      supabase
        .from("generated_assets")
        .select("id, storage_bucket, storage_path, generation_status, error_message, created_at")
        .order("created_at", { ascending: false })
        .limit(6),
    ]);

    if (jobData) setJobs(jobData as Job[]);
    if (assetData) {
      const nextAssets = assetData as Asset[];
      const signedAssets = await Promise.all(
        nextAssets.map(async (asset) => {
          if (asset.generation_status !== "completed" || !asset.storage_path) return asset;
          const bucket = asset.storage_bucket ?? STORAGE_BUCKET;
          const { data } = await supabase.storage.from(bucket).createSignedUrl(asset.storage_path, 60 * 60);
          return data?.signedUrl ? { ...asset, signedUrl: data.signedUrl } : asset;
        }),
      );
      setAssets(signedAssets);
    }
    setLoading(false);
  };

  useEffect(() => {
    refreshJobsAndAssets();
    const interval = setInterval(refreshJobsAndAssets, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!selectedModel) return;
    setDuration(selectedModel.pricing_params.minDurationSeconds);
    setResolution(selectedModel.pricing_params.defaultResolution);
  }, [selectedScope.modelId]);

  const supportedResolutions = useMemo(
    () => Object.keys(selectedModel?.pricing_params.costPerVideo ?? selectedModel?.pricing_params.costPerSecond ?? {}),
    [selectedModel],
  );

  const canSubmit = Boolean(session && selectedModel && prompt.trim() && !submitting);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSubmit || !selectedScope.modelId) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-video`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          modelId: selectedScope.modelId,
          scope: selectedScope.id,
          prompt: prompt.trim(),
          durationSeconds: duration,
          resolution,
          aspectRatio: "16:9",
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error ?? "Generation failed");
      setPrompt("");
      await refreshJobsAndAssets();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell title="Strike Studio">
      <div className="space-y-6">
        <section className="overflow-hidden rounded-3xl border border-ink-200 bg-white shadow-sm">
          <div className="bg-gradient-to-br from-ink-950 via-ink-900 to-brand-950 px-5 py-7 text-white sm:px-8 sm:py-9">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/60">Strike Studio</p>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Turn an idea into a video.</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/70">Simple controls for creators. The backend handles the model, economics, and generation rules.</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-5 p-5 sm:p-8">
            <div>
              <label className="mb-2 block text-sm font-semibold text-ink-900">What do you want to create?</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value.slice(0, 4000))}
                rows={4}
                className="w-full resize-none rounded-2xl border border-ink-200 bg-ink-50 px-4 py-3 text-sm text-ink-900 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-100"
                placeholder="A cinematic aerial shot of Lagos at golden hour, smooth camera movement..."
                required
              />
              <div className="mt-2 flex justify-between text-xs text-ink-500">
                <span>Describe subject, motion, camera and mood.</span>
                <span>{prompt.length}/4000</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {SCOPE_DEFS.map((scope) => (
                <button
                  key={scope.id}
                  type="button"
                  disabled={!scope.enabled}
                  onClick={() => scope.enabled && setScopeId(scope.id)}
                  className={`rounded-2xl border p-3 text-left transition ${scopeId === scope.id ? "border-brand-500 bg-brand-50 ring-2 ring-brand-100" : "border-ink-200 bg-white hover:border-ink-300"} ${!scope.enabled ? "cursor-not-allowed opacity-50" : ""}`}
                >
                  <span className="flex items-center justify-between gap-2 text-sm font-semibold text-ink-900">
                    {scope.label}
                    {!scope.enabled && <span className="text-[10px] uppercase tracking-wider text-ink-400">Soon</span>}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-ink-500">{scope.description}</span>
                </button>
              ))}
            </div>

            {selectedModel && (
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="rounded-2xl border border-ink-200 p-4">
                  <span className="block text-xs font-medium text-ink-500">Duration</span>
                  <div className="mt-2 flex items-center gap-3">
                    <input type="range" min={selectedModel.pricing_params.minDurationSeconds} max={selectedModel.pricing_params.maxDurationSeconds} value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="w-full accent-brand-600" />
                    <span className="w-12 text-right text-sm font-semibold text-ink-900">{duration}s</span>
                  </div>
                </label>
                <label className="rounded-2xl border border-ink-200 p-4">
                  <span className="block text-xs font-medium text-ink-500">Format quality</span>
                  <select value={resolution} onChange={(e) => setResolution(e.target.value)} className="mt-2 w-full bg-transparent text-sm font-semibold text-ink-900 outline-none">
                    {supportedResolutions.map((res) => <option key={res} value={res}>{res}</option>)}
                  </select>
                </label>
              </div>
            )}

            {submitError && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{submitError}</p>}

            <button type="submit" disabled={!canSubmit} className="w-full rounded-2xl bg-ink-950 px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-ink-800 disabled:cursor-not-allowed disabled:opacity-40">
              {submitting ? "Creating your video…" : `Generate with ${selectedScope.label}`}
            </button>
          </form>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-3xl border border-ink-200 bg-white p-5 shadow-sm sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">Queue</p>
            <div className="mb-4 flex items-center justify-between"><h2 className="mt-1 text-lg font-semibold text-ink-900">Recent generations</h2><span className="rounded-full bg-ink-100 px-2.5 py-1 text-xs font-medium text-ink-600">{jobs.length}</span></div>
            <div className="space-y-2">
              {jobs.map((job) => (
                <div key={job.id} className="rounded-2xl border border-ink-100 bg-ink-50/70 p-3">
                  <div className="flex items-center justify-between gap-3 text-xs"><span className="font-semibold text-ink-800">{job.model}</span><span className="rounded-full bg-white px-2 py-1 capitalize text-ink-600">{job.status}</span></div>
                  <p className="mt-2 truncate text-xs text-ink-500">{job.request?.prompt ?? "Generation in progress"}</p>
                  {job.status !== "completed" && job.status !== "failed" && <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink-200"><div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${Math.min(job.progress ?? 0, 100)}%` }} /></div>}
                </div>
              ))}
              {!loading && jobs.length === 0 && <p className="py-8 text-center text-sm text-ink-500">Your next creation starts here.</p>}
            </div>
          </div>

          <div className="rounded-3xl border border-ink-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-4 flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-wider text-ink-400">Library</p><h2 className="mt-1 text-lg font-semibold text-ink-900">Your latest videos</h2></div><span className="text-xs text-ink-400">Private</span></div>
            <div className="grid grid-cols-2 gap-3">
              {assets.map((asset) => <div key={asset.id} className="overflow-hidden rounded-2xl border border-ink-100 bg-ink-50">{asset.signedUrl ? <video src={asset.signedUrl} controls preload="metadata" className="aspect-video w-full bg-black object-cover" /> : asset.generation_status === "failed" ? <div className="flex aspect-video items-center justify-center p-4 text-center text-xs text-red-600">{asset.error_message ?? "Generation failed"}</div> : <div className="flex aspect-video items-center justify-center text-xs text-ink-500">Processing…</div>}</div>)}
            </div>
            {!loading && assets.length === 0 && <div className="rounded-2xl border border-dashed border-ink-200 py-12 text-center"><p className="text-sm font-medium text-ink-700">No videos yet</p><p className="mt-1 text-xs text-ink-400">Your finished creations will appear here.</p></div>}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
