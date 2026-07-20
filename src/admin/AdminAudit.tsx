import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { AdminAction } from "@/types/admin";

export function AdminAudit() {
  const [actions, setActions] = useState<AdminAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");

  const load = async () => {
    setLoading(true);
    let query = supabase
      .from("admin_actions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (filter !== "all") query = query.eq("severity", filter);

    const { data, error } = await query;
    if (error) {
      setError(error.message);
    } else {
      setActions((data ?? []) as AdminAction[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [filter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">Audit Log</h1>
        <p className="mt-1 text-sm text-ink-500">
          Every admin action is recorded here. Showing last {actions.length} actions.
        </p>
      </div>

      <div className="flex gap-2">
        {["all", "info", "warning", "critical"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
              filter === f
                ? "bg-brand-600 text-white"
                : "bg-white text-ink-600 hover:bg-ink-100"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink-200 border-t-brand-600" />
        </div>
      ) : actions.length === 0 ? (
        <div className="card p-8 text-center text-sm text-ink-400">
          No admin actions recorded yet.
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="divide-y divide-ink-100">
            {actions.map((action) => (
              <div key={action.id} className="px-5 py-4 hover:bg-ink-50/50">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${severityBadge(action.severity)}`}>
                        {action.severity}
                      </span>
                      <span className="text-sm font-medium text-ink-900">
                        {action.action_type.replace(/_/g, " ")}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-ink-600">{action.reason}</p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-400">
                      <span>Admin: <span className="font-mono">{action.admin_id.slice(0, 8)}…</span></span>
                      {action.target_user_id && (
                        <span>Target: <span className="font-mono">{action.target_user_id.slice(0, 8)}…</span></span>
                      )}
                      {action.target_table && <span>Table: {action.target_table}</span>}
                    </div>
                  </div>
                  <span className="shrink-0 text-xs text-ink-400">
                    {new Date(action.created_at).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function severityBadge(severity: string): string {
  switch (severity) {
    case "critical": return "bg-rose-100 text-rose-700";
    case "warning": return "bg-amber-100 text-amber-700";
    default: return "bg-ink-100 text-ink-600";
  }
}
