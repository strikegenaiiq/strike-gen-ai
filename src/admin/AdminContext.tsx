import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthContext";

type AdminContextValue = {
  isAdmin: boolean;
  role: string | null;
  permissions: Record<string, unknown> | null;
  loading: boolean;
};

const AdminContext = createContext<AdminContextValue | undefined>(undefined);

export function AdminProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      setRole(null);
      setPermissions(null);
      setLoading(false);
      return;
    }

    (async () => {
      const { data, error } = await supabase
        .from("admin_users")
        .select("role, permissions, is_active")
        .eq("profile_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (error) {
        console.error("Admin check failed:", error.message);
        setIsAdmin(false);
        setRole(null);
        setPermissions(null);
      } else {
        setIsAdmin(!!data);
        setRole(data?.role ?? null);
        setPermissions(data?.permissions ?? null);
      }
      setLoading(false);
    })();
  }, [user?.id]);

  return (
    <AdminContext.Provider value={{ isAdmin, role, permissions, loading }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used within AdminProvider");
  return ctx;
}
