"use client";

import type { Client, Post } from "@/lib/types";
import { POST_STATUS_LABELS } from "@/lib/types";

const STATUS_RING: Record<Post["status"], string> = {
  draft: "bg-gray-100 text-gray-500 ring-gray-200",
  pending: "bg-amber-100 text-amber-700 ring-amber-200",
  approved: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  scheduled: "bg-sky-100 text-sky-700 ring-sky-200",
  published: "bg-violet-100 text-violet-700 ring-violet-200",
};

export function PostCard({
  post,
  client,
  onClick,
  compact = false,
  draggable = false,
  onDragStart,
}: {
  post: Post;
  client?: Client;
  onClick?: () => void;
  compact?: boolean;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
}) {
  const color = client?.color ?? "#a78bfa";

  return (
    <button
      onClick={onClick}
      draggable={draggable}
      onDragStart={onDragStart}
      style={{ borderInlineStartColor: color }}
      className={`group w-full rounded-lg border border-line border-s-[3px] bg-white px-2 py-1.5 text-right shadow-card transition hover:shadow-cardHover hover:-translate-y-px ${
        draggable ? "cursor-grab active:cursor-grabbing" : ""
      } ${compact ? "text-[11px]" : "text-xs"}`}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="truncate font-semibold text-ink">{post.title}</span>
        <span className="flex shrink-0 items-center gap-1.5">
          {!!post.comment_count && (
            <span className="flex items-center gap-0.5 text-[10px] text-brand-light">
              <span>💬</span>
              {post.comment_count}
            </span>
          )}
          {post.scheduled_time && (
            <span className="text-[10px] text-ink-faint" dir="ltr">
              {post.scheduled_time.slice(0, 5)}
            </span>
          )}
        </span>
      </div>
      {post.media_url && !compact && (
        <div className="mt-1.5 overflow-hidden rounded-md border border-line">
          {/\.(mp4|mov|avi|webm|mkv)$/i.test(post.media_url) ? (
            <div className="flex h-9 items-center justify-center gap-1.5 bg-gray-900 text-[10px] text-white/70">
              <span>▶</span>
              <span>סרטון</span>
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.media_url}
              alt=""
              className="h-12 w-full object-cover"
            />
          )}
        </div>
      )}
      {!compact && (
        <div className="mt-1.5 flex items-center justify-between gap-1">
          {client && (
            <span className="flex min-w-0 items-center gap-1.5 text-[10px] text-ink-muted">
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="truncate">{client.name}</span>
            </span>
          )}
          <span
            className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium ring-1 ${STATUS_RING[post.status]}`}
          >
            {POST_STATUS_LABELS[post.status]}
          </span>
        </div>
      )}
      {compact && post.media_url && (
        <span className="text-[9px] text-ink-faint">
          {/\.(mp4|mov|avi|webm|mkv)$/i.test(post.media_url) ? "▶" : "🖼"}
        </span>
      )}
    </button>
  );
}
