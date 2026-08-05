import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/auth/AuthContext";
import { AuthLayout } from "@/auth/AuthLayout";
import { SignInPage } from "@/auth/SignInPage";
import { SignUpPage } from "@/auth/SignUpPage";
import { AdminProvider } from "@/admin/AdminContext";
import { AdminLayout } from "@/admin/AdminLayout";
import { AdminOverview } from "@/admin/AdminOverview";
import { AdminUsers } from "@/admin/AdminUsers";
import { AdminPayments } from "@/admin/AdminPayments";
import { AdminAudit } from "@/admin/AdminAudit";
import { AdminFraud } from "@/admin/AdminFraud";
import { GeneratePage } from "@/app/GeneratePage";
import { ProfilePage } from "@/app/ProfilePage";
import { ProtectedRoute } from "@/app/ProtectedRoute";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AdminProvider>
          <Routes>
            <Route
              path="/signin"
              element={
                <AuthLayout
                  title="Welcome back"
                  subtitle="Sign in to continue to your studio."
                  footer={null}
                >
                  <SignInPage />
                </AuthLayout>
              }
            />
            <Route
              path="/signup"
              element={
                <AuthLayout
                  title="Create your account"
                  subtitle="Start creating with AI."
                  footer={null}
                >
                  <SignUpPage />
                </AuthLayout>
              }
            />

            <Route
              path="/app"
              element={
                <ProtectedRoute>
                  <Outlet />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="generate" replace />} />
              <Route path="generate" element={<GeneratePage />} />
              <Route path="profile" element={<ProfilePage />} />
            </Route>

            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="overview" replace />} />
              <Route path="overview" element={<AdminOverview />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="payments" element={<AdminPayments />} />
              <Route path="audit" element={<AdminAudit />} />
              <Route path="fraud" element={<AdminFraud />} />
            </Route>

            <Route path="/" element={<Navigate to="/app/generate" replace />} />
            <Route path="*" element={<Navigate to="/app/generate" replace />} />
          </Routes>
        </AdminProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export { App };
