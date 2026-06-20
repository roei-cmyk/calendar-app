"use client";

import type { Client, Post } from "@/lib/types";
import { dayLabel, toISODate } from "@/lib/date";
import { PostCard } from "@/components/PostCard";

export function DayView({
  current,
  postsByDate,
  clientsById,
  canEdit,
  onSelectPost,
  onCreateForDate,
}: {
  current: Date;
  postsByDate: Map<string, Post[]>;
  clientsById: Map<string, Client>;
  canEdit: boolean;
  onSelectPost?: (post: Post) => void;
  onCreateForDate: (date: string) => void;
  // accepted for prop-spread parity with Month/Week views (unused here)
  onMovePost?: (postId: string, newDate: string) => void;
}) {
  const key = toISODate(current);
  const posts = postsByDate.get(key) ?? [];

  return (
    <div
      className="flex h-full flex-col"
      style={{ background: "transparent" }}
    >
      {/* Day header */}
      <div
        className="flex items-center justify-between border-b px-6 py-3"
        style={{ borderColor: "rgba(167,139,250,0.2)", background: "rgba(124,58,237,0.12)" }}
      >
        <h2 className="text-base font-black tracking-tight" style={{ color: "#e9d5ff" }}>
          {dayLabel(current)}
        </h2>
        {canEdit && (
          <button onClick={() => onCreateForDate(key)} className="btn-primary px-3 py-1.5 text-sm">
            + פוסט חדש
          </button>
        )}
      </div>
      {/* Posts list */}
      <div className="scroll-thin mx-auto flex w-full max-w-2xl flex-1 flex-col gap-2 overflow-y-auto p-5">
        {posts.length === 0 ? (
          <div className="mt-20 text-center text-sm" style={{ color: "rgba(167,139,250,0.4)" }}>
            אין פוסטים מתוזמנים ליום זה
          </div>
        ) : (
          posts.map((p) => (
            <PostCard
              key={p.id}
              post={p}
              client={clientsById.get(p.client_id)}
              onClick={onSelectPost ? () => onSelectPost(p) : undefined}
            />
          ))
        )}
      </div>
    </div>
  );
}
