"use client";

import { useCallback, useEffect, useState } from "react";
import type { Comment, Post, Profile } from "@/lib/types";
import { fetchPosts, updatePost, addComment, fetchComments } from "@/lib/posts";
import { logout } from "@/app/login/actions";

const PLATFORM_ICON: Record<string, string> = {
  פייסבוק: "📘", facebook: "📘",
  אינסטגרם: "📸", instagram: "📸",
  טיקטוק: "🎵", tiktok: "🎵",
  לינקדאין: "💼", linkedin: "💼",
  יוטיוב: "▶️", youtube: "▶️",
};

const STATUS = {
  draft:     { label: "טיוטה",          cls: "bg-gray-100 text-gray-500" },
  pending:   { label: "ממתין לאישור",   cls: "bg-amber-100 text-amber-700" },
  approved:  { label: "✓ מאושר",        cls: "bg-emerald-100 text-emerald-700" },
  scheduled: { label: "מתוזמן",         cls: "bg-sky-100 text-sky-700" },
  published: { label: "פורסם",          cls: "bg-violet-100 text-violet-700" },
};

function hebDate(date: string) {
  return new Date(date).toLocaleDateString("he-IL", {
    weekday: "long", day: "numeric", month: "long",
  });
}

function groupByMonth(posts: Post[]) {
  const map = new Map<string, Post[]>();
  for (const p of posts) {
    const key = p.scheduled_date.slice(0, 7); // YYYY-MM
    const arr = map.get(key) ?? [];
    arr.push(p);
    map.set(key, arr);
  }
  return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
}

function monthLabel(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("he-IL", { month: "long", year: "numeric" });
}

