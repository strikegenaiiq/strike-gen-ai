import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/auth/AuthContext";
import { supabase } from "@/lib/supabase";
import { AppShell } from "./AppShell";

export function CreatorAdvisorPage() {
  const { session } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!session) return;
    const load = async () => {
      const { data } = await supabase.from("creator_advisor_settings").select("enabled").eq("id", true).maybeSingle();
      setEnabled(Boolean(data?.enabled));
    };
    void load();
  }, [session]);

  const send = async (event: FormEvent) => {
    event.preventDefault();
    if (!session || !prompt.trim() || sending || !enabled) return;
    setSending(true);
    setNotice(null);
    const text = prompt.trim();
    setPrompt("");
    setMessages((current) => [...current, { role: "user", content: text }]);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/creator-advisor`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Advisor request failed");
      setMessages((current) => [...current, { role: "assistant", content: data.message ?? "No response returned." }]);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSending(false);
    }
  };

  return (
    <AppShell title="Creator Advisor">
      <div className="mx-auto max-w-3xl space-y-6">
        <header>
          <p className="text-sm font-medium">Strike Gen Creator Advisor</p>
          <h1 className="mt-1 text-2xl font-semibold">Plan, improve, and move your next creation forward.</h1>
          <p className="mt-2 text-sm text-ink-500">Advisor usage is metered through the same credit economy as generation. It is never an unlimited free conversation.</p>
        </header>
        {!enabled ? (
          <div className="rounded-lg border p-5">
            <h2 className="font-medium">Creator Advisor is not available yet</h2>
            <p className="mt-2 text-sm text-ink-500">The service stays disabled until its provider model and verified pricing are configured.</p>
          </div>
        ) : (
          <>
            <div className="min-h-72 space-y-3 rounded-lg border p-4">
              {messages.length === 0 && <p className="text-sm text-ink-500">Ask about content planning, video ideas, scripts, consistency, or your next creator move.</p>}
              {messages.map((message, index) => (
                <div key={`${message.role}-${index}`} className="rounded-md bg-gray-50 p-3 text-sm">
                  <strong>{message.role === "user" ? "You" : "Strike Advisor"}</strong>
                  <p className="mt-1 whitespace-pre-wrap">{message.content}</p>
                </div>
              ))}
              {sending && <p className="text-sm text-ink-500">Thinking...</p>}
            </div>
            <form onSubmit={send} className="space-y-3">
              <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={4} className="w-full rounded-md border px-3 py-2" placeholder="What are you creating today?" disabled={sending} />
              {notice && <p className="text-sm text-red-600">{notice}</p>}
              <button type="submit" disabled={sending || !prompt.trim()} className="w-full rounded-md bg-black py-2 text-white disabled:opacity-50">{sending ? "Thinking..." : "Ask Strike Advisor"}</button>
            </form>
          </>
        )}
      </div>
    </AppShell>
  );
}
