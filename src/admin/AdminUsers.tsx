import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthContext";
import type { AdminUserOverview, AccountStatus } from "@/types/admin";

export function AdminUsers() {
  const { user } = useAuth();
  const [users, setUsers] = useState<AdminUserOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [actionUser, setActionUser] = useState<AdminUserOverview | null>(null);
  const [actionType, setActionType] = useState<
    "suspend" | "ban" | "activate" | "credits" | "promote" | null
  >(null);
  const [actionReason, setActionReason] = useState("");
  const [creditAmount, setCreditAmount] = useState("");
  const [processing, setProcessing] = useState(false);
  const [actionResult, setActionResult] = useState<string | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("v_admin_user_overview")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setUsers((data ?? []) as AdminUserOverview[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filtered = users.filter((u) => {
    const matchesSearch =
      !search ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.display_name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || u.account_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const openAction = (
    u: AdminUserOverview,
    type: "suspend" | "ban" | "activate" | "credits" | "promote"
  ) => {
    setActionUser(u);
    setActionType(type);
    setActionReason("");
    setCreditAmount("");
    setActionResult(null);
  };

  const closeModal = () => {
    setActionUser(null);
    setActionType(null);
    setActionReason("");
    setCreditAmount("");
    setActionResult(null);
  };

  const executeAction = async () => {
    if (!user || !actionUser || !actionType) return;
    setProcessing(true);
    setActionResult(null);

    try {
      if (actionType === "suspend" || actionType === "ban" || actionType === "activate") {
        const status = actionType === "activate" ? "active" : actionType;
        const { error } = await supabase.rpc("admin_set_account_status", {
          p_admin_id: user.id,
          p_user_id: actionUser.user_id,
          p_status: status,
          p_reason: actionReason || null,
        });
        if (error) throw error;
      } else if (actionType === "credits") {
        const amount = parseFloat(creditAmount);
        if (isNaN(amount) || amount === 0) throw new Error("Enter a non-zero amount");
        const { error } = await supabase.rpc("admin_adjust_credits", {
          p_admin_id: user.id,
          p_user_id: actionUser.user_id,
          p_amount: amount,
          p_reason: actionReason || "Admin adjustment",
        });
        if (error) throw error;
      } else if (actionType === "promote") {
        const { error } = await supabase.rpc("admin_promote_user", {
          p_admin_id: user.id,
          p_user_id: actionUser.user_id,
        });
        if (error) throw error;
      }

      setActionResult("Action completed successfully");
      await loadUsers();
      setTimeout(closeModal, 1500);
    } catch (e) {
      setActionResult(e instanceof Error ? e.message : "Action failed");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">User Management</h1>
        <p className="mt-1 text-sm text-ink-500">
          {users.length} total users · {users.filter((u) => u.has_flags).length} flagged
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="text"
          placeholder="Search by name or email…"
          className="input sm:max-w-xs"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="input sm:max-w-[180px]"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="banned">Banned</option>
          <option value="pending_review">Pending Review</option>
        </select>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* User table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink-200 border-t-brand-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-ink-400">No users found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-ink-100 bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-500">
                <tr>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Plan</th>
                  <th className="px-4 py-3 font-medium">Credits</th>
                  <th className="px-4 py-3 font-medium">Spent</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Flags</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {filtered.map((u) => (
                  <tr key={u.user_id} className="hover:bg-ink-50/50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-ink-900">
                        {u.display_name || "Unnamed"}
                      </div>
                      <div className="text-xs text-ink-400">{u.email}</div>
                    </td>
                    <td className="px-4 py-3 text-ink-600">
                      {u.plan_name || (
                        <span className="text-ink-400">Free</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-ink-900">
                      {Number(u.credit_balance).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-ink-600">
                      ${Number(u.total_spent).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={u.account_status} isAdmin={u.is_admin} />
                    </td>
                    <td className="px-4 py-3">
                      {u.has_flags ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-600">
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                          {u.flagged_events_count}
                        </span>
                      ) : (
                        <span className="text-ink-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        {u.account_status === "active" ? (
                          <>
                            <ActionBtn label="Suspend" onClick={() => openAction(u, "suspend")} variant="warning" />
                            <ActionBtn label="Ban" onClick={() => openAction(u, "ban")} variant="danger" />
                          </>
                        ) : (
                          <ActionBtn label="Activate" onClick={() => openAction(u, "activate")} variant="success" />
                        )}
                        <ActionBtn label="Credits" onClick={() => openAction(u, "credits")} />
                        {!u.is_admin && (
                          <ActionBtn label="Promote" onClick={() => openAction(u, "promote")} variant="neutral" />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Action modal */}
      {actionUser && actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/40 p-4 animate-fade-in">
          <div className="card w-full max-w-md p-6 animate-slide-up">
            <h3 className="text-lg font-semibold text-ink-900">
              {actionType === "suspend" && "Suspend user"}
              {actionType === "ban" && "Ban user"}
              {actionType === "activate" && "Activate user"}
              {actionType === "credits" && "Adjust credits"}
              {actionType === "promote" && "Promote to admin"}
            </h3>
            <p className="mt-1 text-sm text-ink-500">
              {actionUser.display_name || actionUser.email} ·{" "}
              {actionUser.email}
            </p>

            {actionType === "credits" && (
              <div className="mt-4">
                <label className="label">Amount (positive to add, negative to remove)</label>
                <input
                  type="number"
                  className="input"
                  placeholder="e.g. 100 or -50"
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(e.target.value)}
                />
                <p className="mt-1 text-xs text-ink-400">
                  Current balance: {Number(actionUser.credit_balance).toLocaleString()}
                </p>
              </div>
            )}

            {actionType !== "activate" && actionType !== "promote" && (
              <div className="mt-4">
                <label className="label">Reason</label>
                <textarea
                  rows={3}
                  className="input resize-none"
                  placeholder={
                    actionType === "credits"
                      ? "Why is this adjustment being made?"
                      : "Why is this user being " + actionType + "ed?"
                  }
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                />
              </div>
            )}

            {actionType === "promote" && (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                This will grant full admin privileges. The user will be able to
                manage users, payments, and platform settings.
              </div>
            )}

            {actionResult && (
              <div className="mt-4 rounded-lg border border-ink-200 bg-ink-50 p-3 text-sm text-ink-700">
                {actionResult}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <button onClick={closeModal} className="btn-secondary">
                Cancel
              </button>
              <button
                onClick={executeAction}
                disabled={processing || (actionType === "credits" && !creditAmount)}
                className={
                  actionType === "ban" || actionType === "suspend"
                    ? "btn bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800"
                    : actionType === "activate"
                    ? "btn bg-emerald-600 text-white hover:bg-emerald-700"
                    : actionType === "promote"
                    ? "btn bg-amber-600 text-white hover:bg-amber-700"
                    : "btn-primary"
                }
              >
                {processing ? "Processing…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status, isAdmin }: { status: AccountStatus; isAdmin: boolean }) {
  const map: Record<AccountStatus, string> = {
    active: "bg-emerald-100 text-emerald-700",
    suspended: "bg-amber-100 text-amber-700",
    banned: "bg-rose-100 text-rose-700",
    pending_review: "bg-ink-100 text-ink-600",
  };
  return (
    <div className="flex items-center gap-1.5">
      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${map[status]}`}>
        {status}
      </span>
      {isAdmin && (
        <span className="inline-flex rounded-full bg-ink-900 px-2 py-0.5 text-xs font-medium text-white">
          admin
        </span>
      )}
    </div>
  );
}

function ActionBtn({
  label,
  onClick,
  variant = "neutral",
}: {
  label: string;
  onClick: () => void;
  variant?: "neutral" | "warning" | "danger" | "success";
}) {
  const map = {
    neutral: "text-ink-600 hover:bg-ink-100",
    warning: "text-amber-700 hover:bg-amber-50",
    danger: "text-rose-700 hover:bg-rose-50",
    success: "text-emerald-700 hover:bg-emerald-50",
  };
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${map[variant]}`}
    >
      {label}
    </button>
  );
}
