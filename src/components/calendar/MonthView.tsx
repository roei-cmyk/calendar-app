"use client";

import { isSameMonth, isToday } from "date-fns";
import type { Client, Post } from "@/lib/types";
import { HEB_WEEKDAY_SHORT, monthGridDays, toISODate } from "@/lib/date";
import { PostCard } from "@/components/PostCard";

export function MonthView({
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
  const days = monthGridDays(current);

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-line bg-brand-lighter">
        {HEB_WEEKDAY_SHORT.map((d) => (
          <div
            key={d}
            className="py-2 text-center text-xs font-semibold text-brand"
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid flex-1 grid-cols-7 grid-rows-6">
        {days.map((day) => {
          const key = toISODate(day);
          const posts = postsByDate.get(key) ?? [];
          const inMonth = isSameMonth(day, current);
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
              className={`group/cell scroll-thin flex flex-col gap-1 overflow-y-auto border-b border-s border-line p-1.5 transition ${
                inMonth ? "bg-white hover:bg-brand-lighter/30" : "bg-canvas/60"
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-medium ${
                    isToday(day)
                      ? "bg-brand text-white shadow-sm"
                      : inMonth
                        ? "text-ink-muted"
                        : "text-ink-faint"
                  }`}
                >
                  {day.getDate()}
                </span>
                {canEdit && (
                  <button
                    onClick={() => onCreateForDate(key)}
                    className="flex h-5 w-5 items-center justify-center rounded-full text-brand opacity-0 transition hover:bg-brand-lighter group-hover/cell:opacity-100"
                    title="הוספת פוסט"
                  >
                    +
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-1">
                {posts.map((p) => (
                  <PostCard
                    key={p.id}
                    post={p}
                    client={clientsById.get(p.client_id)}
                    onClick={() => onSelectPost(p)}
                    compact
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
    </div>
  );
}
