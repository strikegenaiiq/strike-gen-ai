import { useEffect, useState } from "react";
import { useAuth } from "@/auth/AuthContext";
import { supabase } from "@/lib/supabase";
import { AppShell } from "./AppShell";

interface Plan { id: number; name: string; monthly_price_usd: number; monthly_tokens: number; }

const descriptions: Record<string, string> = {
  Standard: "A practical starting plan for creators building consistently.",
  Pro: "More room for frequent creation and larger creative workflows.",
  Premium: "Higher capacity for serious creators producing at scale.",
  Creator: "The highest self-serve tier for ambitious creator workflows.",
};

export function PlansPage() {
  const { session } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutId, setCheckoutId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data, error: queryError } = await supabase.from("subscription_plans").select("id,name,monthly_price_usd,monthly_tokens").eq("is_active", true).order("monthly_price_usd");
      if (queryError) setError("Unable to load plans right now.");
      else setPlans((data ?? []) as Plan[]);
      setLoading(false);
    };
    void load();
  }, []);

  const startCheckout = async (planId: number) => {
    if (!session || checkoutId) return;
    setCheckoutId(planId);
    setError(null);
    const { data, error: fnError } = await supabase.functions.invoke("checkout-initiate", { body: { provider: "paystack", planId } });
    if (fnError || !data?.checkoutUrl) {
      setError(fnError?.message ?? data?.error ?? "Checkout could not be started.");
      setCheckoutId(null);
      return;
    }
    window.location.assign(data.checkoutUrl);
  };

  return <AppShell title="Plans & Billing">
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="max-w-2xl"><p className="text-sm font-medium text-brand-700">Strike Gen AI</p><h2 className="mt-1 text-3xl font-semibold tracking-tight">Choose the capacity that fits your creation.</h2><p className="mt-3 text-sm text-ink-500">Every plan is credit-based. Generation and Creator Advisor usage are metered against the same protected credit economy.</p></div>
      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}
      {loading ? <div className="card p-8 text-sm text-ink-500">Loading plans…</div> : <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">{plans.map((plan) => <article key={plan.id} className={`card flex flex-col p-6 ${plan.name === "Premium" ? "ring-2 ring-brand-200" : ""}`}><div className="flex-1"><div className="flex items-start justify-between gap-3"><h3 className="text-lg font-semibold">{plan.name}</h3>{plan.name === "Premium" && <span className="rounded-full bg-brand-50 px-2 py-1 text-xs font-medium text-brand-700">Popular</span>}</div><p className="mt-2 min-h-10 text-sm text-ink-500">{descriptions[plan.name] ?? "Credit-based creator access."}</p><div className="mt-6"><span className="text-3xl font-bold">${Number(plan.monthly_price_usd).toLocaleString()}</span><span className="text-sm text-ink-500"> / month</span></div><p className="mt-2 text-sm font-medium">{Number(plan.monthly_tokens).toLocaleString()} credits / month</p></div><button onClick={() => void startCheckout(plan.id)} disabled={!session || checkoutId !== null} className="btn-primary mt-6 w-full">{checkoutId === plan.id ? "Opening checkout…" : "Subscribe"}</button></article>)}</div>}
      <p className="text-xs text-ink-500">Your payment is initialized server-side. The final amount is calculated from the plan's stored USD price and the live NGN conversion used by checkout.</p>
    </div>
  </AppShell>;
}
