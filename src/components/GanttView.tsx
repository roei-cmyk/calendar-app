"use client";

import { useEffect, useMemo, useState } from "react";
import { addMonths, getDaysInMonth } from "date-fns";
import type { Client, Post, Task } from "@/lib/types";
import { fetchPosts } from "@/lib/posts";
import { fetchTasks } from "@/lib/tasks";
import { formatHebDate, toISODate } from "@/lib/date";

const LEFT_W = 156;
const DAY_W  = 34;

const PLATFORM_ICON: Record<string, string> = {
  instagram: "IG",
  facebook:  "FB",
  linkedin:  "LI",
  tiktok:    "TK",
  twitter:   "TW",
};

const TASK_STATUS_STYLE = {
  pending:     { bg: "rgba(124,58,237,0.35)",  border: "rgba(167,139,250,0.5)",  color: "#c4b5fd" },
  in_progress: { bg: "rgba(251,191,36,0.3)",   border: "rgba(251,191,36,0.6)",   color: "#fcd34d" },
  done:        { bg: "rgba(52,211,153,0.2)",    border: "rgba(52,211,153,0.4)",   color: "#6ee7b7" },
};

function padDate(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function GanttView({ clients }: { clients: Client[] }) {
  const [current, setCurrent] = useState(new Date());
  const [posts, setPosts]     = useState<Post[]>([]);
  const [tasks, setTasks]     = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const year       = current.getFullYear();
  const month      = current.getMonth();
  const daysCount  = getDaysInMonth(current);
  const days       = Array.from({ length: daysCount }, (_, i) => i + 1);
  const monthStart = padDate(year, month, 1);
  const monthEnd   = padDate(year, month, daysCount);
  const todayStr   = toISODate(new Date());
  const todayCol   = (() => {
    const t = new Date(todayStr + "T12:00:00");
    if (t.getFullYear() === year && t.getMonth() === month) return t.getDate() - 1;
    return -1;
  })();

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchPosts({ from: monthStart, to: monthEnd }),
      fetchTasks(),
    ])
      .then(([p, t]) => {
        setPosts(p);
        setTasks(t.filter(task => {
          if (!task.due_date) return false;
          const s = task.start_date ?? task.due_date;
          return s <= monthEnd && task.due_date >= monthStart;
        }));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [year, month]); // eslint-disable-line react-hooks/exhaustive-deps

  const postsByClient = useMemo(() => {
    const map = new Map<string, Map<number, Post[]>>();
    for (const post of posts) {
      const d = new Date(post.scheduled_date + "T12:00:00");
      if (d.getFullYear() !== year || d.getMonth() !== month) continue;
      const col = d.getDate() - 1;
      if (!map.has(post.client_id)) map.set(post.client_id, new Map());
      const dayMap = map.get(post.client_id)!;
      const arr = dayMap.get(col) ?? [];
      arr.push(post);
      dayMap.set(col, arr);
    }
    return map;
  }, [posts, year, month]);

  function barGeometry(startStr: string | null, endStr: string) {
    const s = new Date((startStr ?? endStr) + "T12:00:00");
    const e = new Date(endStr + "T12:00:00");
    const ms = new Date(monthStart + "T12:00:00");
    const me = new Date(monthEnd + "T12:00:00");
    const cs = s < ms ? ms : s;
    const ce = e > me ? me : e;
    const startCol = cs.getDate() - 1;
    const endCol   = ce.getDate() - 1;
    if (endCol < startCol) return null;
    return { left: startCol * DAY_W + 3, width: (endCol - startCol + 1) * DAY_W - 6 };
  }

  const ROW_H = 44;
  const totalW = LEFT_W + daysCount * DAY_W;

  const clientsWithPosts = clients.filter(c => postsByClient.has(c.id));

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Month nav */}
      <div className="flex shrink-0 items-center gap-3 px-5 py-2.5"
        style={{ borderBottom: "0.5px solid rgba(167,139,250,0.15)", background: "rgba(0,0,0,0.2)" }}>
        <button onClick={() => setCurrent(d => addMonths(d, 1))}
          className="rounded-full px-2 py-1 text-lg transition" style={{ color: "#a78bfa" }}>›</button>
        <span className="text-sm font-bold" style={{ color: "#e9d5ff" }}>
          {formatHebDate(current, "MMMM yyyy")}
        </span>
        <button onClick={() => setCurrent(d => addMonths(d, -1))}
          className="rounded-full px-2 py-1 text-lg transition" style={{ color: "#a78bfa" }}>‹</button>
        {loading && <span className="text-xs" style={{ color: "#a78bfa" }}>טוען…</span>}
        <div className="mr-4 flex items-center gap-4 text-[10px]" style={{ color: "rgba(167,139,250,0.5)" }}>
          <span className="flex items-center gap-1.5">
            <span style={{ display: "inline-block", width: 20, height: 10, borderRadius: 3, background: "rgba(124,58,237,0.5)" }} />
            פוסטים
          </span>
          <span className="flex items-center gap-1.5">
            <span style={{ display: "inline-block", width: 20, height: 10, borderRadius: 3, background: "rgba(52,211,153,0.4)", border: "0.5px solid rgba(52,211,153,0.5)" }} />
            משימות
          </span>
        </div>
      </div>

      {/* Grid */}
      <div className="scroll-thin flex-1 overflow-auto">
        <div style={{ minWidth: totalW, position: "relative" }}>

          {/* Sticky day header */}
          <div className="sticky top-0 z-10 flex"
            style={{ background: "rgba(10,3,40,0.97)", borderBottom: "0.5px solid rgba(167,139,250,0.15)" }}>
            <div style={{ width: LEFT_W, flexShrink: 0 }} />
            {days.map(d => {
              const isToday = todayCol === d - 1;
              const col = d - 1;
              const date = new Date(year, month, d);
              const dayOfWeek = date.getDay(); // 0=Sun, 6=Sat
              const isWeekend = dayOfWeek === 5 || dayOfWeek === 6; // Fri/Sat
              return (
                <div key={d} style={{
                  width: DAY_W, flexShrink: 0, textAlign: "center",
                  paddingTop: 6, paddingBottom: 6,
                  fontSize: 10,
                  color: isToday ? "#c4b5fd" : isWeekend ? "rgba(167,139,250,0.25)" : "rgba(167,139,250,0.45)",
                  fontWeight: isToday ? 700 : 400,
                  borderLeft: "0.5px solid rgba(167,139,250,0.07)",
                  background: isToday ? "rgba(124,58,237,0.18)" : undefined,
                }}>
                  {d}
                </div>
              );
            })}
          </div>

          {/* ── POSTS SECTION ── */}
          <div className="flex items-center" style={{ paddingTop: 10, paddingBottom: 4 }}>
            <div style={{
              width: LEFT_W, flexShrink: 0,
              paddingRight: 14, textAlign: "right",
              fontSize: 9, fontWeight: 700, letterSpacing: "0.14em",
              color: "rgba(167,139,250,0.35)", textTransform: "uppercase",
            }}>
              פוסטים לפרסום
            </div>
          </div>

          {clientsWithPosts.length === 0 && !loading && (
            <div style={{ paddingRight: 14, paddingBottom: 8, fontSize: 12, color: "rgba(167,139,250,0.25)", textAlign: "right" }}>
              אין פוסטים לחודש זה
            </div>
          )}

          {clientsWithPosts.map(client => {
            const dayMap = postsByClient.get(client.id)!;
            // Calculate needed rows (max posts on same day)
            const maxStack = Math.max(...Array.from(dayMap.values()).map(a => a.length), 1);
            const rowH = Math.max(ROW_H, 8 + maxStack * 18 + 4);

            return (
              <div key={client.id} className="flex" style={{
                borderBottom: "0.5px solid rgba(167,139,250,0.06)",
                minHeight: rowH,
              }}>
                {/* Label */}
                <div style={{
                  width: LEFT_W, flexShrink: 0,
                  display: "flex", alignItems: "center", gap: 8,
                  paddingRight: 14, paddingLeft: 8,
                }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: client.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {client.name}
                  </span>
                </div>

                {/* Day grid */}
                <div style={{ position: "relative", flex: 1, minHeight: rowH }}>
                  {/* Grid lines */}
                  {days.map(d => {
                    const date = new Date(year, month, d);
                    const isWeekend = date.getDay() === 5 || date.getDay() === 6;
                    return (
                      <div key={d} style={{
                        position: "absolute", left: (d - 1) * DAY_W, top: 0, bottom: 0, width: DAY_W,
                        borderLeft: "0.5px solid rgba(167,139,250,0.05)",
                        background: d - 1 === todayCol ? "rgba(124,58,237,0.07)" : isWeekend ? "rgba(255,255,255,0.01)" : undefined,
                      }} />
                    );
                  })}

                  {/* Post chips */}
                  {Array.from(dayMap.entries()).map(([col, colPosts]) =>
                    colPosts.map((post, i) => (
                      <div
                        key={post.id}
                        title={post.title}
                        style={{
                          position: "absolute",
                          left: col * DAY_W + 2,
                          top: 6 + i * 18,
                          width: DAY_W - 4,
                          height: 16,
                          borderRadius: 5,
                          background: client.color,
                          opacity: post.status === "published" ? 0.5 : 0.9,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 8, fontWeight: 700, color: "white",
                          cursor: "default",
                          overflow: "hidden",
                          boxShadow: `0 2px 6px ${client.color}55`,
                        }}
                      >
                        {post.platform ? (PLATFORM_ICON[post.platform] ?? post.platform.slice(0, 2).toUpperCase()) : "•"}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}

          {/* ── TASKS SECTION ── */}
          <div className="flex items-center" style={{ paddingTop: 14, paddingBottom: 4 }}>
            <div style={{
              width: LEFT_W, flexShrink: 0,
              paddingRight: 14, textAlign: "right",
              fontSize: 9, fontWeight: 700, letterSpacing: "0.14em",
              color: "rgba(52,211,153,0.45)", textTransform: "uppercase",
            }}>
              משימות
            </div>
          </div>

          {tasks.length === 0 && !loading && (
            <div style={{ paddingRight: 14, paddingBottom: 12, fontSize: 12, color: "rgba(52,211,153,0.25)", textAlign: "right" }}>
              אין משימות לחודש זה
            </div>
          )}

          {tasks.map(task => {
            const bar = barGeometry(task.start_date, task.due_date!);
            const taskClient = task.client_id ? clients.find(c => c.id === task.client_id) : null;
            const ss = TASK_STATUS_STYLE[task.status];

            return (
              <div key={task.id} className="flex items-center" style={{
                borderBottom: "0.5px solid rgba(52,211,153,0.05)",
                minHeight: ROW_H,
              }}>
                {/* Label */}
                <div style={{
                  width: LEFT_W, flexShrink: 0,
                  display: "flex", alignItems: "center", gap: 6,
                  paddingRight: 14, paddingLeft: 8,
                }}>
                  {taskClient && (
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: taskClient.color, flexShrink: 0 }} />
                  )}
                  <span title={task.title} style={{
                    fontSize: 11,
                    color: task.status === "done" ? "rgba(167,139,250,0.3)" : "rgba(255,255,255,0.75)",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    textDecoration: task.status === "done" ? "line-through" : undefined,
                  }}>
                    {task.title}
                  </span>
                </div>

                {/* Grid */}
                <div style={{ position: "relative", flex: 1, height: ROW_H }}>
                  {days.map(d => {
                    const date = new Date(year, month, d);
                    const isWeekend = date.getDay() === 5 || date.getDay() === 6;
                    return (
                      <div key={d} style={{
                        position: "absolute", left: (d - 1) * DAY_W, top: 0, bottom: 0, width: DAY_W,
                        borderLeft: "0.5px solid rgba(167,139,250,0.04)",
                        background: d - 1 === todayCol ? "rgba(124,58,237,0.07)" : isWeekend ? "rgba(255,255,255,0.01)" : undefined,
                      }} />
                    );
                  })}

                  {/* Task bar */}
                  {bar && (
                    <div title={task.title} style={{
                      position: "absolute",
                      left: bar.left, width: bar.width,
                      top: "50%", transform: "translateY(-50%)",
                      height: 22,
                      borderRadius: 7,
                      background: ss.bg,
                      border: `0.5px solid ${ss.border}`,
                      display: "flex", alignItems: "center",
                      paddingRight: 8, paddingLeft: 8,
                      overflow: "hidden",
                    }}>
                      <span style={{ fontSize: 9, color: ss.color, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {task.title}
                      </span>
                    </div>
                  )}

                  {/* No bar: show a diamond on due_date */}
                  {!bar && task.due_date && (() => {
                    const d = new Date(task.due_date + "T12:00:00");
                    if (d.getFullYear() !== year || d.getMonth() !== month) return null;
                    const col = d.getDate() - 1;
                    return (
                      <div style={{
                        position: "absolute",
                        left: col * DAY_W + DAY_W / 2 - 6,
                        top: "50%", transform: "translateY(-50%) rotate(45deg)",
                        width: 12, height: 12,
                        background: ss.bg,
                        border: `1px solid ${ss.border}`,
                        borderRadius: 2,
                      }} />
                    );
                  })()}
                </div>
              </div>
            );
          })}

          {/* Bottom padding */}
          <div style={{ height: 24 }} />
        </div>
      </div>
    </div>
  );
}
