import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/auth/AuthContext";
import { SignInPage } from "@/auth/SignInPage";
import { SignUpPage } from "@/auth/SignUpPage";
import { AdminProvider } from "@/admin/AdminContext";
import { GeneratePage } from "@/app/GeneratePage";
import { ProfilePage } from "@/app/ProfilePage";
import { ProtectedRoute } from "@/app/ProtectedRoute";

function ProtectedApp() {
  return (
    <ProtectedRoute>
      <Outlet />
    </ProtectedRoute>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AdminProvider>
          <Routes>
            <Route path="/signin" element={<SignInPage />} />
            <Route path="/signup" element={<SignUpPage />} />

            <Route path="/app" element={<ProtectedApp />}>
              <Route index element={<Navigate to="generate" replace />} />
              <Route path="generate" element={<GeneratePage />} />
              <Route path="profile" element={<ProfilePage />} />
            </Route>

            <Route path="/" element={<Navigate to="/app/generate" replace />} />
            <Route path="*" element={<Navigate to="/app/generate" replace />} />
          </Routes>
        </AdminProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
