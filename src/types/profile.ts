export type Profile = {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  language: string;
  timezone: string | null;
  preferences: Record<string, unknown>;
  is_admin: boolean;
  account_status: string;
  suspended_reason: string | null;
  created_at: string;
  updated_at: string;
};
