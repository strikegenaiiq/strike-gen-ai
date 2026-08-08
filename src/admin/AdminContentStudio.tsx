import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type FeedItem = {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  image_url: string | null;
  feed_type: string;
  action_label: string | null;
  action_url: string | null;
  badge: string | null;
  display_order: number;
  starts_at: string | null;
  ends_at: string | null;
  is_featured: boolean;
  is_active: boolean;
};

type Banner = {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string;
  action_label: string | null;
  action_url: string | null;
  display_order: number;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
};

const emptyFeed = {
  title: "",
  subtitle: "",
  description: "",
  image_url: "",
  feed_type: "featured",
  action_label: "Create now",
  action_url: "/app/generate",
  badge: "Featured",
  display_order: "0",
  is_featured: true,
  is_active: true,
};

export function AdminContentStudio() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [form, setForm] = useState(emptyFeed);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const [feed, hero] = await Promise.all([
      supabase.from("discovery_feed").select("*").order("display_order").order("created_at", { ascending: false }),
      supabase.from("featured_banners").select("*").order("display_order").order("created_at", { ascending: false }),
    ]);
    if (feed.error) setError(feed.error.message);
    else setItems((feed.data ?? []) as FeedItem[]);
    if (hero.error && !feed.error) setError(hero.error.message);
    else setBanners((hero.data ?? []) as Banner[]);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const saveFeed = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    const { error: saveError } = await supabase.from("discovery_feed").insert({
      title: form.title.trim(),
      subtitle: form.subtitle.trim() || null,
      description: form.description.trim() || null,
      image_url: form.image_url.trim() || null,
      feed_type: form.feed_type,
      action_label: form.action_label.trim() || null,
      action_url: form.action_url.trim() || null,
      badge: form.badge.trim() || null,
      display_order: Number(form.display_order) || 0,
      is_featured: form.is_featured,
      is_active: form.is_active,
    });
    if (saveError) setError(saveError.message);
    else {
      setMessage("Showcase item saved. It can now appear in the public Explore experience.");
      setForm(emptyFeed);
      await load();
    }
    setSaving(false);
  };

  const toggleFeed = async (item: FeedItem) => {
    setError(null);
    const { error: updateError } = await supabase.from("discovery_feed").update({ is_active: !item.is_active }).eq("id", item.id);
    if (updateError) setError(updateError.message);
    else await load();
  };

  const deleteFeed = async (id: string) => {
    if (!window.confirm("Remove this showcase item?")) return;
    const { error: deleteError } = await supabase.from("discovery_feed").delete().eq("id", id);
    if (deleteError) setError(deleteError.message);
    else await load();
  };

  const toggleBanner = async (banner: Banner) => {
    const { error: updateError } = await supabase.from("featured_banners").update({ is_active: !banner.is_active }).eq("id", banner.id);
    if (updateError) setError(updateError.message);
    else await load();
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Admin only</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink-900">Content Studio</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-500">Create the real promotional material that powers Strike's public “seeing is believing” showcase. This area is separate from the user creator workspace.</p>
      </div>

      {message && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</div>}
      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

      <section className="card p-6">
        <div className="mb-5">
          <h2 className="text-base font-semibold text-ink-900">Publish showcase item</h2>
          <p className="mt-1 text-xs text-ink-500">Use a generated Strike video/image URL here after creating promotional media in the admin creator.</p>
        </div>
        <form onSubmit={saveFeed} className="grid gap-4 md:grid-cols-2">
          <Field label="Title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} required />
          <Field label="Badge" value={form.badge} onChange={(v) => setForm({ ...form, badge: v })} />
          <Field label="Subtitle" value={form.subtitle} onChange={(v) => setForm({ ...form, subtitle: v })} />
          <Field label="Media URL" value={form.image_url} onChange={(v) => setForm({ ...form, image_url: v })} />
          <Field label="Action label" value={form.action_label} onChange={(v) => setForm({ ...form, action_label: v })} />
          <Field label="Action URL" value={form.action_url} onChange={(v) => setForm({ ...form, action_url: v })} />
          <label className="text-sm text-ink-600">Feed type<select className="input mt-1" value={form.feed_type} onChange={(e) => setForm({ ...form, feed_type: e.target.value })}><option value="featured">Featured</option><option value="promotion">Promotion</option><option value="announcement">Announcement</option><option value="new_model">New model</option><option value="tutorial">Tutorial</option><option value="tip">Tip</option></select></label>
          <Field label="Display order" value={form.display_order} onChange={(v) => setForm({ ...form, display_order: v })} type="number" />
          <label className="md:col-span-2 text-sm text-ink-600">Description<textarea className="input mt-1 min-h-24" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
          <div className="md:col-span-2 flex flex-wrap gap-4 text-sm text-ink-600"><label><input type="checkbox" checked={form.is_featured} onChange={(e) => setForm({ ...form, is_featured: e.target.checked })} className="mr-2" />Featured</label><label><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="mr-2" />Publish immediately</label></div>
          <div className="md:col-span-2"><button className="btn-primary" disabled={saving || !form.title.trim()}>{saving ? "Publishing…" : "Publish showcase item"}</button></div>
        </form>
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-ink-100 p-5"><h2 className="text-base font-semibold text-ink-900">Published showcase</h2></div>
        {loading ? <div className="p-6 text-sm text-ink-400">Loading…</div> : items.length === 0 ? <div className="p-6 text-sm text-ink-400">Nothing published yet. This is where the real promotional work will appear.</div> : <div className="divide-y divide-ink-100">{items.map((item) => <div key={item.id} className="flex items-center justify-between gap-4 p-5"><div className="min-w-0"><div className="flex items-center gap-2"><span className="truncate text-sm font-semibold text-ink-900">{item.title}</span>{item.is_featured && <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-700">Featured</span>}</div><p className="mt-1 truncate text-xs text-ink-500">{item.feed_type} · {item.image_url || "No media URL"}</p></div><div className="flex shrink-0 gap-2"><button onClick={() => toggleFeed(item)} className="btn-secondary text-xs">{item.is_active ? "Unpublish" : "Publish"}</button><button onClick={() => deleteFeed(item.id)} className="rounded-lg px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50">Delete</button></div></div>)}</div>}
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-ink-100 p-5"><h2 className="text-base font-semibold text-ink-900">Hero promotions</h2><p className="mt-1 text-xs text-ink-500">Manage the large promotional banners shown ahead of the feed.</p></div>
        {banners.length === 0 ? <div className="p-6 text-sm text-ink-400">No hero promotions published yet.</div> : <div className="divide-y divide-ink-100">{banners.map((banner) => <div key={banner.id} className="flex items-center justify-between gap-4 p-5"><div><div className="text-sm font-semibold text-ink-900">{banner.title}</div><div className="mt-1 text-xs text-ink-500">{banner.image_url}</div></div><button onClick={() => toggleBanner(banner)} className="btn-secondary text-xs">{banner.is_active ? "Unpublish" : "Publish"}</button></div>)}</div>}
      </section>
    </div>
  );
}

function Field({ label, value, onChange, required, type = "text" }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; type?: string }) {
  return <label className="text-sm text-ink-600">{label}<input required={required} type={type} className="input mt-1" value={value} onChange={(e) => onChange(e.target.value)} /></label>;
}
