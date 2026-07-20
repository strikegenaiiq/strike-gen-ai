import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/auth/AuthContext";
import { AdminProvider } from "@/admin/AdminContext";
import { SignInPage } from "@/auth/SignInPage";
import { SignUpPage } from "@/auth/SignUpPage";
import { ProtectedRoute } from "@/app/ProtectedRoute";
import { ProfilePage } from "@/app/ProfilePage";
import { AdminLayout } from "@/admin/AdminLayout";
import { AdminOverview } from "@/admin/AdminOverview";
import { AdminUsers } from "@/admin/AdminUsers";
import { AdminPayments } from "@/admin/AdminPayments";
import { AdminFraud } from "@/admin/AdminFraud";
import { AdminAudit } from "@/admin/AdminAudit";

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/app/profile" replace />} />
          <Route path="/signin" element={<SignInPage />} />
          <Route path="/signup" element={<SignUpPage />} />

          {/* User app */}
          <Route
            path="/app/*"
            element={
              <ProtectedRoute>
                <Routes>
                  <Route path="profile" element={<ProfilePage />} />
                  <Route path="*" element={<Navigate to="/app/profile" replace />} />
                </Routes>
              </ProtectedRoute>
            }
          />

          {/* Admin console */}
          <Route
            path="/admin/*"
            element={
              <AdminProvider>
                <AdminLayout />
              </AdminProvider>
            }
          >
            <Route index element={<AdminOverview />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="payments" element={<AdminPayments />} />
            <Route path="fraud" element={<AdminFraud />} />
            <Route path="audit" element={<AdminAudit />} />
          </Route>

          <Route path="*" element={<Navigate to="/app/profile" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
