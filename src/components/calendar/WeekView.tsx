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
    <div className="grid h-full grid-cols-7 bg-white">
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
            className={`flex flex-col border-s border-line transition ${today ? "bg-brand-lighter/40" : "hover:bg-brand-lighter/20"}`}
          >
            <div className={`flex items-center justify-between border-b px-2.5 py-2.5 text-sm ${today ? "border-brand/20 bg-brand-lighter/60" : "border-line"}`}>
              <span className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-brand/70">{HEB_WEEKDAY_SHORT[i]}׳</span>
                <span
                  className={`flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-sm font-bold ${
                    today ? "bg-brand text-white shadow-sm" : "text-ink"
                  }`}
                >
                  {day.getDate()}
                </span>
              </span>
              {canEdit && (
                <button
                  onClick={() => onCreateForDate(key)}
                  className="flex h-5 w-5 items-center justify-center rounded-full text-brand opacity-60 transition hover:bg-brand-lighter hover:opacity-100"
                  title="הוספת פוסט"
                >
                  +
                </button>
              )}
            </div>
            <div className="scroll-thin flex flex-1 flex-col gap-1.5 overflow-y-auto p-1.5">
              {posts.length === 0 && (
                <p className="mt-4 text-center text-[11px] text-brand-light/40">—</p>
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
