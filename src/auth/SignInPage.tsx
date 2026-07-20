import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { AuthLayout } from "./AuthLayout";
import { email, required, useField, validateAll } from "./validation";

function friendlyAuthError(message: string): string {
  if (message.includes("Invalid login credentials"))
    return "Incorrect email or password. Please try again.";
  if (message.includes("Email not confirmed"))
    return "Email not confirmed. Contact support if this persists.";
  if (message.includes("rate limit") || message.includes("too many"))
    return "Too many attempts. Please wait a moment and try again.";
  if (message.includes("network") || message.includes("Failed to fetch"))
    return "Network error. Check your connection and try again.";
  return message;
}

export function SignInPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const justRegistered = searchParams.get("registered") === "1";
  const emailF = useField("", (v) => required("Email")(v) ?? email(v));
  const password = useField("", required("Password"));
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!validateAll([emailF, password])) return;

    setSubmitting(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailF.value.trim(),
      password: password.value,
    });

    if (error) {
      setFormError(friendlyAuthError(error.message));
      setSubmitting(false);
      return;
    }

    if (data.session) {
      navigate("/app/profile", { replace: true });
    }
    setSubmitting(false);
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to continue to your studio."
      footer={
        <>
          New to AI Studio?{" "}
          <Link to="/signup" className="font-semibold text-brand-600 hover:text-brand-700">
            Create an account
          </Link>
        </>
      }
    >
      {justRegistered && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-700">
          Account created. Sign in with your credentials.
        </div>
      )}
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className="input"
            placeholder="you@example.com"
            value={emailF.value}
            onChange={(e) => emailF.onChange(e.target.value)}
            onBlur={emailF.setTouched}
            aria-invalid={!!emailF.error}
          />
          {emailF.error && <p className="field-error">{emailF.error}</p>}
        </div>

        <div>
          <label className="label" htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            className="input"
            placeholder="Your password"
            value={password.value}
            onChange={(e) => password.onChange(e.target.value)}
            onBlur={password.setTouched}
            aria-invalid={!!password.error}
          />
          {password.error && <p className="field-error">{password.error}</p>}
        </div>

        {formError && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
            {formError}
          </div>
        )}

        <button type="submit" className="btn-primary w-full" disabled={submitting}>
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </AuthLayout>
  );
}
