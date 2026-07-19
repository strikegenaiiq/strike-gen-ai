import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/auth/AuthContext";
import { SignInPage } from "@/auth/SignInPage";
import { SignUpPage } from "@/auth/SignUpPage";
import { ProtectedRoute } from "@/app/ProtectedRoute";
import { ProfilePage } from "@/app/ProfilePage";

export function App() {
  return (
    <AuthProvider>
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
                  <Route path="profile" element={<ProfilePage />} />
                  <Route path="*" element={<Navigate to="/app/profile" replace />} />
                </Routes>
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/app/profile" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
