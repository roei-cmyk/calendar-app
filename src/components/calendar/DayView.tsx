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
  onSelectPost: (post: Post) => void;
  onCreateForDate: (date: string) => void;
  // accepted for prop-spread parity with Month/Week views (unused here)
  onMovePost?: (postId: string, newDate: string) => void;
}) {
  const key = toISODate(current);
  const posts = postsByDate.get(key) ?? [];

  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold tracking-tight text-ink">
          {dayLabel(current)}
        </h2>
        {canEdit && (
          <button onClick={() => onCreateForDate(key)} className="btn-primary px-3 py-1.5">
            + פוסט חדש
          </button>
        )}
      </div>
      <div className="scroll-thin flex flex-1 flex-col gap-2 overflow-y-auto">
        {posts.length === 0 ? (
          <div className="mt-20 text-center text-sm text-ink-faint">
            אין פוסטים מתוזמנים ליום זה
          </div>
        ) : (
          posts.map((p) => (
            <PostCard
              key={p.id}
              post={p}
              client={clientsById.get(p.client_id)}
              onClick={() => onSelectPost(p)}
            />
          ))
        )}
      </div>
    </div>
  );
}
