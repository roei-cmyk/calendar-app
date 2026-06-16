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
import { GanttModal } from "@/components/GanttModal";
import { NotificationBell } from "@/components/NotificationBell";
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
  const [clientFilter, setClientFilter] = useState<string | null>(
    isAdmin ? null : profile.client_id,
  );
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<PostStatus | "all">("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [createDate, setCreateDate] = useState<string>(toISODate(new Date()));
  const [ganttOpen, setGanttOpen] = useState(false);
  const [previewAsClient, setPreviewAsClient] = useState(false);

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
        setPosts(prev);
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

  // When preview mode is on, act as a client (read-only)
  const effectiveCanEdit = isAdmin && !previewAsClient;

  // Reset preview mode when switching to "all clients"
  const handleClientFilter = (id: string | null) => {
    setClientFilter(id);
    if (!id) setPreviewAsClient(false);
  };

  const activeClient = clientFilter ? clients.find(c => c.id === clientFilter) : null;

  const viewProps = {
    current,
    postsByDate,
    clientsById,
    canEdit: effectiveCanEdit,
    onSelectPost: openPost,
    onCreateForDate: effectiveCanEdit ? openCreate : () => {},
    onMovePost: effectiveCanEdit ? handleMovePost : undefined,
  };

  return (
    <div className="flex h-screen flex-col bg-canvas">
      {/* Top bar — KNBL purple gradient */}
      <header
        className="relative flex items-center justify-between overflow-hidden px-5 py-3"
        style={{
          background: "linear-gradient(135deg, #4c1d95 0%, #7c3aed 60%, #a78bfa 100%)",
        }}
      >
        <span className="pointer-events-none absolute left-10 top-1 h-8 w-8 rounded-full bg-white/10" />
        <span className="pointer-events-none absolute left-24 bottom-0 h-5 w-5 rounded-full bg-white/8" />
        <span className="pointer-events-none absolute right-64 top-1 h-4 w-4 rounded-full bg-white/10" />

        <div className="relative flex items-center gap-2.5">
          <span className="text-lg font-extrabold tracking-tight text-white drop-shadow">
            KNBL
          </span>
          <span className="h-2 w-2 rounded-full bg-white/80" />
          <span className="text-sm font-medium text-white/60">לוח תוכן</span>
        </div>

        <div className="relative flex items-center gap-3">
          <div className="hidden items-center gap-2.5 sm:flex">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-xs font-bold text-white ring-1 ring-white/30">
              {(profile.full_name ?? "מ").trim().charAt(0)}
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold text-white">
                {profile.full_name ?? "משתמש"}
              </div>
              <div className="text-[11px] text-white/50">
                {isAdmin ? "מנהל מערכת" : "לקוח"}
              </div>
            </div>
          </div>
          <NotificationBell />
          <form action={logout}>
            <button className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-white/20">
              יציאה
            </button>
          </form>
        </div>
      </header>

      {/* Preview mode banner */}
      {previewAsClient && activeClient && (
        <div className="flex items-center justify-between border-b border-amber-200 bg-amber-50 px-4 py-1.5">
          <span className="text-xs font-medium text-amber-700">
            👁 מצב תצוגת לקוח — {activeClient.name} · אתה רואה את הלוח כפי שהלקוח רואה אותו
          </span>
          <button
            onClick={() => setPreviewAsClient(false)}
            className="text-xs font-semibold text-amber-700 hover:text-amber-900"
          >
            × יציאה
          </button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — dark purple */}
        <aside
          className="hidden w-60 shrink-0 flex-col gap-4 p-4 md:flex"
          style={{ background: "linear-gradient(180deg, #2e1065 0%, #1e1b4b 100%)" }}
        >
          <span className="pointer-events-none absolute mt-8 ms-40 h-12 w-12 rounded-full bg-violet-400/10" />
          <span className="pointer-events-none absolute mt-32 ms-2 h-8 w-8 rounded-full bg-violet-300/10" />

          {isAdmin && (
            <button
              onClick={() => setGanttOpen(true)}
              className="w-full rounded-xl py-2.5 text-sm font-bold text-white shadow-lg transition hover:opacity-90 active:scale-95"
              style={{ background: "linear-gradient(135deg, #7c3aed, #a78bfa)" }}
            >
              ✨ צור גאנט AI
            </button>
          )}

          <div>
            <h3 className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-white/30">
              לקוחות
            </h3>
            <div className="flex flex-col gap-0.5">
              {isAdmin && (
                <button
                  onClick={() => handleClientFilter(null)}
                  className={`rounded-lg px-3 py-2 text-right text-sm transition ${
                    clientFilter === null
                      ? "bg-white/15 font-semibold text-white shadow-sm"
                      : "text-white/50 hover:bg-white/[0.08] hover:text-white/80"
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
                    onClick={() => handleClientFilter(c.id)}
                    className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-right text-sm transition ${
                      active
                        ? "bg-white/15 font-semibold text-white"
                        : "text-white/50 hover:bg-white/[0.08] hover:text-white/80"
                    }`}
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full shadow-sm"
                      style={{ backgroundColor: c.color }}
                    />
                    <span className="truncate">{c.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preview-as-client toggle — shown when a specific client is selected */}
          {isAdmin && clientFilter && (
            <button
              onClick={() => setPreviewAsClient(v => !v)}
              className={`mt-auto w-full rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                previewAsClient
                  ? "border-amber-400/60 bg-amber-400/20 text-amber-200 hover:bg-amber-400/30"
                  : "border-white/15 bg-white/8 text-white/60 hover:bg-white/15 hover:text-white"
              }`}
            >
              {previewAsClient ? "✏️ חזרה למצב עריכה" : `👁 תצוגת ${activeClient?.name ?? "לקוח"}`}
            </button>
          )}
        </aside>

        {/* Main */}
        <main className="flex flex-1 flex-col overflow-hidden">
          {/* Toolbar */}
          <div
            className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5"
            style={{
              background: "rgba(15,5,32,0.85)",
              borderColor: "rgba(167,139,250,0.2)",
              backdropFilter: "blur(8px)",
            }}
          >
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrent((d) => shiftDate(d, view, -1))}
                className="rounded-full px-2.5 py-1.5 transition"
                style={{ color: "#a78bfa" }}
                aria-label="הקודם"
              >
                ›
              </button>
              <button
                onClick={() => setCurrent(new Date())}
                className="rounded-full border px-3.5 py-1.5 text-sm font-semibold transition"
                style={{
                  borderColor: "rgba(167,139,250,0.4)",
                  background: "rgba(124,58,237,0.2)",
                  color: "#c4b5fd",
                }}
              >
                היום
              </button>
              <button
                onClick={() => setCurrent((d) => shiftDate(d, view, 1))}
                className="rounded-full px-2.5 py-1.5 transition"
                style={{ color: "#a78bfa" }}
                aria-label="הבא"
              >
                ‹
              </button>
              <span className="ms-2.5 text-sm font-bold tracking-tight" style={{ color: "#e9d5ff" }}>
                {rangeLabel}
              </span>
              {loading && (
                <span className="ms-2 text-xs" style={{ color: "#a78bfa" }}>טוען…</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as PostStatus | "all")
                }
                className="rounded-full border px-3 py-1.5 text-sm outline-none transition"
                style={{
                  borderColor: "rgba(167,139,250,0.3)",
                  background: "rgba(124,58,237,0.15)",
                  color: "#c4b5fd",
                }}
              >
                <option value="all">כל הסטטוסים</option>
                {(Object.keys(POST_STATUS_LABELS) as PostStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {POST_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-1">
                {(["day", "week", "month"] as CalendarView[]).map((v) => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className="rounded-full border px-4 py-1.5 text-sm font-medium transition"
                    style={view === v ? {
                      background: "#7c3aed",
                      borderColor: "#7c3aed",
                      color: "white",
                    } : {
                      borderColor: "rgba(167,139,250,0.3)",
                      background: "transparent",
                      color: "#a78bfa",
                    }}
                  >
                    {VIEW_LABELS[v]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Calendar surface */}
          <div className="flex-1 overflow-hidden" style={{ background: "#0f0520" }}>
            {view === "month" && <MonthView {...viewProps} />}
            {view === "week" && <WeekView {...viewProps} />}
            {view === "day" && <DayView {...viewProps} />}
          </div>
        </main>
      </div>

      {ganttOpen && (
        <GanttModal
          clients={clients}
          defaultClientId={clientFilter}
          onClose={() => setGanttOpen(false)}
          onDone={load}
        />
      )}

      {modalOpen && (
        <PostModal
          post={editingPost}
          defaultDate={createDate}
          defaultClientId={clientFilter ?? profile.client_id}
          clients={clients}
          profile={profile}
          canEdit={effectiveCanEdit}
          onClose={() => setModalOpen(false)}
          onChanged={load}
        />
      )}
    </div>
  );
}
