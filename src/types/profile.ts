export type Profile = {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  language: string;
  timezone: string | null;
  preferences: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type ProfileUpdate = {
  display_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  language?: string;
  timezone?: string | null;
  preferences?: Record<string, unknown>;
};
