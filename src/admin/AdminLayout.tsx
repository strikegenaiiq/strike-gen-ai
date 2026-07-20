import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { useAdmin } from "./AdminContext";
import { AdminSidebar } from "./AdminSidebar";

export function AdminLayout() {
  const { session, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const location = useLocation();

  if (authLoading || adminLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink-200 border-t-brand-600" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/signin" replace state={{ from: location.pathname }} />;
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="card max-w-md p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-2xl">
            !
          </div>
          <h1 className="mt-4 text-lg font-semibold text-ink-900">
            Access denied
          </h1>
          <p className="mt-2 text-sm text-ink-500">
            You need administrator privileges to view this page.
          </p>
          <a href="/app/profile" className="btn-secondary mt-6 inline-flex">
            Back to your profile
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-50 lg:flex">
      <AdminSidebar />
      <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}
