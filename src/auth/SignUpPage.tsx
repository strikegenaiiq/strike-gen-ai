import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { AuthLayout } from "./AuthLayout";
import { email, minLength, required, useField, validateAll } from "./validation";

function friendlyAuthError(message: string): string {
  if (message.includes("Invalid login credentials"))
    return "Incorrect email or password. Please try again.";
  if (message.includes("Email not confirmed"))
    return "Email not confirmed. Contact support if this persists.";
  if (message.includes("User already registered"))
    return "An account with this email already exists.";
  if (message.includes("rate limit") || message.includes("too many"))
    return "Too many attempts. Please wait a moment and try again.";
  if (message.includes("network") || message.includes("Failed to fetch"))
    return "Network error. Check your connection and try again.";
  return message;
}

export function SignUpPage() {
  const navigate = useNavigate();
  const name = useField("", required("Name"));
  const emailF = useField("", (v) => required("Email")(v) ?? email(v));
  const password = useField("", (v) => required("Password")(v) ?? minLength(8)(v));
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!validateAll([name, emailF, password])) return;

    setSubmitting(true);
    const { data, error } = await supabase.auth.signUp({
      email: emailF.value.trim(),
      password: password.value,
      options: { data: { display_name: name.value.trim() } },
    });

    if (error) {
      setFormError(friendlyAuthError(error.message));
      setSubmitting(false);
      return;
    }

    if (data.user) {
      await supabase.from("profiles").upsert({
        user_id: data.user.id,
        display_name: name.value.trim(),
        language: "en",
      });
    }

    if (data.session) {
      navigate("/app/profile", { replace: true });
    } else {
      navigate("/signin?registered=1", { replace: true });
    }
    setSubmitting(false);
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start with 10 free credits — no card required."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/signin" className="font-semibold text-brand-600 hover:text-brand-700">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div>
          <label className="label" htmlFor="name">Full name</label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            className="input"
            placeholder="Jane Creator"
            value={name.value}
            onChange={(e) => name.onChange(e.target.value)}
            onBlur={name.setTouched}
            aria-invalid={!!name.error}
          />
          {name.error && <p className="field-error">{name.error}</p>}
        </div>

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
            autoComplete="new-password"
            className="input"
            placeholder="At least 8 characters"
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
          {submitting ? "Creating account…" : "Create account"}
        </button>
      </form>
    </AuthLayout>
  );
}
