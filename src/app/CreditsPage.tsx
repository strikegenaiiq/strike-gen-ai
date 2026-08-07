import { useEffect, useState } from "react";
import { useAuth } from "@/auth/AuthContext";
import { supabase } from "@/lib/supabase";
import { AppShell } from "./AppShell";

interface CreditRow { id: string; amount: number; reason: string | null; created_at: string; }

export function CreditsPage() {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [planName, setPlanName] = useState("No active plan");
  const [rows, setRows] = useState<CreditRow[]>([]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    const load = async () => {
      const [{ data: ledger }, { data: subscription }] = await Promise.all([
        supabase.from("credit_transactions").select("id, amount, reason, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
        supabase.from("subscriptions").select("plan_id, subscription_plans(name)").eq("user_id", user.id).eq("status", "active").order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      if (!active) return;
      const transactions = (ledger ?? []) as CreditRow[];
      setRows(transactions);
      setBalance(transactions.reduce((sum, row) => sum + Number(row.amount || 0), 0));
      const plan = Array.isArray(subscription?.subscription_plans) ? subscription?.subscription_plans[0] : subscription?.subscription_plans;
      setPlanName((plan as { name?: string } | null)?.name ?? "No active plan");
    };
    void load();
    return () => { active = false; };
  }, [user?.id]);

  return (
    <AppShell title="Credits">
      <div className="mx-auto max-w-4xl space-y-6">
        <section className="grid gap-4 sm:grid-cols-2">
          <div className="card p-6"><p className="text-sm text-ink-500">Available credits</p><p className="mt-2 text-3xl font-semibold">{balance === null ? "—" : balance.toLocaleString()}</p></div>
          <div className="card p-6"><p className="text-sm text-ink-500">Active plan</p><p className="mt-2 text-xl font-semibold">{planName}</p></div>
        </section>
        <section className="card p-6">
          <h2 className="text-base font-semibold">Credit activity</h2>
          <p className="mt-1 text-sm text-ink-500">Your credit balance is calculated from your ledger. Generation charges are calculated server-side.</p>
          <div className="mt-5 divide-y divide-ink-100">
            {rows.map((row) => <div key={row.id} className="flex items-center justify-between gap-4 py-3 text-sm"><div><p className="font-medium text-ink-800">{row.reason ?? "Credit activity"}</p><p className="text-xs text-ink-500">{new Date(row.created_at).toLocaleString()}</p></div><span className={Number(row.amount) < 0 ? "font-semibold text-rose-600" : "font-semibold text-emerald-600"}>{Number(row.amount) > 0 ? "+" : ""}{Number(row.amount).toLocaleString()}</span></div>)}
            {rows.length === 0 && <p className="py-6 text-sm text-ink-500">No credit activity yet.</p>}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
