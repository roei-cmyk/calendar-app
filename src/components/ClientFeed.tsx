"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { addMonths, isSameMonth, isToday } from "date-fns";
import type { Comment, Post, Profile } from "@/lib/types";
import { monthGridDays, toISODate, formatHebDate, HEB_WEEKDAY_SHORT } from "@/lib/date";
import { fetchPosts, fetchComments } from "@/lib/posts";
import { logout } from "@/app/login/actions";

const PLATFORM_ICON: Record<string, string> = {
  facebook: "📘", פייסבוק: "📘",
  instagram: "📸", אינסטגרם: "📸",
  tiktok: "🎵", טיקטוק: "🎵",
  linkedin: "💼", לינקדאין: "💼",
  twitter: "𝕏",
};

const PLATFORM_NAME: Record<string, string> = {
  facebook: "פייסבוק", instagram: "אינסטגרם",
  tiktok: "טיקטוק", linkedin: "לינקדאין", twitter: "טוויטר",
};

const PLATFORM_COLOR: Record<string, string> = {
  facebook: "#1877f2", instagram: "#e1306c",
  tiktok: "#010101", linkedin: "#0a66c2", twitter: "#1da1f2",
};

const STATUS_DOT: Record<string, string> = {
  draft:     "#9ca3af",
  pending:   "#f59e0b",
  approved:  "#10b981",
  scheduled: "#3b82f6",
  published: "#8b5cf6",
};

const STATUS_LABEL: Record<string, string> = {
  draft:     "טיוטה",
  pending:   "ממתין לאישור",
  approved:  "✓ מאושר",
  scheduled: "מתוזמן",
  published: "פורסם",
};

