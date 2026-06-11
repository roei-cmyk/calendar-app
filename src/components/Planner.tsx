"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  endOfMonth,
  endOfWeek,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import type { CalendarView, Client, Post, PostStatus, Profile } from "@/lib/types";
import { POST_STATUS_LABELS } from "@/lib/types";
import { fetchPosts, updatePost } from "@/lib/posts";
import { formatHebDate, shiftDate, toISODate } from "@/lib/date";
import { MonthView } from "@/components/calendar/MonthView";
import { WeekView } from "@/components/calendar/WeekView";
import { DayView } from "@/components/calendar/DayView";
import { PostModal } from "@/components/PostModal";
import { logout } from "@/app/login/actions";

const WEEK_OPTS = { weekStartsOn: 0 as const };

const VIEW_LABELS: Record<CalendarView, string> = {
  day: "יום",
  week: "שבוע",
  month: "חודש",
};

function rangeFor(view: CalendarView, date: Date): { from: string; to: string } {
  if (view === "day") return { from: toISODate(date), to: toISODate(date) };
  if (view === "week")
    return {
      from: toISODate(startOfWeek(date, WEEK_OPTS)),
      to: toISODate(endOfWeek(date, WEEK_OPTS)),
    };
  return {
    from: toISODate(startOfWeek(startOfMonth(date), WEEK_OPTS)),
    to: toISODate(endOfWeek(endOfMonth(date), WEEK_OPTS)),
  };
}

