"use client";

import type { Client, Post } from "@/lib/types";
import { POST_STATUS_LABELS } from "@/lib/types";

const STATUS_CHIP: Record<Post["status"], { bg: string; text: string }> = {
  draft:     { bg: "rgba(107,114,128,0.15)", text: "#9ca3af" },
  pending:   { bg: "rgba(167,139,250,0.2)",  text: "#c4b5fd" },
  approved:  { bg: "rgba(52,211,153,0.18)",  text: "#6ee7b7" },
  scheduled: { bg: "rgba(251,191,36,0.18)",  text: "#fcd34d" },
  published: { bg: "rgba(124,58,237,0.35)",  text: "#e9d5ff" },
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
  const color = client?.color ?? "#7c3aed";
  const chip = STATUS_CHIP[post.status];

  return (
    <button
      onClick={onClick}
      draggable={draggable}
      onDragStart={onDragStart}
      style={{
        background: `linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.03) 100%)`,
        borderColor: `${color}55`,
        boxShadow: `0 2px 8px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.08)`,
      }}
      className={`relative group w-full rounded-xl border backdrop-blur-sm text-right transition-all duration-150
        hover:brightness-110 hover:-translate-y-0.5 hover:shadow-lg
        ${draggable ? "cursor-grab active:cursor-grabbing" : ""}
        ${compact ? "px-2 py-1 text-[11px]" : "px-2.5 py-2 text-xs"}`}
    >
      {/* top accent line */}
      <div
        className="absolute inset-x-0 top-0 h-[2px] rounded-t-xl opacity-70"
        style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}
      />

      <div className="flex items-start justify-between gap-1">
        <div className="flex shrink-0 flex-col items-end gap-1">
          {!!post.comment_count && (
            <span className="flex items-center gap-0.5 text-[10px] text-white/50">
              <span>💬</span>
              <span>{post.comment_count}</span>
            </span>
          )}
          {post.scheduled_time && (
            <span className="text-[10px] text-white/40 font-mono" dir="ltr">
              {post.scheduled_time.slice(0, 5)}
            </span>
          )}
        </div>

        <span
          className={`truncate font-bold text-white leading-snug ${compact ? "text-[11px]" : "text-[12px]"}`}
        >
          {post.title}
        </span>
      </div>

      {post.media_url && !compact && (
        <div className="mt-1.5 overflow-hidden rounded-lg border border-white/10">
          {/\.(mp4|mov|avi|webm|mkv)$/i.test(post.media_url) ? (
            <div className="flex h-9 items-center justify-center gap-1.5 bg-black/30 text-[10px] text-white/60">
              <span>▶</span>
              <span>סרטון</span>
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.media_url}
              alt=""
              className="h-12 w-full object-cover"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
            />
          )}
        </div>
      )}

      {!compact && (
        <div className="mt-1.5 flex items-center justify-between gap-1">
          {client && (
            <span className="flex min-w-0 items-center gap-1 text-[10px] text-white/40">
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="truncate">{client.name}</span>
            </span>
          )}
          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wide"
            style={{ background: chip.bg, color: chip.text }}
          >
            {POST_STATUS_LABELS[post.status]}
          </span>
        </div>
      )}

      {compact && post.media_url && (
        <span className="text-[9px] text-white/40">
          {/\.(mp4|mov|avi|webm|mkv)$/i.test(post.media_url) ? "▶" : "🖼"}
        </span>
      )}
    </button>
  );
}
