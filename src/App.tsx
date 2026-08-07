import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "@/auth/AuthContext";
import { AdminProvider } from "@/admin/AdminContext";
import { AdminLayout } from "@/admin/AdminLayout";
import { SignInPage } from "@/auth/SignInPage";
import { SignUpPage } from "@/auth/SignUpPage";
import { GeneratePage } from "@/app/GeneratePage";
import { CreatorAdvisorPage } from "@/app/CreatorAdvisorPage";
import { CreditsPage } from "@/app/CreditsPage";
import { PlansPage } from "@/app/PlansPage";
import { ProfilePage } from "@/app/ProfilePage";
import { StudioHome } from "@/app/StudioHome";
import { AdminOperationsPage } from "@/app/AdminOperationsPage";

function Protected({ children }: { children: React.ReactNode }) { const { session, loading } = useAuth(); if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-ink-200 border-t-brand-600" /></div>; return session ? <>{children}</> : <Navigate to="/signin" replace />; }
function AppRoutes() { return <Routes><Route path="/signin" element={<SignInPage />} /><Route path="/signup" element={<SignUpPage />} /><Route path="/" element={<Navigate to="/app" replace />} /><Route path="/app" element={<Protected><StudioHome /></Protected>} /><Route path="/app/generate" element={<Protected><GeneratePage /></Protected>} /><Route path="/app/advisor" element={<Protected><CreatorAdvisorPage /></Protected>} /><Route path="/app/credits" element={<Protected><CreditsPage /></Protected>} /><Route path="/app/plans" element={<Protected><PlansPage /></Protected>} /><Route path="/app/profile" element={<Protected><ProfilePage /></Protected>} /><Route path="/admin" element={<AdminLayout />}><Route index element={<AdminOperationsPage />} /></Route><Route path="*" element={<Navigate to="/app" replace />} /></Routes>; }
export function App() { return <BrowserRouter><AuthProvider><AdminProvider><AppRoutes /></AdminProvider></AuthProvider></BrowserRouter>; }
