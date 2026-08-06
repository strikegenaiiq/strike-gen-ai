import { useEffect, useState } from "react";
import { useAuth } from "@/auth/AuthContext";
import { supabase } from "@/lib/supabase";
import { AppShell } from "./AppShell";

type Plan = {
  id: number;
  name: string;
  monthly_price_usd: number;
  monthly_tokens: number;
  description: string | null;
};

const PLAN_STYLE: Record<string, { eyebrow: string; description: string }> = {
  Standard: { eyebrow: "Start creating", description: "A clean starting balance for everyday video creation." },
  Pro: { eyebrow: "Create more", description: "More room for regular creators and bigger projects." },
  Premium: { eyebrow: "Go further", description: "A larger balance for serious, frequent generation." },
  "Creator Ultra": { eyebrow: "Production mode", description: "Built for creators who generate at scale." },
};

export function PricingPage() {
  const { session } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [loadingPlan, setLoadingPlan] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    Promise.all([
      supabase.from("subscription_plans").select("id, name, monthly_price_usd, monthly_tokens, description").eq("is_active", true).order("monthly_price_usd"),
      supabase.from("token_ledgers").select("amount"),
    ]).then(([planResult, ledgerResult]) => {
      if (planResult.data) setPlans(planResult.data as Plan[]);
      if (!ledgerResult.error && ledgerResult.data) {
        setBalance(ledgerResult.data.reduce((total, row) => total + Number(row.amount || 0), 0));
      }
    });
  }, [session]);

  const startCheckout = async (planId: number) => {
    if (!session) return;
    setLoadingPlan(planId);
    setError(null);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke("checkout-initiate", {
        body: { provider: "paystack", planId },
      });
      if (invokeError) throw invokeError;
      if (!data?.checkoutUrl) throw new Error("Checkout could not be started.");
      window.location.assign(data.checkoutUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout could not be started.");
      setLoadingPlan(null);
    }
  };

  return (
    <AppShell title="Credits that keep you creating">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col justify-between gap-4 rounded-3xl border border-white/10 bg-white/[0.04] p-5 sm:flex-row sm:items-center sm:p-6">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30">Your balance</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight">{balance === null ? "—" : balance.toLocaleString()}</p>
            <p className="mt-1 text-sm text-white/35">Strike credits available now</p>
          </div>
          <div className="max-w-md text-sm leading-6 text-white/45">
            <span className="font-medium text-white/70">Need credits again today?</span> You can purchase your plan again immediately after using your balance. Your new payment is processed as a fresh allocation.
          </div>
        </div>

        {error && <div className="mb-6 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</div>}

        <div className="grid gap-4 lg:grid-cols-4">
          {plans.map((plan, index) => {
            const style = PLAN_STYLE[plan.name] ?? { eyebrow: "Strike Studio", description: plan.description ?? "More credits for more creation." };
            const featured = plan.name === "Pro";
            return (
              <article key={plan.id} className={`relative overflow-hidden rounded-3xl border p-5 transition ${featured ? "border-white/25 bg-white text-black shadow-2xl shadow-white/5" : "border-white/10 bg-white/[0.04]"}`}>
                {featured && <div className="absolute right-4 top-4 rounded-full bg-black px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-white">Popular</div>}
                <p className={`text-[10px] font-semibold uppercase tracking-[0.2em] ${featured ? "text-black/45" : "text-white/30"}`}>{style.eyebrow}</p>
                <h2 className="mt-3 text-xl font-semibold">{plan.name}</h2>
                <p className={`mt-2 min-h-12 text-sm leading-5 ${featured ? "text-black/50" : "text-white/40"}`}>{style.description}</p>
                <div className="mt-6">
                  <span className="text-3xl font-semibold">${Number(plan.monthly_price_usd).toFixed(0)}</span>
                  <span className={`ml-1 text-xs ${featured ? "text-black/40" : "text-white/30"}`}>/month</span>
                </div>
                <div className={`mt-5 border-t pt-4 ${featured ? "border-black/10" : "border-white/10"}`}>
                  <p className="text-sm font-semibold">{plan.monthly_tokens.toLocaleString()} credits</p>
                  <p className={`mt-1 text-xs ${featured ? "text-black/40" : "text-white/30"}`}>allocated when payment succeeds</p>
                </div>
                <button
                  onClick={() => startCheckout(plan.id)}
                  disabled={loadingPlan !== null}
                  className={`mt-6 w-full rounded-2xl px-4 py-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${featured ? "bg-black text-white hover:bg-black/85" : "bg-white text-black hover:bg-white/90"}`}
                >
                  {loadingPlan === plan.id ? "Opening checkout…" : index === 0 ? "Subscribe / renew" : "Choose plan"}
                </button>
                <p className={`mt-3 text-center text-[10px] leading-4 ${featured ? "text-black/35" : "text-white/25"}`}>No waiting period when your current credits are used.</p>
              </article>
            );
          })}
        </div>

        <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.025] p-5 sm:p-6">
          <p className="text-sm font-semibold">How Strike credits work</p>
          <div className="mt-4 grid gap-4 text-sm text-white/40 sm:grid-cols-3">
            <div><span className="text-white/70">1.</span> Choose the scope that fits your work.</div>
            <div><span className="text-white/70">2.</span> Pay securely through checkout.</div>
            <div><span className="text-white/70">3.</span> Credits are added after verified payment.</div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