export function ClientFeed({ profile, clientName }: { profile: Profile; clientName: string }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const today = new Date();
      const from = new Date(today.getFullYear(), today.getMonth() - 1, 1)
        .toISOString().slice(0, 10);
      const to = new Date(today.getFullYear(), today.getMonth() + 3, 0)
        .toISOString().slice(0, 10);
      const data = await fetchPosts({ from, to, clientId: profile.client_id });
      setPosts(data);
    } finally {
      setLoading(false);
    }
  }, [profile.client_id]);

  useEffect(() => { load(); }, [load]);

  const groups = groupByMonth(posts);
  const pending = posts.filter(p => p.status === "pending").length;

  return (
    <div className="flex min-h-screen flex-col bg-[#f5f3ff]">
      {/* Header */}
      <header
        className="relative overflow-hidden px-5 py-4"
        style={{ background: "linear-gradient(135deg, #4c1d95 0%, #7c3aed 60%, #a78bfa 100%)" }}
      >
        <span className="pointer-events-none absolute left-10 top-1 h-8 w-8 rounded-full bg-white/10" />
        <span className="pointer-events-none absolute right-20 bottom-0 h-6 w-6 rounded-full bg-white/10" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-lg font-extrabold tracking-tight text-white drop-shadow">KNBL</span>
            <span className="h-2 w-2 rounded-full bg-white/70" />
            <span className="text-sm font-medium text-white/70">{clientName}</span>
          </div>
          <div className="flex items-center gap-3">
            {pending > 0 && (
              <span className="rounded-full bg-amber-400 px-2.5 py-0.5 text-xs font-bold text-white shadow">
                {pending} ממתינים לאישור
              </span>
            )}
            <form action={logout}>
              <button className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-white/20">
                יציאה
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Feed */}
      <main className="mx-auto w-full max-w-2xl px-4 py-6">
        {loading && (
          <div className="flex justify-center py-16 text-sm text-[#7c3aed]">טוען פוסטים…</div>
        )}

        {!loading && posts.length === 0 && (
          <div className="rounded-2xl border border-[#ddd6fe] bg-white p-10 text-center shadow-sm">
            <p className="text-2xl">📭</p>
            <p className="mt-2 text-sm text-gray-500">אין פוסטים עדיין</p>
          </div>
        )}

        {groups.map(([ym, monthPosts]) => (
          <section key={ym} className="mb-8">
            <div className="mb-4 flex items-center gap-3">
              <span className="text-sm font-bold text-[#4c1d95]">{monthLabel(ym)}</span>
              <span className="flex-1 border-t border-[#ddd6fe]" />
              <span className="text-xs text-gray-400">{monthPosts.length} פוסטים</span>
            </div>
            <div className="flex flex-col gap-5">
              {monthPosts.map(post => (
                <PostCard key={post.id} post={post} profile={profile} onChanged={load} />
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}

function PostCard({ post, profile, onChanged }: { post: Post; profile: Profile; onChanged: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [busy, setBusy] = useState(false);
  const isVideo = post.media_url && /\.(mp4|mov|avi|webm|mkv)$/i.test(post.media_url);
  const platformIcon = post.platform
    ? PLATFORM_ICON[post.platform.toLowerCase()] ?? "📱"
    : null;
  const statusCfg = STATUS[post.status] ?? STATUS.draft;
  const isPending = post.status === "pending";

  async function approve() {
    setBusy(true);
    try {
      await updatePost(post.id, { status: "approved" });
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function loadComments() {
    if (comments.length > 0) return;
    const c = await fetchComments(post.id).catch(() => []);
    setComments(c);
  }

  async function sendComment() {
    if (!newComment.trim()) return;
    setBusy(true);
    try {
      const c = await addComment(post.id, profile.id, newComment.trim());
      setComments(prev => [...prev, c]);
      setNewComment("");
    } finally {
      setBusy(false);
    }
  }

  function toggleComments() {
    if (!showComments) loadComments();
    setShowComments(v => !v);
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-[#ddd6fe] bg-white shadow-sm transition hover:shadow-md">
      {/* Media */}
      {post.media_url && (
        <div className="relative bg-gray-100">
          {isVideo ? (
            <video src={post.media_url} controls className="max-h-72 w-full object-cover" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.media_url} alt="" className="max-h-72 w-full object-cover" />
          )}
        </div>
      )}

      <div className="p-4">
        {/* Meta row */}
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {platformIcon && (
              <span className="flex items-center gap-1 rounded-full bg-[#ede9fe] px-2.5 py-1 text-xs font-semibold text-[#4c1d95]">
                {platformIcon} {post.platform}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusCfg.cls}`}>
              {statusCfg.label}
            </span>
            <span className="text-xs text-gray-400">
              {hebDate(post.scheduled_date)}
              {post.scheduled_time && (
                <span dir="ltr"> · {post.scheduled_time.slice(0, 5)}</span>
              )}
            </span>
          </div>
        </div>

        {/* Title */}
        <h2 className="mb-2 text-base font-bold text-[#1e1b4b]">{post.title}</h2>

        {/* Body */}
        {post.body && (
          <div className="mb-3">
            <p className={`text-sm leading-relaxed text-gray-600 ${!expanded ? "line-clamp-3" : ""}`}>
              {post.body}
            </p>
            {post.body.length > 150 && (
              <button
                onClick={() => setExpanded(v => !v)}
                className="mt-1 text-xs font-medium text-[#7c3aed] hover:underline"
              >
                {expanded ? "הצג פחות" : "קרא עוד"}
              </button>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between border-t border-[#f3f0ff] pt-3">
          <button
            onClick={toggleComments}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-gray-500 transition hover:bg-[#f5f3ff] hover:text-[#7c3aed]"
          >
            💬
            {post.comment_count ? `${post.comment_count} תגובות` : "הוסף תגובה"}
          </button>

          {isPending && (
            <button
              onClick={approve}
              disabled={busy}
              className="rounded-full px-4 py-1.5 text-xs font-bold text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #4c1d95, #7c3aed)" }}
            >
              {busy ? "מאשר…" : "✓ אישור פוסט"}
            </button>
          )}
        </div>

        {/* Comments */}
        {showComments && (
          <div className="mt-3 space-y-2 border-t border-[#f3f0ff] pt-3">
            {comments.length === 0 && (
              <p className="text-xs text-gray-400">אין תגובות עדיין</p>
            )}
            {comments.map(c => (
              <div key={c.id} className="rounded-xl bg-[#f5f3ff] px-3 py-2 text-sm text-gray-700">
                {c.body}
                <span className="mt-0.5 block text-[10px] text-gray-400" dir="ltr">
                  {new Date(c.created_at).toLocaleString("he-IL")}
                </span>
              </div>
            ))}
            <div className="flex gap-2 pt-1">
              <input
                className="flex-1 rounded-full border border-[#ddd6fe] bg-[#f5f3ff] px-3 py-1.5 text-sm outline-none focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed]/20"
                placeholder="כתוב תגובה…"
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendComment()}
              />
              <button
                onClick={sendComment}
                disabled={busy || !newComment.trim()}
                className="rounded-full px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #4c1d95, #7c3aed)" }}
              >
                שלח
              </button>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
