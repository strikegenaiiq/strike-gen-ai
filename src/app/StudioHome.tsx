import { Link } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { AppShell } from "./AppShell";

const actions = [
  { title: "Create video", text: "Turn a prompt into a video with the models available on your plan.", to: "/app/generate" },
  { title: "Creator Advisor", text: "The usage-based planning assistant is the next studio tool being connected.", to: "/app/profile" },
  { title: "Projects", text: "Your generated work and saved drafts will stay together as the project layer is completed.", to: "/app/generate" },
];

export function StudioHome() {
  const { profile } = useAuth();
  const firstName = profile?.full_name?.trim().split(/\s+/)[0] ?? "creator";

  return (
    <AppShell title="Studio">
      <div className="space-y-8">
        <section className="overflow-hidden rounded-2xl bg-ink-900 px-6 py-8 text-white sm:px-8">
          <p className="text-sm font-medium text-brand-200">Strike Gen AI</p>
          <h2 className="mt-2 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">Welcome back, {firstName}.</h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-ink-200 sm:text-base">
            Create, plan and refine your next piece of content from one focused workspace. Your plan controls the models you can use and the backend controls the real credit charge.
          </p>
          <Link to="/app/generate" className="btn-primary mt-6 inline-flex">Start creating</Link>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink-900">Your creative workspace</h2>
          <p className="mt-1 text-sm text-ink-500">The tools we are building around the creator workflow.</p>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {actions.map((action) => (
              <Link key={action.title} to={action.to} className="card group p-5 transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 font-semibold text-brand-700">S</div>
                <h3 className="mt-4 font-semibold text-ink-900 group-hover:text-brand-700">{action.title}</h3>
                <p className="mt-2 text-sm leading-5 text-ink-500">{action.text}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="card p-6">
          <h2 className="text-lg font-semibold text-ink-900">Seeing is believing</h2>
          <p className="mt-1 text-sm text-ink-500">Generated work first, explanations second. This becomes the showcase layer for Strike.</p>
          <div className="mt-5 grid min-h-48 place-items-center rounded-xl border border-dashed border-ink-200 bg-ink-50 p-8 text-center">
            <div>
              <p className="font-medium text-ink-700">Your generated showcase is coming together.</p>
              <p className="mt-1 text-sm text-ink-500">The public showcase feed will be connected after the creator workflow is complete.</p>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