export function ClientFeed({
  profile,
  clientName,
  onClose,
}: {
  profile: Profile;
  clientName: string;
  onClose?: () => void;
}) {
  const [current, setCurrent] = useState(() => new Date());
  const [posts, setPosts]     = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Post | null>(null);

  const days = useMemo(() => monthGridDays(current), [current]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const from = toISODate(days[0]);
      const to   = toISODate(days[days.length - 1]);
      const data = await fetchPosts({ from, to, clientId: profile.client_id });
      setPosts(data);
    } finally {
      setLoading(false);
    }
  }, [days, profile.client_id]);

  useEffect(() => { load(); }, [load]);

  const postsByDate = useMemo(() => {
    const map = new Map<string, Post[]>();
    for (const p of posts) {
      const arr = map.get(p.scheduled_date) ?? [];
      arr.push(p);
      map.set(p.scheduled_date, arr);
    }
    return map;
  }, [posts]);

  const pending = posts.filter(p => p.status === "pending").length;

  return (
    <div
      className="flex h-screen flex-col overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #0f0630 0%, #2d1270 30%, #4c1d95 60%, #6d28d9 100%)",
      }}
    >
      {/* ── Header ── */}
      <header
        className="flex shrink-0 items-center justify-between gap-3 px-5 py-3"
        style={{
          background: "rgba(0,0,0,0.28)",
          backdropFilter: "blur(16px)",
          borderBottom: "0.5px solid rgba(255,255,255,0.12)",
        }}
      >
        <div className="flex items-center gap-2.5">
          <span className="text-lg font-extrabold tracking-tight text-white drop-shadow">KNBL</span>
          <span className="h-2 w-2 rounded-full bg-white/60" />
          <span className="text-sm font-medium text-white/70">{clientName}</span>
          {pending > 0 && (
            <span className="rounded-full bg-amber-400 px-2.5 py-0.5 text-xs font-bold text-white shadow">
              {pending} ממתינים לאישור
            </span>
          )}
        </div>

        {/* Month navigation */}
        <div className="flex items-center gap-1.5" dir="ltr">
          <button
            onClick={() => setCurrent(d => addMonths(d, -1))}
            className="rounded-full px-2.5 py-1.5 text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            ‹
          </button>
          <button
            onClick={() => setCurrent(new Date())}
            className="min-w-[110px] rounded-full border px-3 py-1.5 text-center text-sm font-semibold text-white/90 transition hover:bg-white/10"
            style={{ borderColor: "rgba(255,255,255,0.2)" }}
          >
            {formatHebDate(current, "MMMM yyyy")}
          </button>
          <button
            onClick={() => setCurrent(d => addMonths(d, 1))}
            className="rounded-full px-2.5 py-1.5 text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            ›
          </button>
        </div>

        {onClose ? (
          <button
            onClick={onClose}
            className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-white/20"
          >
            ← חזרה למנהל
          </button>
        ) : (
          <form action={logout}>
            <button className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-white/20">
              יציאה
            </button>
          </form>
        )}
      </header>

      {/* ── Calendar ── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Weekday headers */}
        <div
          className="grid shrink-0 grid-cols-7 border-b"
          style={{ borderColor: "rgba(255,255,255,0.1)" }}
        >
          {HEB_WEEKDAY_SHORT.map(d => (
            <div
              key={d}
              className="py-2 text-center text-xs font-bold tracking-wide"
              style={{ color: "#a78bfa" }}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div
          className="grid flex-1 grid-cols-7 overflow-hidden"
          style={{ gridTemplateRows: `repeat(${Math.ceil(days.length / 7)}, 1fr)` }}
        >
          {days.map(day => {
            const key      = toISODate(day);
            const dayPosts = postsByDate.get(key) ?? [];
            const inMonth  = isSameMonth(day, current);
            const today    = isToday(day);

            return (
              <div
                key={key}
                className="flex flex-col gap-1 overflow-y-auto border-b border-s p-1.5"
                style={{
                  borderColor: "rgba(167,139,250,0.18)",
                  background: today
                    ? "rgba(124,58,237,0.22)"
                    : inMonth
                      ? "rgba(255,255,255,0.05)"
                      : "rgba(0,0,0,0.12)",
                  boxShadow: today ? "inset 0 0 0 1.5px rgba(167,139,250,0.4)" : undefined,
                }}
              >
                {/* Day number */}
                <span
                  className="mb-0.5 flex h-5 w-5 items-center justify-center self-end rounded-full text-[10px] font-bold"
                  style={{
                    background: today ? "rgba(167,139,250,0.45)" : undefined,
                    color: today ? "#fff" : inMonth ? "rgba(255,255,255,0.75)" : "rgba(167,139,250,0.3)",
                    boxShadow: today ? "0 0 8px rgba(124,58,237,0.7)" : undefined,
                  }}
                >
                  {day.getDate()}
                </span>

                {/* Post pills */}
                {dayPosts.map(p => {
                  const dot  = STATUS_DOT[p.status] ?? STATUS_DOT.draft;
                  const icon = p.platform ? (PLATFORM_ICON[p.platform.toLowerCase()] ?? "") : "";
                  const isVideo = p.media_url && /\.(mp4|mov|avi|webm|mkv)$/i.test(p.media_url);

                  return (
                    <button
                      key={p.id}
                      onClick={() => setSelected(p)}
                      title={p.title}
                      className="group w-full overflow-hidden rounded-lg text-right transition hover:brightness-110 active:scale-95"
                      style={{
                        background: `${dot}18`,
                        border: `1px solid ${dot}44`,
                        boxShadow: `0 1px 4px rgba(0,0,0,0.25)`,
                      }}
                    >
                      {/* Thumbnail strip */}
                      {p.media_url && !isVideo && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.media_url}
                          alt=""
                          className="h-12 w-full object-cover"
                          onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                        />
                      )}
                      {p.media_url && isVideo && (
                        <div
                          className="flex h-8 items-center justify-center gap-1 text-[10px]"
                          style={{ background: "rgba(0,0,0,0.35)", color: "rgba(255,255,255,0.5)" }}
                        >
                          ▶ סרטון
                        </div>
                      )}

                      {/* Text row */}
                      <div className="flex items-center gap-1 px-1.5 py-1">
                        {/* Status dot */}
                        <span
                          className="h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ backgroundColor: dot }}
                        />
                        {/* Platform icon */}
                        {icon && (
                          <span className="shrink-0 text-[10px] leading-none">{icon}</span>
                        )}
                        {/* Title */}
                        <span
                          className="min-w-0 flex-1 truncate text-[11px] font-semibold leading-tight"
                          style={{ color: "rgba(255,255,255,0.88)" }}
                        >
                          {p.title}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {loading && (
        <div className="pointer-events-none fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full bg-black/50 px-4 py-1.5 text-xs text-white backdrop-blur">
          טוען…
        </div>
      )}

      {selected && (
        <PostModal
          post={selected}
          profile={profile}
          clientName={clientName}
          onClose={() => setSelected(null)}
          onChanged={() => { setSelected(null); load(); }}
        />
      )}
    </div>
  );
}

/* ─────────────────────────── Post modal ─────────────────────────────────── */

function PostModal({
  post,
  profile,
  clientName,
  onClose,
  onChanged,
}: {
  post: Post;
  profile: Profile;
  clientName: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [newComment, setNewComment] = useState("");
  const [busy, setBusy]             = useState(false);
  const [done, setDone]             = useState<"approved" | "rejected" | null>(null);

  const dot          = STATUS_DOT[post.status] ?? STATUS_DOT.draft;
  const statusLabel  = STATUS_LABEL[post.status] ?? post.status;
  const platformKey  = post.platform?.toLowerCase() ?? "";
  const platformIcon = PLATFORM_ICON[platformKey] ?? null;
  const platformName = PLATFORM_NAME[platformKey] ?? post.platform ?? null;
  const platformColor = PLATFORM_COLOR[platformKey] ?? "#6d28d9";
  const isVideo      = post.media_url && /\.(mp4|mov|avi|webm|mkv)$/i.test(post.media_url);
  const alreadyDecided = post.status === "approved" || done !== null;

  const hebDate = (d: string) =>
    new Date(d).toLocaleDateString("he-IL", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });

  async function approve() {
    setBusy(true);
    try {
      const res = await fetch("/api/post/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id, clientName }),
      });
      if (res.ok) { setDone("approved"); setTimeout(onChanged, 900); }
    } finally { setBusy(false); }
  }

  async function reject() {
    if (!newComment.trim()) {
      document.getElementById("client-comment-input")?.focus();
      return;
    }
    setBusy(true);
    try {
      await fetch("/api/client-comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId:   post.id,
          authorId: profile.id,
          body:     `❌ ${clientName} לא אישר: ${newComment.trim()}`,
        }),
      });
      setDone("rejected");
      setTimeout(onChanged, 900);
    } finally { setBusy(false); }
  }

  async function sendComment() {
    const body = newComment.trim();
    if (!body) return;
    setBusy(true);
    try {
      await fetch("/api/client-comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId:   post.id,
          authorId: profile.id,
          body:     `💬 ${clientName}: ${body}`,
        }),
      });
      setNewComment("");
    } finally { setBusy(false); }
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[96vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl shadow-2xl sm:rounded-2xl"
        style={{ background: "linear-gradient(160deg,#1a0a3d 0%,#2d1270 60%,#3b1fa0 100%)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header: platform + status + close ── */}
        <div
          className="flex shrink-0 items-center justify-between px-5 pt-4 pb-3"
          style={{ borderBottom: "1px solid rgba(167,139,250,0.15)" }}
        >
          <div className="flex flex-wrap items-center gap-2">
            {/* Platform badge — always shown */}
            <div
              className="flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold text-white"
              style={{ background: platformName ? platformColor : "rgba(100,80,160,0.6)" }}
            >
              <span className="text-base">{platformIcon ?? "📱"}</span>
              {platformName ?? "פלטפורמה"}
            </div>
            {/* Status badge */}
            <span
              className="rounded-full px-2.5 py-1 text-xs font-semibold"
              style={{ background: `${dot}30`, color: dot, border: `1px solid ${dot}66` }}
            >
              {statusLabel}
            </span>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-white/50 text-xl transition hover:bg-white/10 hover:text-white"
          >
            ×
          </button>
        </div>

        {/* ── Scrollable content ── */}
        <div className="flex-1 overflow-y-auto px-5 pb-6 pt-4">

          {/* Image / Video */}
          {post.media_url && (
            <div
              className="mb-5 overflow-hidden rounded-2xl"
              style={{ border: "1px solid rgba(167,139,250,0.25)" }}
            >
              {isVideo ? (
                <video src={post.media_url} controls className="w-full bg-black" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={post.media_url}
                  alt="תמונת הפוסט"
                  className="w-full object-contain"
                  style={{ background: "rgba(0,0,0,0.4)" }}
                  onError={e => { (e.currentTarget as HTMLImageElement).parentElement!.style.display = "none"; }}
                />
              )}
            </div>
          )}

          {/* Date */}
          <p className="mb-2 text-xs font-medium" style={{ color: "rgba(196,181,253,0.7)" }}>
            {hebDate(post.scheduled_date)}
            {post.scheduled_time && <span dir="ltr"> · {post.scheduled_time.slice(0, 5)}</span>}
          </p>

          {/* Title */}
          <h2 className="mb-4 text-2xl font-extrabold leading-snug" style={{ color: "#ffffff" }}>
            {post.title}
          </h2>

          {/* Post body */}
          {post.body && (
            <div
              className="mb-5 rounded-2xl p-4"
              style={{ background: "rgba(124,58,237,0.18)", border: "1px solid rgba(167,139,250,0.18)" }}
            >
              <p className="text-sm font-semibold mb-1.5" style={{ color: "#c4b5fd" }}>תוכן</p>
              <p className="whitespace-pre-wrap text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.85)" }}>
                {post.body}
              </p>
            </div>
          )}

          {/* ── Approve / Reject ── */}
          <div
            className="mb-5 rounded-2xl p-4"
            style={{ background: "rgba(0,0,0,0.25)", border: "1px solid rgba(167,139,250,0.15)" }}
          >
            {done === "approved" || post.status === "approved" ? (
              <div className="flex items-center justify-center gap-2 py-1" style={{ color: "#34d399" }}>
                <span className="text-2xl">✓</span>
                <span className="text-base font-bold">הפוסט אושר!</span>
              </div>
            ) : done === "rejected" ? (
              <div className="flex items-center justify-center gap-2 py-1" style={{ color: "#f87171" }}>
                <span className="text-2xl">✗</span>
                <span className="text-base font-bold">ההערה נשלחה למנהל</span>
              </div>
            ) : (
              <>
                <p className="mb-3 text-center text-sm font-semibold" style={{ color: "rgba(255,255,255,0.7)" }}>
                  האם אתה מאשר את הפוסט?
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={approve}
                    disabled={busy || alreadyDecided}
                    className="flex-1 rounded-xl py-3 text-base font-bold text-white transition hover:opacity-90 active:scale-95 disabled:opacity-40"
                    style={{ background: "linear-gradient(135deg,#10b981,#059669)" }}
                  >
                    {busy ? "…" : "✓ מאשר"}
                  </button>
                  <button
                    onClick={reject}
                    disabled={busy || alreadyDecided}
                    className="flex-1 rounded-xl border-2 py-3 text-base font-bold transition active:scale-95 disabled:opacity-40"
                    style={{ borderColor: "#f87171", color: "#f87171" }}
                  >
                    {busy ? "…" : "✗ לא מאשר"}
                  </button>
                </div>
                {!alreadyDecided && (
                  <p className="mt-2 text-center text-[11px]" style={{ color: "rgba(167,139,250,0.5)" }}>
                    לאי-אישור יש לכתוב הערה למטה לפני הלחיצה
                  </p>
                )}
              </>
            )}
          </div>

          {/* ── Comment ── */}
          <div
            className="rounded-2xl p-4"
            style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(167,139,250,0.15)" }}
          >
            <p className="mb-2 text-sm font-semibold" style={{ color: "#c4b5fd" }}>הוספת תגובה</p>
            <textarea
              id="client-comment-input"
              rows={3}
              className="w-full resize-none rounded-xl px-4 py-3 text-sm leading-relaxed outline-none transition"
              style={{
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(167,139,250,0.25)",
                color: "rgba(255,255,255,0.9)",
              }}
              placeholder="כתוב הערה, בקשה לשינוי, או סיבה לאי-אישור…"
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              disabled={busy}
            />
            <button
              onClick={sendComment}
              disabled={busy || !newComment.trim()}
              className="mt-2 w-full rounded-xl py-2.5 text-sm font-bold text-white transition disabled:opacity-40"
              style={{ background: "linear-gradient(135deg,#7c3aed,#4c1d95)" }}
            >
              שליחה
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
