"use client";

import { isToday } from "date-fns";
import type { Client, Post } from "@/lib/types";
import { HEB_WEEKDAY_SHORT, toISODate, weekDays } from "@/lib/date";
import { PostCard } from "@/components/PostCard";

export function WeekView({
  current,
  postsByDate,
  clientsById,
  canEdit,
  onSelectPost,
  onCreateForDate,
  onMovePost,
}: {
  current: Date;
  postsByDate: Map<string, Post[]>;
  clientsById: Map<string, Client>;
  canEdit: boolean;
  onSelectPost: (post: Post) => void;
  onCreateForDate: (date: string) => void;
  onMovePost?: (postId: string, newDate: string) => void;
}) {
  const days = weekDays(current);

  return (
    <div
      className="grid h-full grid-cols-7"
      style={{
        background: "radial-gradient(ellipse at 30% 40%, #3b0764 0%, transparent 60%), radial-gradient(ellipse at 80% 70%, #2e1065 0%, transparent 50%), #0f0520",
      }}
    >
      {days.map((day, i) => {
        const key = toISODate(day);
        const posts = postsByDate.get(key) ?? [];
        const today = isToday(day);
        return (
          <div
            key={key}
            onDragOver={
              canEdit && onMovePost ? (e) => e.preventDefault() : undefined
            }
            onDrop={
              canEdit && onMovePost
                ? (e) => {
                    e.preventDefault();
                    const id = e.dataTransfer.getData("text/post-id");
                    if (id) onMovePost(id, key);
                  }
                : undefined
            }
            className="flex flex-col border-s transition"
            style={{
              borderColor: "rgba(167,139,250,0.15)",
              background: today ? "rgba(124,58,237,0.18)" : "rgba(255,255,255,0.04)",
              boxShadow: today ? "inset 0 0 0 1px rgba(167,139,250,0.35)" : undefined,
            }}
          >
            <div
              className="flex items-center justify-between border-b px-2.5 py-2.5"
              style={{ borderColor: "rgba(167,139,250,0.2)" }}
            >
              <span className="flex items-center gap-1.5">
                <span className="text-xs font-bold tracking-wide" style={{ color: "#a78bfa" }}>{HEB_WEEKDAY_SHORT[i]}</span>
                <span
                  className="flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-sm font-bold"
                  style={today ? {
                    background: "rgba(167,139,250,0.35)",
                    color: "#ffffff",
                    boxShadow: "0 0 10px rgba(124,58,237,0.6)",
                  } : {
                    color: "rgba(255,255,255,0.8)",
                  }}
                >
                  {day.getDate()}
                </span>
              </span>
              {canEdit && (
                <button
                  onClick={() => onCreateForDate(key)}
                  className="flex h-5 w-5 items-center justify-center rounded-full opacity-50 transition hover:opacity-100"
                  style={{ color: "#a78bfa" }}
                  title="הוספת פוסט"
                >
                  +
                </button>
              )}
            </div>
            <div className="scroll-thin flex flex-1 flex-col gap-1.5 overflow-y-auto p-1.5">
              {posts.length === 0 && (
                <p className="mt-4 text-center text-[11px]" style={{ color: "rgba(167,139,250,0.3)" }}>—</p>
              )}
              {posts.map((p) => (
                <PostCard
                  key={p.id}
                  post={p}
                  client={clientsById.get(p.client_id)}
                  onClick={() => onSelectPost(p)}
                  draggable={canEdit && !!onMovePost}
                  onDragStart={(e) =>
                    e.dataTransfer.setData("text/post-id", p.id)
                  }
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
