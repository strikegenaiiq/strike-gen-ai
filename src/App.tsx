import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/auth/AuthContext";
import { AdminProvider } from "@/admin/AdminContext";
import { SignInPage } from "@/auth/SignInPage";
import { SignUpPage } from "@/auth/SignUpPage";
import { ProtectedRoute } from "@/app/ProtectedRoute";
import { ProfilePage } from "@/app/ProfilePage";
import { GeneratePage } from "@/app/GeneratePage";
import { PricingPage } from "@/app/PricingPage";
import { AdminLayout } from "@/admin/AdminLayout";
import { AdminOverview } from "@/admin/AdminOverview";
import { AdminUsers } from "@/admin/AdminUsers";
import { AdminPayments } from "@/admin/AdminPayments";
import { AdminFraud } from "@/admin/AdminFraud";
import { AdminAudit } from "@/admin/AdminAudit";

export function App() {
  return (
    <AuthProvider>
      <AdminProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/app/profile" replace />} />
            <Route path="/signin" element={<SignInPage />} />
            <Route path="/signup" element={<SignUpPage />} />

            <Route
              path="/app/*"
              element={
                <ProtectedRoute>
                  <Routes>
                    <Route path="generate" element={<GeneratePage />} />
                    <Route path="pricing" element={<PricingPage />} />
                    <Route path="profile" element={<ProfilePage />} />
                    <Route path="*" element={<Navigate to="/app/generate" replace />} />
                  </Routes>
                </ProtectedRoute>
              }
            />

            <Route path="/admin/*" element={<AdminLayout />}>
              <Route index element={<AdminOverview />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="payments" element={<AdminPayments />} />
              <Route path="fraud" element={<AdminFraud />} />
              <Route path="audit" element={<AdminAudit />} />
            </Route>

            <Route path="*" element={<Navigate to="/app/generate" replace />} />
          </Routes>
        </BrowserRouter>
      </AdminProvider>
    </AuthProvider>
  );
}
