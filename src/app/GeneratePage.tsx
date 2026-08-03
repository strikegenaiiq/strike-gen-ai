import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/auth/AuthContext";
import { supabase } from "@/lib/supabase";
import { AppShell } from "./AppShell";

const ENABLED_MODEL_IDS = ["wan-2.1-t2v-720p"];

export function GeneratePage() {
  const { session } = useAuth();
  const [models, setModels] = useState([]);
  const [selectedModelId, setSelectedModelId] = useState("");
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState(5);
  const [resolution, setResolution] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [assets, setAssets] = useState([]);

  useEffect(() => {
    supabase
      .from("ai_models")
      .select("model_id, display_name, provider, pricing_params")
      .eq("model_type", "video")
      .eq("active", true)
      .then(({ data }) => {
        if (data) {
          setModels(data);
          const firstEnabled = data.find((m) => ENABLED_MODEL_IDS.includes(m.model_id));
          if (firstEnabled) {
            setSelectedModelId(firstEnabled.model_id);
            setDuration(firstEnabled.pricing_params.minDurationSeconds);
            setResolution(firstEnabled.pricing_params.defaultResolution);
          }
        }
      });
  }, []);

  const refreshJobsAndAssets = async () => {
    const [{ data: jobData }, { data: assetData }] = await Promise.all([
      supabase.from("generation_jobs").select("id, model, status, progress, request, created_at").order("created_at", { ascending: false }).limit(10),
      supabase.from("generated_assets").select("id, storage_url, generation_status, error_message, created_at").order("created_at", { ascending: false }).limit(10),
    ]);
    if (jobData) setJobs(jobData);
    if (assetData) setAssets(assetData);
  };

  useEffect(() => {
    refreshJobsAndAssets();
    const interval = setInterval(refreshJobsAndAssets, 5000);
    return () => clearInterval(interval);
  }, []);

  const selectedModel = models.find((m) => m.model_id === selectedModelId);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!session || !selectedModelId || !prompt.trim()) return;

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
          modelId: selectedModelId,
          prompt: prompt.trim(),
          durationSeconds: duration,
          resolution,
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
    <AppShell>
      <div className="max-w-2xl mx-auto p-6 space-y-8">
        <h1 className="text-2xl font-semibold">Generate Video</h1>

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
            >
              {models.map((m) => (
                <option key={m.model_id} value={m.model_id} disabled={!ENABLED_MODEL_IDS.includes(m.model_id)}>
                  {m.display_name} {!ENABLED_MODEL_IDS.includes(m.model_id) ? "(coming soon)" : ""}
                </option>
              ))}
            </select>
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

          <button type="submit" disabled={submitting || !selectedModelId || !prompt.trim()} className="w-full bg-black text-white rounded-md py-2 disabled:opacity-50">
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
