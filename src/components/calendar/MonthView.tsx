"use client";

import { isSameMonth, isToday } from "date-fns";
import { useState } from "react";
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
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  return (
    <div
      className="flex h-full flex-col"
      style={{
        background: "radial-gradient(ellipse at 30% 40%, #3b0764 0%, transparent 60%), radial-gradient(ellipse at 80% 70%, #2e1065 0%, transparent 50%), #0f0520",
      }}
    >
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-white/10">
        {HEB_WEEKDAY_SHORT.map((d) => (
          <div
            key={d}
            className="py-2 text-center text-xs font-bold tracking-wide"
            style={{ color: "#a78bfa" }}
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
              onMouseEnter={() => setHoveredDate(key)}
              onMouseLeave={() => setHoveredDate(null)}
              className="group/cell scroll-thin flex flex-col gap-1 overflow-y-auto border-b border-s p-1.5 transition cursor-pointer"
              style={{
                borderColor: "rgba(167,139,250,0.15)",
                background: key === hoveredDate
                  ? "rgba(124,58,237,0.22)"
                  : today
                    ? "rgba(124,58,237,0.1)"
                    : inMonth
                      ? "rgba(255,255,255,0.04)"
                      : "rgba(0,0,0,0.15)",
                boxShadow: key === hoveredDate
                  ? "inset 0 0 0 1px rgba(167,139,250,0.5)"
                  : today
                    ? "inset 0 0 0 1px rgba(167,139,250,0.2)"
                    : undefined,
              }}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs font-bold`}
                  style={{
                    background: today ? "rgba(167,139,250,0.35)" : undefined,
                    color: today ? "#ffffff" : inMonth ? "rgba(255,255,255,0.85)" : "rgba(167,139,250,0.4)",
                    boxShadow: today ? "0 0 10px rgba(124,58,237,0.6)" : undefined,
                  }}
                >
                  {day.getDate()}
                </span>
                {canEdit && (
                  <button
                    onClick={() => onCreateForDate(key)}
                    className="flex h-5 w-5 items-center justify-center rounded-full opacity-0 transition group-hover/cell:opacity-100"
                    style={{ color: "#a78bfa" }}
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
