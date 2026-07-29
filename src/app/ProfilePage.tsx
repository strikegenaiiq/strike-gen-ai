import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/auth/AuthContext";
import { supabase } from "@/lib/supabase";
import { AppShell } from "./AppShell";

type FormState = {
  full_name: string;
};

const empty: FormState = { full_name: "" };

export function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const [form, setForm] = useState<FormState>(empty);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name ?? "",
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
        full_name: form.full_name.trim() || null,
      })
      .eq("id", user.id);

    setSaving(false);
    if (error) {
      setSaveError(error.message);
      return;
    }
    setDirty(false);
    setSavedAt(new Date());
    await refreshProfile();
  };

  const isSuspended = profile?.account_status === "suspended" || profile?.account_status === "banned";

  return (
    <AppShell title="Profile">
      {isSuspended && (
        <div className="mb-6 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          Your account is {profile?.account_status}.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <aside className="card p-6 lg:col-span-1">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-100 text-2xl font-bold text-brand-700">
              {(form.full_name || user?.email || "?")
                .split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
            </div>
            <h2 className="mt-4 text-lg font-semibold text-ink-900">
              {form.full_name || "Unnamed creator"}
            </h2>
            <p className="text-sm text-ink-500">{user?.email}</p>
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-ink-100 px-3 py-1 text-xs font-medium text-ink-600">
              <span className={`h-1.5 w-1.5 rounded-full ${isSuspended ? "bg-rose-500" : "bg-emerald-500"}`} />
              {profile?.account_status ?? "active"}
            </div>
          </div>
          <dl className="mt-6 space-y-3 border-t border-ink-100 pt-6 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-500">Member since</dt>
              <dd className="font-medium text-ink-800">
                {profile?.created_at
                  ? new Date(profile.created_at).toLocaleDateString(undefined, {
                      year: "numeric", month: "long", day: "numeric",
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

        <section className="card p-6 lg:col-span-2">
          <h3 className="text-base font-semibold text-ink-900">Profile details</h3>
          <p className="mt-1 text-sm text-ink-500">
            This information appears on your projects and shared assets.
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-5" noValidate>
            <div>
              <label className="label" htmlFor="full_name">Display name</label>
              <input
                id="full_name"
                className="input"
                value={form.full_name}
                onChange={(e) => update("full_name", e.target.value)}
                placeholder="How should we credit you?"
              />
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
              <button type="submit" className="btn-primary" disabled={saving || !dirty}>
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </AppShell>
  );
}
