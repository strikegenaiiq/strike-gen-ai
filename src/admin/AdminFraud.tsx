import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthContext";
import type { FlaggedEvent } from "@/types/admin";

export function AdminFraud() {
  const { user } = useAuth();
  const [events, setEvents] = useState<FlaggedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("open");
  const [resolveModal, setResolveModal] = useState<FlaggedEvent | null>(null);
  const [resolution, setResolution] = useState<"resolved" | "false_positive" | "reviewing">("resolved");
  const [note, setNote] = useState("");
  const [processing, setProcessing] = useState(false);

  const load = async () => {
    setLoading(true);
    let query = supabase
      .from("flagged_events")
      .select("*")
      .order("created_at", { ascending: false });

    if (filter === "open") query = query.in("status", ["open", "reviewing"]);
    else if (filter === "resolved") query = query.in("status", ["resolved", "false_positive"]);
    else query = query.eq("severity", filter);

    const { data, error } = await query;
    if (error) {
      setError(error.message);
    } else {
      setEvents((data ?? []) as FlaggedEvent[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [filter]);

  const resolve = async () => {
    if (!user || !resolveModal) return;
    setProcessing(true);
    const { error } = await supabase.rpc("admin_resolve_flagged_event", {
      p_admin_id: user.id,
      p_event_id: resolveModal.id,
      p_status: resolution,
      p_note: note || null,
    });
    if (error) {
      setError(error.message);
    } else {
      setResolveModal(null);
      setNote("");
      await load();
    }
    setProcessing(false);
  };

  const openCount = events.filter((e) => e.status === "open" || e.status === "reviewing").length;
  const criticalCount = events.filter((e) => e.severity === "critical").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">Fraud Alerts</h1>
        <p className="mt-1 text-sm text-ink-500">
          {openCount} open · {criticalCount} critical ·{" "}
          {events.length} total in view
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { v: "open", l: "Open" },
          { v: "critical", l: "Critical" },
          { v: "high", l: "High" },
          { v: "resolved", l: "Resolved" },
        ].map((f) => (
          <button
            key={f.v}
            onClick={() => setFilter(f.v)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === f.v
                ? "bg-brand-600 text-white"
                : "bg-white text-ink-600 hover:bg-ink-100"
            }`}
          >
            {f.l}
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
      ) : events.length === 0 ? (
        <div className="card p-8 text-center text-sm text-ink-400">
          No flagged events in this view. All clear.
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <div key={event.id} className="card p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${severityBadge(event.severity)}`}>
                      {event.severity}
                    </span>
                    <span className="text-sm font-semibold text-ink-900">
                      {event.event_type.replace(/_/g, " ")}
                    </span>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge(event.status)}`}>
                      {event.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-ink-600">{event.description}</p>
                  {event.amount_implicated && (
                    <p className="mt-1 text-xs text-ink-400">
                      Amount implicated: ${Number(event.amount_implicated).toFixed(2)}
                    </p>
                  )}
                  {event.resolution_note && (
                    <p className="mt-2 rounded-md bg-ink-50 px-3 py-2 text-xs text-ink-600">
                      Resolution: {event.resolution_note}
                    </p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-xs text-ink-400">
                    {new Date(event.created_at).toLocaleDateString()}
                  </div>
                  {(event.status === "open" || event.status === "reviewing") && (
                    <button
                      onClick={() => {
                        setResolveModal(event);
                        setResolution("resolved");
                        setNote("");
                      }}
                      className="mt-2 rounded-md bg-brand-600 px-3 py-1 text-xs font-medium text-white hover:bg-brand-700"
                    >
                      Resolve
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {resolveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/40 p-4 animate-fade-in">
          <div className="card w-full max-w-md p-6 animate-slide-up">
            <h3 className="text-lg font-semibold text-ink-900">Resolve flagged event</h3>
            <p className="mt-1 text-sm text-ink-500">{resolveModal.description}</p>
            <div className="mt-4">
              <label className="label">Resolution</label>
              <select
                className="input"
                value={resolution}
                onChange={(e) => setResolution(e.target.value as typeof resolution)}
              >
                <option value="resolved">Resolved (confirmed fraud, action taken)</option>
                <option value="false_positive">False positive (no issue)</option>
                <option value="reviewing">Still reviewing</option>
              </select>
            </div>
            <div className="mt-4">
              <label className="label">Note</label>
              <textarea
                rows={3}
                className="input resize-none"
                placeholder="Document what was found and what action was taken…"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setResolveModal(null)} className="btn-secondary">
                Cancel
              </button>
              <button onClick={resolve} disabled={processing} className="btn-primary">
                {processing ? "Resolving…" : "Confirm resolution"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function severityBadge(severity: string): string {
  switch (severity) {
    case "critical": return "bg-rose-100 text-rose-700";
    case "high": return "bg-orange-100 text-orange-700";
    case "medium": return "bg-amber-100 text-amber-700";
    default: return "bg-ink-100 text-ink-600";
  }
}

function statusBadge(status: string): string {
  switch (status) {
    case "open": return "bg-rose-100 text-rose-700";
    case "reviewing": return "bg-amber-100 text-amber-700";
    case "resolved": return "bg-emerald-100 text-emerald-700";
    case "false_positive": return "bg-ink-100 text-ink-600";
    default: return "bg-ink-100 text-ink-600";
  }
}
