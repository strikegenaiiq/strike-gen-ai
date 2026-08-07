import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/auth/AuthContext";
import { supabase } from "@/lib/supabase";
import { AppShell } from "./AppShell";

interface VideoModel {
  model_id: string;
  display_name: string;
  provider: string;
  pricing_params: {
    costPerSecond: Record<string, number>;
    defaultResolution: string;
    minDurationSeconds: number;
    maxDurationSeconds: number;
  };
}

interface GenerationJob {
  id: string;
  model: string;
  status: string;
  progress: number;
  request: { prompt?: string };
  created_at: string;
}

interface GeneratedAsset {
  id: string;
  storage_url: string | null;
  generation_status: string;
  error_message: string | null;
  created_at: string;
}

export function GeneratePage() {
  const { session } = useAuth();
  const [models, setModels] = useState<VideoModel[]>([]);
  const [selectedModelId, setSelectedModelId] = useState("");
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState(5);
  const [resolution, setResolution] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<GenerationJob[]>([]);
  const [assets, setAssets] = useState<GeneratedAsset[]>([]);

  useEffect(() => {
    const loadModels = async () => {
      if (!session) return;

      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("plan_id")
        .eq("user_id", session.user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!subscription?.plan_id) {
        setModels([]);
        setSelectedModelId("");
        return;
      }

      const { data: entitlements } = await supabase
        .from("subscription_model_entitlements")
        .select("model_id")
        .eq("plan_id", subscription.plan_id)
        .eq("enabled", true);

      const entitledIds = (entitlements ?? []).map((item) => item.model_id);
      if (entitledIds.length === 0) {
        setModels([]);
        setSelectedModelId("");
        return;
      }

      const { data } = await supabase
        .from("ai_models")
        .select("model_id, display_name, provider, pricing_params")
        .eq("model_type", "video")
        .eq("active", true)
        .in("model_id", entitledIds);

      const availableModels = (data ?? []) as VideoModel[];
      setModels(availableModels);

      const firstModel = availableModels[0];
      if (firstModel) {
        setSelectedModelId(firstModel.model_id);
        setDuration(firstModel.pricing_params.minDurationSeconds);
        setResolution(firstModel.pricing_params.defaultResolution);
      }
    };

    void loadModels();
  }, [session]);

  const refreshJobsAndAssets = async () => {
    const [{ data: jobData }, { data: assetData }] = await Promise.all([
      supabase
        .from("generation_jobs")
        .select("id, model, status, progress, request, created_at")
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("generated_assets")
        .select("id, storage_url, generation_status, error_message, created_at")
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    if (jobData) setJobs(jobData as GenerationJob[]);
    if (assetData) setAssets(assetData as GeneratedAsset[]);
  };

  useEffect(() => {
    void refreshJobsAndAssets();
    const interval = setInterval(() => void refreshJobsAndAssets(), 5000);
    return () => clearInterval(interval);
  }, []);

  const selectedModel = models.find((m) => m.model_id === selectedModelId);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!session || !selectedModelId || !prompt.trim()) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-video`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            modelId: selectedModelId,
            prompt: prompt.trim(),
            durationSeconds: duration,
            resolution,
          }),
        }
      );

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
    <AppShell title="Generate Video">
      <div className="max-w-2xl mx-auto space-y-8">
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Model</label>
            <select
              value={selectedModelId}
              onChange={(e) => {
                const model = models.find((m) => m.model_id === e.target.value);
                setSelectedModelId(e.target.value);
                if (model) {
                  setDuration(model.pricing_params.minDurationSeconds);
                  setResolution(model.pricing_params.defaultResolution);
                }
              }}
              className="w-full border rounded-md px-3 py-2"
              disabled={models.length === 0}
            >
              {models.map((m) => (
                <option key={m.model_id} value={m.model_id}>{m.display_name}</option>
              ))}
            </select>
            {models.length === 0 && (
              <p className="mt-1 text-sm text-ink-500">An active subscription with available video models is required.</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Prompt</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              className="w-full border rounded-md px-3 py-2"
              placeholder="Describe the video you want to generate..."
              required
            />
          </div>

          {selectedModel && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Duration (seconds): {duration}</label>
                <input
                  type="range"
                  min={selectedModel.pricing_params.minDurationSeconds}
                  max={selectedModel.pricing_params.maxDurationSeconds}
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Resolution</label>
                <select value={resolution} onChange={(e) => setResolution(e.target.value)} className="w-full border rounded-md px-3 py-2">
                  {Object.keys(selectedModel.pricing_params.costPerSecond).map((res) => (
                    <option key={res} value={res}>{res}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {submitError && <p className="text-sm text-red-600">{submitError}</p>}

          <button
            type="submit"
            disabled={submitting || !selectedModelId || !prompt.trim()}
            className="w-full bg-black text-white rounded-md py-2 disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Generate"}
          </button>
        </form>

        <section>
          <h2 className="text-lg font-medium mb-3">Recent Jobs</h2>
          <ul className="space-y-2">
            {jobs.map((job) => (
              <li key={job.id} className="border rounded-md p-3 text-sm">
                <div className="flex justify-between">
                  <span>{job.model}</span>
                  <span className="capitalize">{job.status}</span>
                </div>
                <p className="text-gray-500 truncate">{job.request?.prompt}</p>
              </li>
            ))}
            {jobs.length === 0 && <p className="text-sm text-gray-500">No jobs yet.</p>}
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-medium mb-3">Results</h2>
          <div className="grid grid-cols-2 gap-3">
            {assets.map((asset) => (
              <div key={asset.id} className="border rounded-md p-2">
                {asset.generation_status === "completed" && asset.storage_url ? (
                  <video src={asset.storage_url} controls className="w-full rounded" />
                ) : asset.generation_status === "failed" ? (
                  <p className="text-sm text-red-600">{asset.error_message ?? "Failed"}</p>
                ) : (
                  <p className="text-sm text-gray-500">Processing...</p>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
