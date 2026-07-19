import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/auth/AuthContext";
import { supabase } from "@/lib/supabase";
import { AppShell } from "./AppShell";

type FormState = {
  display_name: string;
  bio: string;
  language: string;
  timezone: string;
};

const empty: FormState = {
  display_name: "",
  bio: "",
  language: "en",
  timezone: "",
};

export function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const [form, setForm] = useState<FormState>(empty);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  // Hydrate form when profile loads
  useEffect(() => {
    if (profile) {
      setForm({
        display_name: profile.display_name ?? "",
        bio: profile.bio ?? "",
        language: profile.language ?? "en",
        timezone: profile.timezone ?? "",
      });
      setDirty(false);
    }
  }, [profile?.id]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setDirty(true);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setSaveError(null);

    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: form.display_name.trim() || null,
        bio: form.bio.trim() || null,
        language: form.language,
        timezone: form.timezone.trim() || null,
      })
      .eq("user_id", user.id);

    setSaving(false);
    if (error) {
      setSaveError(error.message);
      return;
    }
    setDirty(false);
    setSavedAt(new Date());
    await refreshProfile();
  };

  return (
    <AppShell title="Profile">
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Identity card */}
        <aside className="card p-6 lg:col-span-1">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-100 text-2xl font-bold text-brand-700">
              {(form.display_name || user?.email || "?")
                .split(" ")
                .map((p) => p[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </div>
            <h2 className="mt-4 text-lg font-semibold text-ink-900">
              {form.display_name || "Unnamed creator"}
            </h2>
            <p className="text-sm text-ink-500">{user?.email}</p>
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-ink-100 px-3 py-1 text-xs font-medium text-ink-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Active account
            </div>
          </div>
          <dl className="mt-6 space-y-3 border-t border-ink-100 pt-6 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-500">Member since</dt>
              <dd className="font-medium text-ink-800">
                {profile?.created_at
                  ? new Date(profile.created_at).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "—"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-500">Plan</dt>
              <dd className="font-medium text-ink-800">Free</dd>
            </div>
          </dl>
        </aside>

        {/* Edit form */}
        <section className="card p-6 lg:col-span-2">
          <h3 className="text-base font-semibold text-ink-900">
            Profile details
          </h3>
          <p className="mt-1 text-sm text-ink-500">
            This information appears on your projects and shared assets.
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-5" noValidate>
            <div>
              <label className="label" htmlFor="display_name">
                Display name
              </label>
              <input
                id="display_name"
                className="input"
                value={form.display_name}
                onChange={(e) => update("display_name", e.target.value)}
                placeholder="How should we credit you?"
              />
            </div>

            <div>
              <label className="label" htmlFor="bio">
                Bio
              </label>
              <textarea
                id="bio"
                rows={4}
                className="input resize-none"
                value={form.bio}
                onChange={(e) => update("bio", e.target.value)}
                placeholder="A short bio for your creator profile."
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="language">
                  Language
                </label>
                <select
                  id="language"
                  className="input"
                  value={form.language}
                  onChange={(e) => update("language", e.target.value)}
                >
                  <option value="en">English</option>
                  <option value="fr">Français</option>
                  <option value="es">Español</option>
                  <option value="de">Deutsch</option>
                  <option value="pt">Português</option>
                  <option value="ar">العربية</option>
                  <option value="yo">Yorùbá</option>
                  <option value="sw">Kiswahili</option>
                </select>
              </div>
              <div>
                <label className="label" htmlFor="timezone">
                  Timezone
                </label>
                <input
                  id="timezone"
                  className="input"
                  value={form.timezone}
                  onChange={(e) => update("timezone", e.target.value)}
                  placeholder="e.g. Africa/Lagos"
                />
              </div>
            </div>

            {saveError && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
                {saveError}
              </div>
            )}

            <div className="flex items-center justify-between border-t border-ink-100 pt-5">
              <div className="text-xs text-ink-500">
                {savedAt && !dirty
                  ? `Saved ${savedAt.toLocaleTimeString()}`
                  : dirty
                    ? "Unsaved changes"
                    : ""}
              </div>
              <button
                type="submit"
                className="btn-primary"
                disabled={saving || !dirty}
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </AppShell>
  );
}
