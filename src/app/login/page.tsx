import { login } from "./actions";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas p-4">
      <div className="w-full max-w-sm">
        {/* Brand mark */}
        <div className="mb-8 text-center">
          <div className="mb-5 inline-flex items-center gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-ink">
              KNBL
            </span>
            <span className="h-2 w-2 rounded-full bg-ink" />
          </div>
          <h1 className="text-lg font-bold tracking-tight text-ink">
            לוח תוכן
          </h1>
          <p className="mt-1 text-sm text-ink-muted">התחברות למערכת הניהול</p>
        </div>

        <div className="panel p-7">
          {searchParams.error && (
            <div className="mb-5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {searchParams.error}
            </div>
          )}

          <form action={login} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-xs font-medium text-ink-muted"
              >
                אימייל
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                dir="ltr"
                className="input text-left"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-xs font-medium text-ink-muted"
              >
                סיסמה
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                dir="ltr"
                className="input text-left"
                placeholder="••••••••"
              />
            </div>

            <button type="submit" className="btn-primary mt-2 w-full py-2.5">
              כניסה
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-ink-faint">
          KNBL · מערכת ניהול תוכן פנימית
        </p>
      </div>
    </main>
  );
}
