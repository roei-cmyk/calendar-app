"use client";

import { useEffect, useState } from "react";

type TrendItem = { trend: string; tip: string };
type AIIdea = { title: string; desc: string };

type TrendsData = {
  date: string;
  instagram: TrendItem[];
  tiktok: TrendItem[];
  facebook: TrendItem[];
  ai_ideas: AIIdea[];
  hot_format: string;
};

const PLATFORM_STYLE: Record<string, { bg: string; color: string; icon: string }> = {
  instagram: { bg: "rgba(225,48,108,0.12)", color: "#e1306c", icon: "📸" },
  tiktok:    { bg: "rgba(105,201,208,0.12)", color: "#69c9d0", icon: "🎵" },
  facebook:  { bg: "rgba(24,119,242,0.12)", color: "#1877f2", icon: "👥" },
};

function PlatformSection({ label, items, platform }: { label: string; items: TrendItem[]; platform: string }) {
  const s = PLATFORM_STYLE[platform];
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2">
        <span>{s.icon}</span>
        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: s.color }}>{label}</span>
      </div>
      <div className="flex flex-col gap-2">
        {items.map((item, i) => (
          <div key={i} className="rounded-xl p-3" style={{ background: s.bg, border: `1px solid ${s.color}22` }}>
            <div className="text-sm font-semibold mb-0.5" style={{ color: "#e9d5ff" }}>🔥 {item.trend}</div>
            <div className="text-xs leading-relaxed" style={{ color: "rgba(196,181,253,0.7)" }}>{item.tip}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TrendPanel({ onClose }: { onClose: () => void }) {
  const [data, setData] = useState<TrendsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/trends")
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { setError("שגיאה בטעינת הטרנדים"); setLoading(false); });
  }, []);

  return (
    <div
      className="fixed inset-y-0 right-0 z-50 flex flex-col"
      style={{
        width: 360,
        background: "#0d0620",
        borderLeft: "1px solid rgba(124,58,237,0.3)",
        boxShadow: "-20px 0 60px rgba(0,0,0,0.6)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4 shrink-0"
        style={{ borderBottom: "1px solid rgba(124,58,237,0.2)" }}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">✨</span>
          <div>
            <div className="text-sm font-bold text-white">טרנדים חמים</div>
            {data?.date && (
              <div className="text-[10px]" style={{ color: "rgba(167,139,250,0.5)" }}>{data.date}</div>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-white transition-colors text-2xl leading-none"
        >×</button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-4" dir="rtl">
        {loading && (
          <div className="flex flex-col items-center justify-center h-full gap-3 opacity-50">
            <div className="flex gap-1.5">
              {[0,1,2].map(i => (
                <div key={i} className="w-2 h-2 rounded-full animate-bounce" style={{ background: "#7c3aed", animationDelay: `${i*0.15}s` }} />
              ))}
            </div>
            <p className="text-xs" style={{ color: "#9ca3af" }}>סורק טרנדים...</p>
          </div>
        )}

        {error && (
          <div className="text-xs text-red-400 text-center py-8">{error}</div>
        )}

        {data && !loading && (
          <>
            {/* Hot format pill */}
            {data.hot_format && (
              <div
                className="mb-5 rounded-xl px-4 py-3 text-sm font-semibold text-center"
                style={{ background: "linear-gradient(135deg,rgba(124,58,237,0.3),rgba(236,72,153,0.2))", border: "1px solid rgba(124,58,237,0.35)", color: "#e9d5ff" }}
              >
                🏆 הפורמט הכי חם עכשיו: {data.hot_format}
              </div>
            )}

            <PlatformSection label="אינסטגרם" items={data.instagram ?? []} platform="instagram" />
            <PlatformSection label="טיקטוק"   items={data.tiktok ?? []}    platform="tiktok" />
            <PlatformSection label="פייסבוק"  items={data.facebook ?? []}  platform="facebook" />

            {/* AI ideas */}
            {(data.ai_ideas ?? []).length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span>🤖</span>
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "#a78bfa" }}>רעיונות AI Production</span>
                </div>
                <div className="flex flex-col gap-2">
                  {data.ai_ideas.map((idea, i) => (
                    <div key={i} className="rounded-xl p-3" style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)" }}>
                      <div className="text-sm font-semibold mb-0.5" style={{ color: "#c4b5fd" }}>✦ {idea.title}</div>
                      <div className="text-xs leading-relaxed" style={{ color: "rgba(196,181,253,0.7)" }}>{idea.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Refresh footer */}
      {!loading && (
        <div className="shrink-0 px-4 py-3" style={{ borderTop: "1px solid rgba(124,58,237,0.15)" }}>
          <button
            onClick={() => { setLoading(true); setData(null); setError(null);
              fetch("/api/trends").then(r => r.json()).then(d => { setData(d); setLoading(false); }).catch(() => { setError("שגיאה"); setLoading(false); });
            }}
            className="w-full py-2 rounded-xl text-xs font-semibold transition-all"
            style={{ background: "rgba(124,58,237,0.15)", color: "#a78bfa", border: "1px solid rgba(124,58,237,0.25)" }}
          >
            ↺ רענן טרנדים
          </button>
        </div>
      )}
    </div>
  );
}
