import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { AppShell } from "./AppShell";

type ShowcaseItem = {
  id: string;
  title: string | null;
  subtitle: string | null;
  description: string | null;
  image_url: string | null;
  feed_type: string | null;
  action_label: string | null;
  action_url: string | null;
  badge: string | null;
  metadata: Record<string, unknown> | null;
};

function mediaType(item: ShowcaseItem) {
  const value = String(item.metadata?.media_type ?? item.metadata?.type ?? item.feed_type ?? "image").toLowerCase();
  return value.includes("video") ? "video" : "image";
}

function videoUrl(item: ShowcaseItem) {
  const value = item.metadata?.video_url ?? item.metadata?.media_url;
  return typeof value === "string" ? value : null;
}

export function ShowcasePage() {
  const [items, setItems] = useState<ShowcaseItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    supabase
      .from("discovery_feed")
      .select("id, title, subtitle, description, image_url, feed_type, action_label, action_url, badge, metadata")
      .eq("is_active", true)
      .eq("is_featured", true)
      .order("display_order", { ascending: true })
      .limit(24)
      .then(({ data }) => {
        if (active) setItems((data ?? []) as ShowcaseItem[]);
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <AppShell title="See what Strike can create">
      <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-br from-cyan-400/[0.12] via-white/[0.04] to-fuchsia-400/[0.10] p-6 shadow-2xl shadow-black/30 sm:p-10">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-cyan-300/10 blur-3xl" />
        <div className="relative max-w-2xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/40">Strike Showcase</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">Seeing is believing.</h2>
          <p className="mt-4 max-w-xl text-sm leading-7 text-white/50 sm:text-base">
            Explore featured creations and get inspired by what the studio can make. Your own generations can become part of this space when the admin team publishes them.
          </p>
          <Link to="/app/generate" className="mt-6 inline-flex rounded-2xl bg-white px-5 py-3 text-sm font-bold text-black transition hover:bg-white/90">
            Create something
          </Link>
        </div>
      </section>

      <section className="mt-8">
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((item) => <div key={item} className="aspect-video animate-pulse rounded-3xl bg-white/[0.05]" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.025] px-6 py-14 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-lg">✦</div>
            <h3 className="mt-4 text-lg font-semibold">The showcase is being prepared</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/35">
              There are no featured creations published yet. The admin Content Studio will be able to populate this feed with promotional work and selected community creations.
            </p>
            <Link to="/app/generate" className="mt-5 inline-flex text-sm font-semibold text-white underline underline-offset-4">Start creating</Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => {
              const video = videoUrl(item);
              const type = mediaType(item);
              return (
                <article key={item.id} className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04]">
                  <div className="aspect-video bg-black">
                    {type === "video" && video ? (
                      <video src={video} controls preload="metadata" className="h-full w-full object-cover" />
                    ) : item.image_url ? (
                      <img src={item.image_url} alt={item.title ?? "Strike creation"} loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-white/20">Strike creation</div>
                    )}
                  </div>
                  <div className="p-5">
                    {item.badge && <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-200/70">{item.badge}</span>}
                    <h3 className="mt-2 font-semibold">{item.title ?? "Untitled creation"}</h3>
                    {item.subtitle && <p className="mt-1 text-xs text-white/40">{item.subtitle}</p>}
                    {item.description && <p className="mt-3 line-clamp-3 text-sm leading-6 text-white/40">{item.description}</p>}
                    {item.action_url && item.action_label && <a href={item.action_url} className="mt-4 inline-flex text-sm font-semibold text-white underline underline-offset-4">{item.action_label}</a>}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </AppShell>
  );
}