export function Planner({
  profile,
  clients,
}: {
  profile: Profile;
  clients: Client[];
}) {
  const isAdmin = profile.role === "admin";
  const [view, setView] = useState<CalendarView>("month");
  const [current, setCurrent] = useState<Date>(() => new Date());
  // Admin can filter to a single client; null = all clients.
  const [clientFilter, setClientFilter] = useState<string | null>(
    isAdmin ? null : profile.client_id,
  );
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<PostStatus | "all">("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [createDate, setCreateDate] = useState<string>(toISODate(new Date()));

  const clientsById = useMemo(
    () => new Map(clients.map((c) => [c.id, c])),
    [clients],
  );

  const range = useMemo(() => rangeFor(view, current), [view, current]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchPosts({
        from: range.from,
        to: range.to,
        clientId: clientFilter,
      });
      setPosts(data);
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [range.from, range.to, clientFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const postsByDate = useMemo(() => {
    const map = new Map<string, Post[]>();
    for (const p of posts) {
      if (statusFilter !== "all" && p.status !== statusFilter) continue;
      const arr = map.get(p.scheduled_date) ?? [];
      arr.push(p);
      map.set(p.scheduled_date, arr);
    }
    return map;
  }, [posts, statusFilter]);

  // Drag-to-reschedule: optimistic update, then persist (revert on failure).
  const handleMovePost = useCallback(
    async (postId: string, newDate: string) => {
      const target = posts.find((p) => p.id === postId);
      if (!target || target.scheduled_date === newDate) return;
      const prev = posts;
      setPosts((list) =>
        list.map((p) =>
          p.id === postId ? { ...p, scheduled_date: newDate } : p,
        ),
      );
      try {
        await updatePost(postId, { scheduled_date: newDate });
      } catch {
        setPosts(prev); // revert
      }
    },
    [posts],
  );

  function openPost(post: Post) {
    setEditingPost(post);
    setCreateDate(post.scheduled_date);
    setModalOpen(true);
  }

  function openCreate(date: string) {
    setEditingPost(null);
    setCreateDate(date);
    setModalOpen(true);
  }

  const rangeLabel =
    view === "day"
      ? formatHebDate(current)
      : view === "week"
        ? `${formatHebDate(new Date(range.from), "d MMM")} – ${formatHebDate(new Date(range.to), "d MMM yyyy")}`
        : formatHebDate(current, "MMMM yyyy");

  const viewProps = {
    current,
    postsByDate,
    clientsById,
    canEdit: isAdmin,
    onSelectPost: openPost,
    onCreateForDate: openCreate,
    onMovePost: isAdmin ? handleMovePost : undefined,
  };

  return (
    <div className="flex h-screen flex-col bg-canvas">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-line bg-white px-5 py-3">
        <div className="flex items-center gap-2.5">
          <span className="text-lg font-extrabold tracking-tight text-ink">
            KNBL
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-ink" />
          <span className="text-sm font-medium text-ink-faint">לוח תוכן</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2.5 sm:flex">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-ink ring-1 ring-line">
              {(profile.full_name ?? "מ").trim().charAt(0)}
            </div>
            <div className="leading-tight">
              <div className="text-sm font-medium text-ink">
                {profile.full_name ?? "משתמש"}
              </div>
              <div className="text-[11px] text-ink-faint">
                {isAdmin ? "מנהל מערכת" : "לקוח"}
              </div>
            </div>
          </div>
          <form action={logout}>
            <button className="btn-ghost px-3 py-1.5">יציאה</button>
          </form>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="hidden w-60 shrink-0 flex-col gap-4 border-s border-line bg-sidebar p-4 md:flex">
          <div>
            <h3 className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-faint">
              לקוחות
            </h3>
            <div className="flex flex-col gap-0.5">
              {isAdmin && (
                <button
                  onClick={() => setClientFilter(null)}
                  className={`rounded-md px-3 py-2 text-right text-sm transition ${
                    clientFilter === null
                      ? "bg-white font-medium text-ink shadow-[0_0_0_1px_#e0e0e0]"
                      : "text-ink-muted hover:bg-black/[0.04] hover:text-ink"
                  }`}
                >
                  כל הלקוחות
                </button>
              )}
              {clients.map((c) => {
                const active = clientFilter === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setClientFilter(c.id)}
                    className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-right text-sm transition ${
                      active
                        ? "bg-white font-medium text-ink shadow-[0_0_0_1px_#e0e0e0]"
                        : "text-ink-muted hover:bg-black/[0.04] hover:text-ink"
                    }`}
                  >
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: c.color }}
                    />
                    <span className="truncate">{c.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="flex flex-1 flex-col overflow-hidden">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-white px-4 py-2.5">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrent((d) => shiftDate(d, view, -1))}
                className="rounded-lg px-2.5 py-1.5 text-ink-muted transition hover:bg-gray-100 hover:text-ink"
                aria-label="הקודם"
              >
                ›
              </button>
              <button
                onClick={() => setCurrent(new Date())}
                className="rounded-full border border-line-strong px-3.5 py-1.5 text-sm font-medium text-ink transition hover:bg-gray-50"
              >
                היום
              </button>
              <button
                onClick={() => setCurrent((d) => shiftDate(d, view, 1))}
                className="rounded-lg px-2.5 py-1.5 text-ink-muted transition hover:bg-gray-100 hover:text-ink"
                aria-label="הבא"
              >
                ‹
              </button>
              <span className="ms-2.5 text-sm font-bold tracking-tight text-ink">
                {rangeLabel}
              </span>
              {loading && (
                <span className="ms-2 text-xs text-ink-faint">טוען…</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as PostStatus | "all")
                }
                className="rounded-full border border-line-strong bg-white px-3 py-1.5 text-sm text-ink outline-none transition hover:bg-gray-50 focus:border-ink focus:ring-2 focus:ring-black/10"
              >
                <option value="all">כל הסטטוסים</option>
                {(Object.keys(POST_STATUS_LABELS) as PostStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {POST_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-1.5">
                {(["day", "week", "month"] as CalendarView[]).map((v) => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                      view === v
                        ? "border-ink bg-ink text-white"
                        : "border-line-strong bg-white text-ink hover:bg-gray-50"
                    }`}
                  >
                    {VIEW_LABELS[v]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Calendar surface */}
          <div className="flex-1 overflow-hidden bg-canvas">
            {view === "month" && <MonthView {...viewProps} />}
            {view === "week" && <WeekView {...viewProps} />}
            {view === "day" && <DayView {...viewProps} />}
          </div>
        </main>
      </div>

      {modalOpen && (
        <PostModal
          post={editingPost}
          defaultDate={createDate}
          defaultClientId={clientFilter ?? profile.client_id}
          clients={clients}
          profile={profile}
          canEdit={isAdmin}
          onClose={() => setModalOpen(false)}
          onChanged={load}
        />
      )}
    </div>
  );
}
