import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { useAdmin } from "@/admin/AdminContext";
import { StudioDraftBridge } from "./StudioDraftBridge";

export function AppShell({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  const { user, profile, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();

  const onSignOut = async () => {
    await signOut();
    navigate("/signin", { replace: true });
  };

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()
    : (user?.email?.[0] ?? "?").toUpperCase();

  return (
    <div className="min-h-screen bg-[#08090b] text-white">
      <StudioDraftBridge />
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#08090b]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <NavLink to="/app/showcase" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-sm font-black text-black shadow-lg shadow-white/10">
              S
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight">Strike Studio</div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-white/40">Create without limits</div>
            </div>
          </NavLink>

          <nav className="flex items-center gap-1">
            <NavLink
              to="/app/showcase"
              className={({ isActive }) =>
                `rounded-xl px-3 py-2 text-sm font-medium transition ${isActive ? "bg-white/10 text-white" : "text-white/55 hover:bg-white/5 hover:text-white"}`
              }
            >
              Explore
            </NavLink>
            <NavLink
              to="/app/generate"
              className={({ isActive }) =>
                `rounded-xl px-3 py-2 text-sm font-medium transition ${isActive ? "bg-white/10 text-white" : "text-white/55 hover:bg-white/5 hover:text-white"}`
              }
            >
              Create
            </NavLink>
            <NavLink
              to="/app/pricing"
              className={({ isActive }) =>
                `rounded-xl px-3 py-2 text-sm font-medium transition ${isActive ? "bg-white/10 text-white" : "text-white/55 hover:bg-white/5 hover:text-white"}`
              }
            >
              Credits
            </NavLink>
            <NavLink
              to="/app/profile"
              className={({ isActive }) =>
                `rounded-xl px-3 py-2 text-sm font-medium transition ${isActive ? "bg-white/10 text-white" : "text-white/55 hover:bg-white/5 hover:text-white"}`
              }
            >
              Profile
            </NavLink>
            {isAdmin && (
              <NavLink
                to="/admin"
                className="ml-1 rounded-xl px-3 py-2 text-sm font-medium text-white/55 hover:bg-white/5 hover:text-white"
              >
                Admin
              </NavLink>
            )}
            <div className="ml-2 flex items-center gap-2 border-l border-white/10 pl-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-white">
                {initials}
              </div>
              <button onClick={onSignOut} className="hidden rounded-xl px-2.5 py-1.5 text-xs text-white/50 transition hover:bg-white/5 hover:text-white sm:block">
                Sign out
              </button>
            </div>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-6">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/35">Strike Studio</p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        </div>
        {children}
      </main>
    </div>
  );
}
