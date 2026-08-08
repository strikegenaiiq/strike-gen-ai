import { useState } from "react";
import { supabase } from "@/lib/supabase";

export function GoogleAuthButton({ label }: { label: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signInWithGoogle = async () => {
    setLoading(true);
    setError(null);
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/app/profile`,
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={signInWithGoogle}
        disabled={loading}
        className="flex w-full items-center justify-center gap-3 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-60"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
          <path fill="#4285F4" d="M21.35 12.23c0-.72-.06-1.42-.18-2.09H12v3.96h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.69 2.91-4.18 2.91-7.26Z" />
          <path fill="#34A853" d="M12 21.67c2.63 0 4.84-.87 6.46-2.36l-3.14-2.45c-.87.58-1.98.92-3.32.92-2.55 0-4.71-1.72-5.49-4.03H3.27v2.53A9.75 9.75 0 0 0 12 21.67Z" />
          <path fill="#FBBC05" d="M6.51 13.75A5.86 5.86 0 0 1 6.2 12c0-.61.11-1.2.31-1.75V7.72H3.27A9.76 9.76 0 0 0 2.25 12c0 1.57.38 3.05 1.02 4.28l3.24-2.53Z" />
          <path fill="#EA4335" d="M12 6.22c1.43 0 2.71.49 3.73 1.46l2.8-2.8C16.84 3.31 14.63 2.33 12 2.33a9.75 9.75 0 0 0-8.73 5.39l3.24 2.53c.78-2.31 2.94-4.03 5.49-4.03Z" />
        </svg>
        {loading ? "Connecting to Google…" : label}
      </button>
      {error && <p className="mt-2 text-center text-xs text-rose-600">{error}</p>}
    </div>
  );
}
