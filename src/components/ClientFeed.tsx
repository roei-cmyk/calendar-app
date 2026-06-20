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
        {/* Brand + client name */}
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
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCurrent(d => addMonths(d, -1))}
            className="rounded-full px-2.5 py-1.5 text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            ›
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
            ‹
          </button>
        </div>

        {/* Logout / back */}
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
        <div className="grid flex-1 grid-cols-7 overflow-hidden" style={{ gridTemplateRows: `repeat(${Math.ceil(days.length / 7)}, 1fr)` }}>
          {days.map(day => {
            const key      = toISODate(day);
            const dayPosts = postsByDate.get(key) ?? [];
            const inMonth  = isSameMonth(day, current);
            const today    = isToday(day);

            return (
              <div
                key={key}
                className="flex flex-col gap-0.5 overflow-y-auto border-b border-s p-1"
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
                  return (
                    <button
                      key={p.id}
                      onClick={() => setSelected(p)}
                      title={p.title}
                      className="w-full truncate rounded px-1 py-0.5 text-right text-[9px] font-medium text-white/90 transition hover:brightness-125 active:scale-95"
                      style={{
                        background: `${dot}22`,
                        borderLeft: `2.5px solid ${dot}`,
                      }}
                    >
                      {icon && <span className="mr-0.5 opacity-70" style={{ fontSize: 7 }}>{icon}</span>}
                      {p.title}
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
  const [comments, setComments]     = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [busy, setBusy]             = useState(false);

  useEffect(() => {
    fetchComments(post.id).then(setComments).catch(() => {});
  }, [post.id]);

  const isPending   = post.status === "pending";
  const dot         = STATUS_DOT[post.status] ?? STATUS_DOT.draft;
  const statusLabel = STATUS_LABEL[post.status] ?? post.status;
  const platformIcon = post.platform ? (PLATFORM_ICON[post.platform.toLowerCase()] ?? "📱") : null;

  async function approve() {
    setBusy(true);
    try {
      const res = await fetch("/api/post/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id, clientName }),
      });
      if (res.ok) onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function reject() {
    if (!newComment.trim()) {
      // focus comment box
      document.getElementById("client-comment-input")?.focus();
      return;
    }
    setBusy(true);
    try {
      // Send "not approved" comment + notification
      await fetch("/api/client-comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId:   post.id,
          authorId: profile.id,
          body:     `❌ ${clientName} לא אישר: ${newComment.trim()}`,
        }),
      });
      setNewComment("");
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function sendComment() {
    const body = newComment.trim();
    if (!body) return;
    setBusy(true);
    try {
      const res = await fetch("/api/client-comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId:   post.id,
          authorId: profile.id,
          body:     `💬 ${clientName}: ${body}`,
        }),
      });
      if (res.ok) {
        const { comment } = await res.json().catch(() => ({}));
        if (comment) setComments(prev => [...prev, comment as Comment]);
        setNewComment("");
      }
    } finally {
      setBusy(false);
    }
  }

  const hebDate = (d: string) =>
    new Date(d).toLocaleDateString("he-IL", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 py-3">
          <div className="flex items-center gap-2">
            {platformIcon && <span className="text-lg">{platformIcon}</span>}
            <span
              className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
              style={{ background: `${dot}22`, color: dot }}
            >
              {statusLabel}
            </span>
            <span className="text-xs text-gray-400">
              {hebDate(post.scheduled_date)}
              {post.scheduled_time && (
                <span dir="ltr"> · {post.scheduled_time.slice(0, 5)}</span>
              )}
            </span>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-gray-400 text-xl transition hover:bg-gray-100 hover:text-gray-700"
          >
            ×
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-5">
          <h2 className="mb-3 text-lg font-bold leading-snug text-gray-900">{post.title}</h2>

          {post.body && (
            <p className="mb-5 whitespace-pre-wrap rounded-xl bg-[#f5f3ff] p-4 text-sm leading-relaxed text-gray-700">
              {post.body}
            </p>
          )}

          {/* Approve / Not-approve actions */}
          {isPending && (
            <div className="mb-5 flex gap-2">
              <button
                onClick={approve}
                disabled={busy}
                className="flex-1 rounded-xl py-2.5 text-sm font-bold text-white shadow transition hover:opacity-90 disabled:opacity-50"
                style={{ background: "linear-gradient(135deg,#10b981,#059669)" }}
              >
                {busy ? "…" : "✓ מאושר"}
              </button>
              <button
                onClick={reject}
                disabled={busy}
                className="flex-1 rounded-xl border py-2.5 text-sm font-bold transition hover:bg-red-50 disabled:opacity-50"
                style={{ borderColor: "#ef4444", color: "#ef4444" }}
                title="יש לכתוב הערה לפני אי-אישור"
              >
                {busy ? "…" : "✗ לא מאושר"}
              </button>
            </div>
          )}

          {/* Comments */}
          <div className="border-t border-[#f3f0ff] pt-4">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-gray-400">הערות</p>

            {comments.length === 0 && (
              <p className="mb-3 text-xs text-gray-400">אין הערות עדיין</p>
            )}
            <div className="mb-3 flex flex-col gap-2">
              {comments.map(c => (
                <div key={c.id} className="rounded-xl bg-[#f5f3ff] px-3 py-2">
                  <p className="text-sm text-gray-700">{c.body}</p>
                  <p className="mt-0.5 text-[10px] text-gray-400" dir="ltr">
                    {new Date(c.created_at).toLocaleString("he-IL")}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                id="client-comment-input"
                className="flex-1 rounded-full border border-[#ddd6fe] bg-[#f5f3ff] px-3 py-2 text-sm outline-none focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed]/20"
                placeholder={isPending ? "הערה (חובה ללא אישור)" : "הוסף הערה…"}
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendComment()}
                disabled={busy}
              />
              <button
                onClick={sendComment}
                disabled={busy || !newComment.trim()}
                className="rounded-full px-4 py-2 text-xs font-semibold text-white disabled:opacity-40"
                style={{ background: "linear-gradient(135deg,#4c1d95,#7c3aed)" }}
              >
                שלח
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
