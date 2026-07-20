export type AccountStatus = "active" | "suspended" | "banned" | "pending_review";

export type AdminUserOverview = {
  user_id: string;
  display_name: string | null;
  email: string | null;
  account_status: AccountStatus;
  is_admin: boolean;
  created_at: string;
  last_login_at: string | null;
  risk_flags: Record<string, unknown>;
  subscription_status: string | null;
  plan_name: string | null;
  credit_balance: number;
  payment_count: number;
  total_spent: number;
  generation_count: number;
  flagged_events_count: number;
  has_flags: boolean;
};

export type FlaggedEvent = {
  id: string;
  user_id: string | null;
  event_type: string;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  evidence: Record<string, unknown>;
  status: "open" | "reviewing" | "resolved" | "false_positive";
  resolved_by: string | null;
  resolution_note: string | null;
  amount_implicated: number | null;
  created_at: string;
  resolved_at: string | null;
};

export type Payment = {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  status: "succeeded" | "failed" | "pending" | "refunded";
  provider: string | null;
  provider_tx_ref: string | null;
  is_flagged: boolean;
  flag_reason: string | null;
  created_at: string;
};

export type AdminAction = {
  id: string;
  admin_id: string;
  target_user_id: string | null;
  action_type: string;
  target: Record<string, unknown>;
  target_table: string | null;
  target_id: string | null;
  severity: "info" | "warning" | "critical";
  reason: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type RevenueSnapshot = {
  snapshot_date: string;
  gross_revenue: number;
  net_revenue: number;
  refund_amount: number;
  payment_count: number;
  new_subscribers: number;
  new_pack_purchases: number;
  active_subscribers: number;
  total_users: number;
  flagged_events_count: number;
};

export type SubscriberStats = { status: string; count: number };
export type UserGrowth = { day: string; new_users: number };
export type FlaggedSummary = {
  severity: string;
  event_type: string;
  status: string;
  count: number;
};
