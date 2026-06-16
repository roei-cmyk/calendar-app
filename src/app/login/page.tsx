import { login } from "./actions";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <main
      className="relative flex min-h-screen items-center justify-center overflow-hidden p-4"
      style={{
        background:
          "radial-gradient(ellipse at 25% 35%, #3b0764 0%, transparent 55%), radial-gradient(ellipse at 75% 65%, #1e1b4b 0%, transparent 50%), radial-gradient(ellipse at 60% 15%, #2e1065 0%, transparent 40%), #070412",
      }}
    >
      {/* Diagonal light streaks */}
      <span
        className="pointer-events-none absolute"
        style={{
          width: 2,
          height: "55vh",
          top: "5%",
          left: "42%",
          background: "linear-gradient(180deg, transparent 0%, rgba(139,92,246,0.7) 40%, rgba(167,139,250,0.3) 70%, transparent 100%)",
          transform: "rotate(35deg)",
          transformOrigin: "top center",
        }}
      />
      <span
        className="pointer-events-none absolute"
        style={{
          width: 1,
          height: "40vh",
          top: "15%",
          left: "56%",
          background: "linear-gradient(180deg, transparent 0%, rgba(167,139,250,0.4) 50%, transparent 100%)",
          transform: "rotate(35deg)",
          transformOrigin: "top center",
        }}
      />
      <span
        className="pointer-events-none absolute"
        style={{
          width: 1,
          height: "65vh",
          top: "0%",
          left: "64%",
          background: "linear-gradient(180deg, transparent 0%, rgba(124,58,237,0.25) 50%, transparent 100%)",
          transform: "rotate(35deg)",
          transformOrigin: "top center",
        }}
      />

      {/* Glow dots */}
      <span className="pointer-events-none absolute" style={{ top: "14%", right: "18%", width: 4, height: 4, borderRadius: "50%", background: "#a78bfa", boxShadow: "0 0 12px 3px rgba(124,58,237,0.7)" }} />
      <span className="pointer-events-none absolute" style={{ top: "28%", left: "14%", width: 3, height: 3, borderRadius: "50%", background: "#c4b5fd", boxShadow: "0 0 8px 2px rgba(167,139,250,0.5)" }} />
      <span className="pointer-events-none absolute" style={{ bottom: "22%", right: "25%", width: 3, height: 3, borderRadius: "50%", background: "#a78bfa", boxShadow: "0 0 8px 2px rgba(124,58,237,0.5)" }} />
      <span className="pointer-events-none absolute" style={{ bottom: "38%", left: "20%", width: 2, height: 2, borderRadius: "50%", background: "#ddd6fe", boxShadow: "0 0 6px rgba(167,139,250,0.6)" }} />

      <div className="relative w-full max-w-sm">
        {/* Brand mark — metallic KNBL */}
        <div className="mb-8 text-center">
          <div className="mb-2 text-[11px] font-medium tracking-[0.35em] uppercase" style={{ color: "rgba(167,139,250,0.55)" }}>
            content planning studio
          </div>
          <h1
            className="text-7xl font-black tracking-tighter leading-none select-none"
            style={{
              background: "linear-gradient(135deg, #ffffff 0%, #c4b5fd 18%, #ffffff 36%, #7c3aed 52%, #c4b5fd 68%, #ffffff 82%, #a78bfa 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              filter: "drop-shadow(0 0 28px rgba(124,58,237,0.55))",
            }}
          >
            KNBL
          </h1>
          <div className="mt-2 text-[11px] font-medium tracking-[0.5em] uppercase" style={{ color: "rgba(167,139,250,0.45)" }}>
            לוח תוכן
          </div>
        </div>

        {/* Login card */}
        <div
          className="rounded-2xl p-7 shadow-2xl"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "0.5px solid rgba(167,139,250,0.25)",
            backdropFilter: "blur(16px)",
          }}
        >
          {searchParams.error && (
            <div
              className="mb-5 rounded-lg px-3 py-2 text-sm text-white"
              style={{ background: "rgba(239,68,68,0.2)", border: "0.5px solid rgba(239,68,68,0.4)" }}
            >
              {searchParams.error}
            </div>
          )}

          <form action={login} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-xs font-medium" style={{ color: "rgba(167,139,250,0.7)" }}>
                אימייל
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                dir="ltr"
                className="w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-white/25"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "0.5px solid rgba(167,139,250,0.25)",
                }}
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-xs font-medium" style={{ color: "rgba(167,139,250,0.7)" }}>
                סיסמה
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                dir="ltr"
                className="w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-white/25"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "0.5px solid rgba(167,139,250,0.25)",
                }}
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              className="mt-2 w-full rounded-xl py-3 text-sm font-bold text-white transition active:scale-95"
              style={{
                background: "linear-gradient(135deg, #4c1d95 0%, #7c3aed 100%)",
                boxShadow: "0 4px 24px rgba(124,58,237,0.5)",
              }}
            >
              כניסה
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-[10px] tracking-widest uppercase" style={{ color: "rgba(167,139,250,0.25)" }}>
          KNBL · מערכת ניהול תוכן
        </p>
      </div>
    </main>
  );
}
