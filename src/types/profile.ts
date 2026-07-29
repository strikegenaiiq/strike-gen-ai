export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  tier_level: number;
  subscription_status: string | null;
  account_status: "active" | "suspended" | "banned" | "pending_review";
  created_at: string;
  updated_at: string;
};
