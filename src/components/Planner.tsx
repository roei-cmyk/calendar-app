"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { ClientProfileModal } from "@/components/ClientProfileModal";
import { NotificationBell } from "@/components/NotificationBell";
import { ClientFeed } from "@/components/ClientFeed";
import { ListView } from "@/components/ListView";
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
  const [clientFeedOpen, setClientFeedOpen] = useState(false);
  const [listViewOpen,   setListViewOpen]   = useState(false);
  const [profileClient, setProfileClient] = useState<Client | null>(null);
  const [clientsList, setClientsList] = useState<Client[]>(clients);

  // Keep a ref to the latest posts so openPostById can read them without
  // becoming a new function on every posts update (which would remount NotificationBell).
  const postsRef = useRef(posts);
  useEffect(() => { postsRef.current = posts; }, [posts]);

  const clientsById = useMemo(
    () => new Map(clientsList.map((c) => [c.id, c])),
    [clientsList],
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

  const openPost = useCallback((post: Post) => {
    setEditingPost(post);
    setCreateDate(post.scheduled_date);
    setModalOpen(true);
  }, []);

  // Stable across renders — reads latest posts via ref so onOpenPost passed to
  // NotificationBell never changes identity, preventing spurious remounts.
  const openPostById = useCallback(async (postId: string) => {
    const existing = postsRef.current.find(p => p.id === postId);
    if (existing) { openPost(existing); return; }
    try {
      const res = await fetch(`/api/post/get?id=${encodeURIComponent(postId)}`);
      if (!res.ok) { console.error("openPostById: status", res.status); return; }
      const { post } = await res.json();
      if (post) openPost(post as Post);
    } catch (e) { console.error("openPostById error:", e); }
  }, [openPost]);

  const openCreate = useCallback((date: string) => {
    setEditingPost(null);
    setCreateDate(date);
    setModalOpen(true);
  }, []);

  const activeClient = clientFilter ? (clientsList.find(c => c.id === clientFilter) ?? null) : null;

  const rangeLabel =
    view === "day"
      ? formatHebDate(current)
      : view === "week"
        ? `${formatHebDate(new Date(range.from), "d MMM")} – ${formatHebDate(new Date(range.to), "d MMM yyyy")}`
        : formatHebDate(current, "MMMM yyyy");

  const effectiveCanEdit = isAdmin;

  const handleClientFilter = (id: string | null) => {
    setClientFilter(id);
  };

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
    <div
      className="relative flex h-screen flex-col overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #0f0630 0%, #2d1270 30%, #4c1d95 60%, #6d28d9 100%)",
      }}
    >
      {/* Decorative animated background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Dot grid — static */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)",
          backgroundSize: "36px 36px",
          opacity: 0.4,
        }} />

        {/* Floating geometric circles — crisp outlines */}
        <div style={{ position: "absolute", width: 180, height: 180, borderRadius: "50%", border: "1.5px solid rgba(255,255,255,0.22)", top: "8%", left: "12%", animation: "orb-a 12s ease-in-out infinite" }} />
        <div style={{ position: "absolute", width: 90, height: 90, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.18)", top: "8%", left: "12%", animation: "orb-a 12s ease-in-out infinite" }} />

        <div style={{ position: "absolute", width: 240, height: 240, borderRadius: "50%", border: "1.5px solid rgba(255,255,255,0.18)", bottom: "10%", right: "8%", animation: "orb-b 15s ease-in-out infinite" }} />
        <div style={{ position: "absolute", width: 110, height: 110, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.14)", bottom: "10%", right: "8%", animation: "orb-b 15s ease-in-out infinite" }} />

        <div style={{ position: "absolute", width: 140, height: 140, borderRadius: "50%", border: "1.5px solid rgba(255,255,255,0.16)", top: "45%", left: "55%", animation: "orb-c 9s ease-in-out infinite" }} />

        <div style={{ position: "absolute", width: 100, height: 100, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.2)", top: "20%", right: "22%", animation: "orb-a 10s ease-in-out infinite 2s" }} />

        <div style={{ position: "absolute", width: 200, height: 200, borderRadius: "50%", border: "1.5px solid rgba(255,255,255,0.12)", bottom: "25%", left: "15%", animation: "orb-c 13s ease-in-out infinite 1s" }} />

        <div style={{ position: "absolute", width: 60, height: 60, borderRadius: "50%", border: "1.5px solid rgba(255,255,255,0.25)", top: "60%", right: "35%", animation: "orb-b 8s ease-in-out infinite 3s" }} />

        {/* Large anchor rings at corners — also floating */}
        <div style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.08)", top: -200, left: -200, animation: "orb-a 20s ease-in-out infinite" }} />
        <div style={{ position: "absolute", width: 580, height: 580, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.07)", bottom: -250, right: -220, animation: "orb-b 24s ease-in-out infinite" }} />
      </div>

      {/* Top bar */}
      <header
        className="relative flex items-center justify-between overflow-hidden px-5 py-3"
        style={{
          background: "rgba(0,0,0,0.25)",
          backdropFilter: "blur(16px)",
          borderBottom: "0.5px solid rgba(255,255,255,0.12)",
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
          <NotificationBell onOpenPost={openPostById} />
          <form action={logout}>
            <button className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-white/20">
              יציאה
            </button>
          </form>
        </div>
      </header>



      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className="hidden w-60 shrink-0 flex-col gap-4 p-4 md:flex"
          style={{
            background: "rgba(0,0,0,0.28)",
            backdropFilter: "blur(20px)",
            borderRight: "0.5px solid rgba(255,255,255,0.1)",
          }}
        >
          <div>
            <h3
              className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.15em]"
              style={{ color: "rgba(167,139,250,0.35)" }}
            >
              לקוחות
            </h3>
            <div className="flex flex-col overflow-hidden rounded-xl" style={{ border: "0.5px solid rgba(167,139,250,0.08)" }}>
              {isAdmin && (
                <button
                  onClick={() => handleClientFilter(null)}
                  className="flex w-full items-stretch text-right text-sm transition hover:bg-white/[0.05]"
                  style={{ background: clientFilter === null ? "rgba(124,58,237,0.14)" : undefined }}
                >
                  <div style={{
                    width: 3,
                    flexShrink: 0,
                    background: clientFilter === null
                      ? "linear-gradient(180deg,#c084fc,#7c3aed)"
                      : "#7c3aed",
                    opacity: clientFilter === null ? 1 : 0.2,
                    boxShadow: clientFilter === null ? "2px 0 10px rgba(124,58,237,0.7)" : undefined,
                  }} />
                  <div style={{ flex: 1, padding: "10px 12px" }}>
                    <div style={{
                      fontSize: 13,
                      fontWeight: clientFilter === null ? 700 : 400,
                      color: clientFilter === null ? "#f5f3ff" : "rgba(255,255,255,0.3)",
                    }}>
                      כל הלקוחות
                    </div>
                  </div>
                </button>
              )}
              {clientsList.map((c) => {
                const active = clientFilter === c.id;
                return (
                  <div
                    key={c.id}
                    className="group/client flex w-full items-stretch"
                    style={{
                      borderTop: "0.5px solid rgba(255,255,255,0.04)",
                      background: active ? "rgba(124,58,237,0.14)" : undefined,
                    }}
                  >
                    <button
                      onClick={() => handleClientFilter(c.id)}
                      className="flex flex-1 items-stretch text-right text-sm transition hover:bg-white/[0.05]"
                    >
                      <div style={{
                        width: 3,
                        flexShrink: 0,
                        background: c.color,
                        opacity: active ? 1 : 0.3,
                        boxShadow: active ? `2px 0 12px ${c.color}` : undefined,
                      }} />
                      <div style={{ flex: 1, padding: "10px 12px" }}>
                        <div
                          className="truncate"
                          style={{
                            fontSize: 13,
                            fontWeight: active ? 700 : 400,
                            color: active ? "#f5f3ff" : "rgba(255,255,255,0.32)",
                          }}
                        >
                          {c.name}
                        </div>
                        {active && (
                          <div style={{ fontSize: 9, color: "rgba(167,139,250,0.5)", marginTop: 2 }}>
                            {c.business_description ? "✓ יש פרופיל" : "אין פרופיל"}
                          </div>
                        )}
                      </div>
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => setProfileClient(c)}
                        className="flex items-center px-2 opacity-0 transition group-hover/client:opacity-100"
                        style={{ color: "rgba(167,139,250,0.6)" }}
                        title="עריכת פרופיל לקוח"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Client view + list view buttons */}
          {isAdmin && clientFilter && (
            <div className="mt-auto flex flex-col gap-2">
              <button
                onClick={() => setListViewOpen(true)}
                className="w-full rounded-xl px-3 py-2.5 text-sm font-semibold transition"
                style={{
                  background: "rgba(124,58,237,0.15)",
                  border: "0.5px solid rgba(167,139,250,0.4)",
                  color: "rgba(196,181,253,0.9)",
                }}
              >
                📋 רשימת פוסטים
              </button>
              <button
                onClick={() => setClientFeedOpen(true)}
                className="w-full rounded-xl px-3 py-2.5 text-sm font-semibold transition"
                style={{
                  background: "rgba(124,58,237,0.15)",
                  border: "0.5px solid rgba(167,139,250,0.4)",
                  color: "rgba(196,181,253,0.9)",
                }}
              >
                👁 תצוגת לקוח מדויקת
              </button>
            </div>
          )}
        </aside>

        {/* Main */}
        <main className="flex flex-1 flex-col overflow-hidden">
          {/* Toolbar */}
          <div
            className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5"
            style={{
              background: "rgba(0,0,0,0.2)",
              borderColor: "rgba(255,255,255,0.12)",
              backdropFilter: "blur(12px)",
            }}
          >
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrent((d) => shiftDate(d, view, 1))}
                className="rounded-full px-2.5 py-1.5 transition"
                style={{ color: "#a78bfa" }}
                aria-label="הבא"
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
              <span className="mx-2 text-sm font-bold tracking-tight" style={{ color: "#e9d5ff" }}>
                {rangeLabel}
              </span>
              <button
                onClick={() => setCurrent((d) => shiftDate(d, view, -1))}
                className="rounded-full px-2.5 py-1.5 transition"
                style={{ color: "#a78bfa" }}
                aria-label="הקודם"
              >
                ‹
              </button>
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
                {(["day", "week", "month", "list"] as CalendarView[]).map((v) => (
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
          <div className="flex-1 overflow-hidden" style={{ background: "transparent" }}>
            {view === "month" && <MonthView {...viewProps} />}
            {view === "week" && <WeekView {...viewProps} />}
            {view === "day" && <DayView {...viewProps} />}
          </div>
        </main>
      </div>

      {profileClient && (
        <ClientProfileModal
          client={profileClient}
          onClose={() => setProfileClient(null)}
          onSaved={(updated) => {
            setClientsList(prev => prev.map(c => c.id === updated.id ? updated : c));
            setProfileClient(null);
          }}
        />
      )}

      {/* Exact client view overlay */}
      {clientFeedOpen && activeClient && (
        <div className="fixed inset-0 z-[9999] overflow-y-auto">
          <ClientFeed
            profile={{ ...profile, role: "client", client_id: activeClient.id }}
            clientName={activeClient.name}
            onClose={() => setClientFeedOpen(false)}
          />
        </div>
      )}

      {listViewOpen && activeClient && (
        <div
          className="fixed inset-0 z-[9998] flex"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }}
          onClick={() => setListViewOpen(false)}
        >
          <div
            className="relative mr-auto flex h-full w-full max-w-xl flex-col"
            style={{
              background: "linear-gradient(160deg, #0f0630 0%, #2d1270 60%, #4c1d95 100%)",
              borderLeft: "0.5px solid rgba(167,139,250,0.2)",
            }}
            onClick={e => e.stopPropagation()}
          >
            <div
              className="flex shrink-0 items-center justify-between px-5 py-3.5"
              style={{ background: "rgba(0,0,0,0.3)", borderBottom: "0.5px solid rgba(167,139,250,0.2)" }}
            >
              <div>
                <span className="font-bold text-white">📋 רשימת פוסטים</span>
                <span className="mr-2 text-xs" style={{ color: "rgba(167,139,250,0.6)" }}>{activeClient.name}</span>
              </div>
              <button
                onClick={() => setListViewOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-lg transition"
                style={{ color: "rgba(167,139,250,0.6)", background: "rgba(255,255,255,0.07)" }}
              >×</button>
            </div>
            <ListView
              client={activeClient}
              canEdit={effectiveCanEdit}
              onSelectPost={(post) => { setListViewOpen(false); openPost(post); }}
            />
          </div>
        </div>
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
