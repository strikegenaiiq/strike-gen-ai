import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "@/auth/AuthContext";
import { AdminProvider } from "@/admin/AdminContext";
import { AdminLayout } from "@/admin/AdminLayout";
import { SignInPage } from "@/auth/SignInPage";
import { SignUpPage } from "@/auth/SignUpPage";
import { GeneratePage } from "@/app/GeneratePage";
import { ProfilePage } from "@/app/ProfilePage";
import { StudioHome } from "@/app/StudioHome";

function Protected({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-ink-200 border-t-brand-600" /></div>;
  }
  return session ? <>{children}</> : <Navigate to="/signin" replace />;
}

function AdminHome() {
  return (
    <div className="card p-6">
      <h1 className="text-xl font-semibold text-ink-900">Strike Command Center</h1>
      <p className="mt-2 text-sm text-ink-500">Admin workspace is protected and ready for the operational dashboard modules.</p>
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/signin" element={<SignInPage />} />
      <Route path="/signup" element={<SignUpPage />} />
      <Route path="/" element={<Navigate to="/app" replace />} />
      <Route path="/app" element={<Protected><StudioHome /></Protected>} />
      <Route path="/app/generate" element={<Protected><GeneratePage /></Protected>} />
      <Route path="/app/profile" element={<Protected><ProfilePage /></Protected>} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminHome />} />
      </Route>
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AdminProvider>
          <AppRoutes />
        </AdminProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
