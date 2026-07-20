import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type {
  RevenueSnapshot,
  SubscriberStats,
  UserGrowth,
  FlaggedSummary,
  FlaggedEvent,
} from "@/types/admin";

export function AdminOverview() {
  const [snapshot, setSnapshot] = useState<RevenueSnapshot | null>(null);
  const [subStats, setSubStats] = useState<SubscriberStats[]>([]);
  const [growth, setGrowth] = useState<UserGrowth[]>([]);
  const [flaggedSummary, setFlaggedSummary] = useState<FlaggedSummary[]>([]);
  const [recentFlags, setRecentFlags] = useState<FlaggedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setError(null);
      try {
        await supabase.rpc("refresh_revenue_snapshot");

        const [snap, subs, growthRes, flagSum, flagRecent] = await Promise.all([
          supabase
            .from("revenue_snapshots")
            .select("*")
            .order("snapshot_date", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase.from("v_subscriber_stats").select("*"),
          supabase.from("v_user_growth").select("*").limit(30),
          supabase.from("v_flagged_summary").select("*"),
          supabase
            .from("flagged_events")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(5),
        ]);

        if (snap.data) setSnapshot(snap.data as RevenueSnapshot);
        setSubStats((subs.data ?? []) as SubscriberStats[]);
        setGrowth((growthRes.data ?? []) as UserGrowth[]);
        setFlaggedSummary((flagSum.data ?? []) as FlaggedSummary[]);
        setRecentFlags((flagRecent.data ?? []) as FlaggedEvent[]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink-200 border-t-brand-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
        {error}
      </div>
    );
  }

  const activeSubs = subStats.find((s) => s.status === "active")?.count ?? 0;
  const trialingSubs = subStats.find((s) => s.status === "trialing")?.count ?? 0;
  const cancelledSubs = subStats.find((s) => s.status === "cancelled")?.count ?? 0;
  const pastDueSubs = subStats.find((s) => s.status === "past_due")?.count ?? 0;
  const openFlags = flaggedSummary
    .filter((f) => f.status === "open" || f.status === "reviewing")
    .reduce((sum, f) => sum + f.count, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">Overview</h1>
        <p className="mt-1 text-sm text-ink-500">
          Real-time platform health and revenue metrics.
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Users"
          value={snapshot?.total_users ?? 0}
          accent="brand"
        />
        <StatCard
          label="Active Subscribers"
          value={activeSubs}
          sub={`${trialingSubs} trialing · ${pastDueSubs} past due`}
          accent="emerald"
        />
        <StatCard
          label="Revenue (Today)"
          value={`$${(snapshot?.gross_revenue ?? 0).toFixed(2)}`}
          sub={`Net $${(snapshot?.net_revenue ?? 0).toFixed(2)}`}
          accent="amber"
        />
        <StatCard
          label="Open Fraud Alerts"
          value={openFlags}
          sub={`${snapshot?.flagged_events_count ?? 0} total open`}
          accent={openFlags > 0 ? "rose" : "ink"}
        />
      </div>

      {/* Charts row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* User growth */}
        <section className="card p-6">
          <h2 className="text-sm font-semibold text-ink-900">New Users (30 days)</h2>
          <div className="mt-4 flex h-40 items-end gap-1">
            {growth.length === 0 ? (
              <p className="m-auto text-sm text-ink-400">No data yet</p>
            ) : (
              [...growth]
                .reverse()
                .map((g) => (
                  <div
                    key={g.day}
                    className="group relative flex-1 rounded-t bg-brand-200 transition-colors hover:bg-brand-400"
                    style={{ height: `${Math.max(g.new_users * 8, 4)}%` }}
                    title={`${g.day}: ${g.new_users} users`}
                  />
                ))
            )}
          </div>
        </section>

        {/* Subscription breakdown */}
        <section className="card p-6">
          <h2 className="text-sm font-semibold text-ink-900">Subscriptions</h2>
          <div className="mt-4 space-y-3">
            <SubBar label="Active" count={activeSubs} total={Math.max(activeSubs + trialingSubs + cancelledSubs + pastDueSubs, 1)} color="bg-emerald-500" />
            <SubBar label="Trialing" count={trialingSubs} total={Math.max(activeSubs + trialingSubs + cancelledSubs + pastDueSubs, 1)} color="bg-brand-500" />
            <SubBar label="Past Due" count={pastDueSubs} total={Math.max(activeSubs + trialingSubs + cancelledSubs + pastDueSubs, 1)} color="bg-amber-500" />
            <SubBar label="Cancelled" count={cancelledSubs} total={Math.max(activeSubs + trialingSubs + cancelledSubs + pastDueSubs, 1)} color="bg-ink-400" />
          </div>
        </section>
      </div>

      {/* Recent fraud alerts */}
      <section className="card p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink-900">Recent Fraud Alerts</h2>
          <a href="/admin/fraud" className="text-xs font-medium text-brand-600 hover:text-brand-700">
            View all →
          </a>
        </div>
        {recentFlags.length === 0 ? (
          <p className="mt-4 text-sm text-ink-400">No flagged events. All clear.</p>
        ) : (
          <div className="mt-4 space-y-2">
            {recentFlags.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between rounded-lg border border-ink-100 px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${severityBadge(event.severity)}`}>
                      {event.severity}
                    </span>
                    <span className="truncate text-sm font-medium text-ink-900">
                      {event.event_type.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-ink-500">{event.description}</p>
                </div>
                <span className="ml-4 shrink-0 text-xs text-ink-400">
                  {new Date(event.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent: "brand" | "emerald" | "amber" | "rose" | "ink";
}) {
  const accentMap = {
    brand: "text-brand-700 bg-brand-50",
    emerald: "text-emerald-700 bg-emerald-50",
    amber: "text-amber-700 bg-amber-50",
    rose: "text-rose-700 bg-rose-50",
    ink: "text-ink-700 bg-ink-100",
  };
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-ink-500">
          {label}
        </span>
        <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${accentMap[accent]}`}>
          live
        </span>
      </div>
      <div className="mt-2 text-2xl font-bold tracking-tight text-ink-900">
        {value}
      </div>
      {sub && <div className="mt-1 text-xs text-ink-400">{sub}</div>}
    </div>
  );
}

function SubBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-xs">
        <span className="text-ink-600">{label}</span>
        <span className="font-medium text-ink-900">{count}</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-ink-100">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
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
