import { login } from "./actions";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden p-4"
      style={{
        background: "radial-gradient(ellipse 120% 80% at 60% 0%, #ede9fe 0%, #c4b5fd 30%, #7c3aed 70%, #4c1d95 100%)",
      }}
    >
      {/* Decorative dots */}
      <span className="pointer-events-none absolute right-[8%] top-[12%] h-48 w-48 rounded-full opacity-20"
        style={{ background: "radial-gradient(circle, #a78bfa, transparent 70%)" }} />
      <span className="pointer-events-none absolute left-[5%] bottom-[15%] h-64 w-64 rounded-full opacity-15"
        style={{ background: "radial-gradient(circle, #c4b5fd, transparent 70%)" }} />
      <span className="pointer-events-none absolute right-[20%] bottom-[8%] h-28 w-28 rounded-full opacity-25"
        style={{ background: "radial-gradient(circle, #ddd6fe, transparent 70%)" }} />
      <span className="pointer-events-none absolute left-[25%] top-[6%] h-16 w-16 rounded-full bg-violet-400 opacity-20" />
      <span className="pointer-events-none absolute right-[35%] top-[30%] h-5 w-5 rounded-full bg-white opacity-30" />
      <span className="pointer-events-none absolute left-[15%] top-[40%] h-8 w-8 rounded-full bg-violet-300 opacity-25" />
      <span className="pointer-events-none absolute right-[10%] bottom-[35%] h-10 w-10 rounded-full bg-violet-200 opacity-20" />

      <div className="relative w-full max-w-sm">
        {/* Brand mark */}
        <div className="mb-8 text-center">
          <div className="mb-5 inline-flex items-center gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-white drop-shadow">
              KNBL
            </span>
            <span className="h-2.5 w-2.5 rounded-full bg-white opacity-80" />
          </div>
          <h1 className="text-lg font-bold tracking-tight text-white/90">
            לוח תוכן
          </h1>
          <p className="mt-1 text-sm text-white/60">התחברות למערכת הניהול</p>
        </div>

        <div className="rounded-2xl border border-white/20 bg-white/10 p-7 shadow-xl backdrop-blur-md">
          {searchParams.error && (
            <div className="mb-5 rounded-lg border border-rose-300/50 bg-rose-500/20 px-3 py-2 text-sm text-white">
              {searchParams.error}
            </div>
          )}

          <form action={login} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-xs font-medium text-white/70"
              >
                אימייל
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                dir="ltr"
                className="w-full rounded-lg border border-white/20 bg-white/15 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-white/40 focus:border-white/50 focus:bg-white/20 focus:ring-1 focus:ring-white/30"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-xs font-medium text-white/70"
              >
                סיסמה
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                dir="ltr"
                className="w-full rounded-lg border border-white/20 bg-white/15 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-white/40 focus:border-white/50 focus:bg-white/20 focus:ring-1 focus:ring-white/30"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              className="mt-2 w-full rounded-full bg-white py-2.5 text-sm font-semibold text-violet-700 shadow-lg transition hover:bg-violet-50 active:scale-95"
            >
              כניסה
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-white/40">
          KNBL · מערכת ניהול תוכן פנימית
        </p>
      </div>
    </main>
  );
}
