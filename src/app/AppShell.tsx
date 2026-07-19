import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";

export function AppShell({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const onSignOut = async () => {
    await signOut();
    navigate("/signin", { replace: true });
  };

  const initials =
    profile?.display_name
      ? profile.display_name
          .split(" ")
          .map((p) => p[0])
          .slice(0, 2)
          .join("")
          .toUpperCase()
      : (user?.email?.[0] ?? "?").toUpperCase();

  return (
    <div className="min-h-screen bg-ink-50">
      <header className="sticky top-0 z-20 border-b border-ink-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
              A
            </div>
            <span className="text-base font-semibold tracking-tight text-ink-900">
              AI Studio
            </span>
          </div>
          <nav className="flex items-center gap-1">
            <NavLink
              to="/app/profile"
              className={({ isActive }) =>
                `rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-brand-50 text-brand-700"
                    : "text-ink-600 hover:bg-ink-100 hover:text-ink-900"
                }`
              }
            >
              Profile
            </NavLink>
            <div className="ml-2 flex items-center gap-2.5 border-l border-ink-200 pl-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
                {initials}
              </div>
              <button
                onClick={onSignOut}
                className="btn-ghost px-2.5 py-1.5 text-xs"
              >
                Sign out
              </button>
            </div>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <h1 className="text-xl font-bold tracking-tight text-ink-900">{title}</h1>
        <div className="mt-6">{children}</div>
      </main>
    </div>
  );
}
