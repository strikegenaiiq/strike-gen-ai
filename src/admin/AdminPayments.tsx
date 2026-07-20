import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthContext";
import type { Payment } from "@/types/admin";

export function AdminPayments() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [flagModal, setFlagModal] = useState<Payment | null>(null);
  const [flagReason, setFlagReason] = useState("");
  const [processing, setProcessing] = useState(false);

  const load = async () => {
    setLoading(true);
    let query = supabase
      .from("payments")
      .select("*")
      .order("created_at", { ascending: false });

    if (filter === "flagged") query = query.eq("is_flagged", true);
    else if (filter === "succeeded") query = query.eq("status", "succeeded");
    else if (filter === "refunded") query = query.eq("status", "refunded");
    else if (filter === "pending") query = query.eq("status", "pending");

    const { data, error } = await query;
    if (error) {
      setError(error.message);
    } else {
      setPayments((data ?? []) as Payment[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [filter]);

  const flagPayment = async () => {
    if (!user || !flagModal) return;
    setProcessing(true);
    const { error } = await supabase.rpc("admin_flag_payment", {
      p_admin_id: user.id,
      p_payment_id: flagModal.id,
      p_reason: flagReason || "Flagged by admin review",
    });
    if (error) {
      setError(error.message);
    } else {
      setFlagModal(null);
      setFlagReason("");
      await load();
    }
    setProcessing(false);
  };

  const totalRevenue = payments
    .filter((p) => p.status === "succeeded" && !p.is_flagged)
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const flaggedCount = payments.filter((p) => p.is_flagged).length;
  const refundedCount = payments.filter((p) => p.status === "refunded").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">Payments</h1>
        <p className="mt-1 text-sm text-ink-500">
          ${totalRevenue.toFixed(2)} revenue · {flaggedCount} flagged · {refundedCount} refunded
        </p>
      </div>

      <div className="flex gap-2">
        {["all", "succeeded", "pending", "refunded", "flagged"].map((f) => (
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

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink-200 border-t-brand-600" />
          </div>
        ) : payments.length === 0 ? (
          <div className="p-8 text-center text-sm text-ink-400">No payments found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-ink-100 bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Provider</th>
                  <th className="px-4 py-3 font-medium">Tx Ref</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-ink-50/50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-ink-900">
                        ${Number(p.amount).toFixed(2)} {p.currency}
                      </div>
                      <div className="text-xs text-ink-400 font-mono">{p.user_id.slice(0, 8)}…</div>
                    </td>
                    <td className="px-4 py-3">
                      <PaymentStatusBadge status={p.status} flagged={p.is_flagged} />
                    </td>
                    <td className="px-4 py-3 text-ink-600">
                      {p.provider || "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-ink-500">
                      {p.provider_tx_ref || "—"}
                    </td>
                    <td className="px-4 py-3 text-ink-500">
                      {new Date(p.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!p.is_flagged && (
                        <button
                          onClick={() => {
                            setFlagModal(p);
                            setFlagReason("");
                          }}
                          className="rounded-md px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50"
                        >
                          Flag
                        </button>
                      )}
                      {p.is_flagged && (
                        <span className="text-xs text-rose-600">{p.flag_reason}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {flagModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/40 p-4 animate-fade-in">
          <div className="card w-full max-w-md p-6 animate-slide-up">
            <h3 className="text-lg font-semibold text-ink-900">Flag payment</h3>
            <p className="mt-1 text-sm text-ink-500">
              ${Number(flagModal.amount).toFixed(2)} {flagModal.currency} ·{" "}
              {flagModal.provider_tx_ref}
            </p>
            <div className="mt-4">
              <label className="label">Reason</label>
              <textarea
                rows={3}
                className="input resize-none"
                placeholder="Why is this payment being flagged?"
                value={flagReason}
                onChange={(e) => setFlagReason(e.target.value)}
              />
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setFlagModal(null)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={flagPayment}
                disabled={processing}
                className="btn bg-rose-600 text-white hover:bg-rose-700"
              >
                {processing ? "Flagging…" : "Flag payment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PaymentStatusBadge({ status, flagged }: { status: string; flagged: boolean }) {
  if (flagged) {
    return (
      <span className="inline-flex rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">
        flagged
      </span>
    );
  }
  const map: Record<string, string> = {
    succeeded: "bg-emerald-100 text-emerald-700",
    pending: "bg-amber-100 text-amber-700",
    failed: "bg-rose-100 text-rose-700",
    refunded: "bg-ink-100 text-ink-600",
  };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${map[status] ?? map.pending}`}>
      {status}
    </span>
  );
}
