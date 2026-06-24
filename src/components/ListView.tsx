"use client";

import { useEffect, useState } from "react";
import type { Client, Post, PostStatus } from "@/lib/types";
import { POST_STATUS_LABELS } from "@/lib/types";
import { updateSortOrders } from "@/lib/posts";

const STATUS_STYLE: Record<PostStatus, { bg: string; color: string }> = {
  draft:     { bg: "rgba(75,72,105,0.35)",  color: "#9d9abf" },
  pending:   { bg: "rgba(91,33,182,0.25)",  color: "#c4b5fd" },
  approved:  { bg: "rgba(16,185,129,0.2)",  color: "#6ee7b7" },
  scheduled: { bg: "rgba(124,58,237,0.2)",  color: "#a78bfa" },
  published: { bg: "rgba(109,40,217,0.45)", color: "#e9d5ff" },
};

function DragHandle() {
  return (
    <div className="flex shrink-0 flex-col gap-[3px] opacity-25 group-hover:opacity-60 transition-opacity cursor-grab mt-0.5">
      {[0,1,2].map(i => (
        <div key={i} className="h-[2px] w-4 rounded-full bg-white" />
      ))}
    </div>
  );
}

export function ListView({
  posts: initialPosts,
  client,
  canEdit,
  onSelectPost,
  onOrderChanged,
}: {
  posts: Post[];
  client: Client | null;
  canEdit: boolean;
  onSelectPost: (post: Post) => void;
  onOrderChanged: (posts: Post[]) => void;
}) {
  const [items, setItems]         = useState<Post[]>(initialPosts);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [saving, setSaving]       = useState(false);

  useEffect(() => { setItems(initialPosts); }, [initialPosts]);

  if (!client) {
    return (
      <div className="flex h-full items-center justify-center text-center">
        <div>
          <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.4 }}>📋</div>
          <p style={{ color: "rgba(167,139,250,0.5)", fontSize: 14 }}>בחר לקוח מהסייד-בר לצפייה ברשימה</p>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p style={{ color: "rgba(167,139,250,0.4)", fontSize: 14 }}>אין פוסטים ללקוח זה</p>
      </div>
    );
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    setOverIndex(index);
  }

  function handleDrop(e: React.DragEvent, targetIndex: number) {
    e.preventDefault();
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null);
      setOverIndex(null);
      return;
    }
    const next = [...items];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(targetIndex, 0, moved);
    setItems(next);
    setDragIndex(null);
    setOverIndex(null);
    const updates = next.map((p, i) => ({ id: p.id, sort_order: i }));
    setSaving(true);
    updateSortOrders(updates).finally(() => setSaving(false));
    onOrderChanged(next);
  }

  return (
    <div className="scroll-thin flex-1 overflow-y-auto px-4 py-3">
      {/* Header */}
      <div className="mx-auto mb-3 flex max-w-2xl items-center justify-between">
        <span style={{ color: "rgba(167,139,250,0.5)", fontSize: 12 }}>
          {items.length} פוסטים
          {canEdit && " · גרור לשינוי סדר עבודה"}
        </span>
        {saving && (
          <span style={{ color: "rgba(167,139,250,0.5)", fontSize: 11 }}>שומר סדר…</span>
        )}
      </div>

      <div className="mx-auto max-w-2xl space-y-2">
        {items.map((post, index) => {
          const isDragging = dragIndex === index;
          const isOver     = overIndex === index && dragIndex !== null && dragIndex !== index;
          const s          = STATUS_STYLE[post.status];
          const isVideo    = post.media_url && /\.(mp4|mov|avi|webm|mkv)$/i.test(post.media_url);

          return (
            <div
              key={post.id}
              className="group"
              draggable={canEdit}
              onDragStart={() => setDragIndex(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={() => { setDragIndex(null); setOverIndex(null); }}
              onClick={() => onSelectPost(post)}
              style={{
                borderRadius: 12,
                padding: "10px 14px",
                cursor: "pointer",
                transition: "all 0.15s",
                opacity: isDragging ? 0.35 : 1,
                transform: isOver ? "scale(1.01)" : "scale(1)",
                background: isOver
                  ? "rgba(124,58,237,0.22)"
                  : "rgba(255,255,255,0.04)",
                border: isOver
                  ? "1px solid rgba(124,58,237,0.55)"
                  : "0.5px solid rgba(167,139,250,0.13)",
              }}
            >
              <div className="flex items-start gap-3">
                {canEdit && <DragHandle />}

                {/* Thumbnail */}
                {post.media_url && !isVideo && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={post.media_url}
                    alt=""
                    style={{
                      width: 52, height: 52, borderRadius: 8,
                      objectFit: "cover", flexShrink: 0,
                      border: "0.5px solid rgba(255,255,255,0.1)",
                    }}
                  />
                )}
                {isVideo && (
                  <div style={{
                    width: 52, height: 52, borderRadius: 8, flexShrink: 0,
                    background: "rgba(124,58,237,0.2)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 20,
                  }}>🎬</div>
                )}

                {/* Content */}
                <div className="min-w-0 flex-1">
                  {/* Meta row */}
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span style={{ fontSize: 11, color: "rgba(167,139,250,0.55)" }}>
                      {new Date(post.scheduled_date + "T12:00:00").toLocaleDateString("he-IL", {
                        weekday: "short", day: "numeric", month: "short",
                      })}
                      {post.scheduled_time && (
                        <span dir="ltr"> · {post.scheduled_time.slice(0, 5)}</span>
                      )}
                    </span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, borderRadius: 999,
                      padding: "1px 8px", background: s.bg, color: s.color,
                    }}>
                      {POST_STATUS_LABELS[post.status]}
                    </span>
                    {!!post.comment_count && (
                      <span style={{ fontSize: 10, color: "rgba(167,139,250,0.4)" }}>
                        💬 {post.comment_count}
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <p style={{
                    fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.9)",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {post.title}
                  </p>

                  {/* Body preview */}
                  {post.body && (
                    <p style={{
                      fontSize: 11, marginTop: 2, color: "rgba(196,181,253,0.55)",
                      display: "-webkit-box", WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical", overflow: "hidden",
                    }}>
                      {post.body}
                    </p>
                  )}

                  {/* Platform */}
                  {post.platform && (
                    <p style={{ fontSize: 10, marginTop: 4, color: "rgba(167,139,250,0.35)" }}>
                      {post.platform}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
