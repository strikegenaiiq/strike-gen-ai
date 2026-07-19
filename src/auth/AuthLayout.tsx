import { type ReactNode } from "react";

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-brand-950 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand-700/40 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-brand-500/30 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-lg font-bold text-white backdrop-blur">
              A
            </div>
            <span className="text-lg font-semibold tracking-tight text-white">
              AI Studio
            </span>
          </div>
        </div>
        <div className="relative max-w-md animate-slide-up">
          <h2 className="text-3xl font-bold leading-tight text-white">
            Create stunning video, image, and audio with AI.
          </h2>
          <p className="mt-4 text-base text-brand-100">
            One workspace for every generation. Credits, projects, and assets —
            organized and ready to ship.
          </p>
        </div>
        <div className="relative text-sm text-brand-200">
          © {new Date().getFullYear()} AI Studio
        </div>
      </div>

      {/* Form panel */}
      <div className="flex flex-col items-center justify-center px-6 py-12 sm:px-12">
        <div className="w-full max-w-sm animate-fade-in">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-lg font-bold text-white">
              A
            </div>
            <span className="text-lg font-semibold tracking-tight text-ink-900">
              AI Studio
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900">
            {title}
          </h1>
          <p className="mt-1.5 text-sm text-ink-500">{subtitle}</p>
          <div className="mt-8">{children}</div>
          <div className="mt-6 text-center text-sm text-ink-500">{footer}</div>
        </div>
      </div>
    </div>
  );
}
