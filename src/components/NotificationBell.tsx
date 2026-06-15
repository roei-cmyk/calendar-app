"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Notification {
  id: string;
  post_id: string;
  post_title: string;
  comment_body: string;
  is_read: boolean;
  created_at: string;
}

export function NotificationBell({ onNavigate }: { onNavigate?: (postId: string) => void }) {
  const [notes, setNotes] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setNotes(data as Notification[]);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  // Poll every 30s
  useEffect(() => {
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [load]);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const unread = notes.filter(n => !n.is_read).length;

  async function markAllRead() {
    const ids = notes.filter(n => !n.is_read).map(n => n.id);
    if (!ids.length) return;
    await supabase.from("notifications").update({ is_read: true }).in("id", ids);
    setNotes(prev => prev.map(n => ({ ...n, is_read: true })));
  }

  async function toggleOpen() {
    setOpen(v => !v);
    if (!open && unread > 0) {
      setTimeout(markAllRead, 2000);
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={toggleOpen}
        className="relative flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20"
        title="התראות"
      >
        🔔
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-10 z-50 w-80 overflow-hidden rounded-2xl border border-[#ddd6fe] bg-white shadow-2xl" style={{ right: "auto" }}>
          <div className="flex items-center justify-between border-b border-[#f3f0ff] px-4 py-3">
            <span className="text-sm font-bold text-[#1e1b4b]">התראות</span>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs text-[#7c3aed] hover:underline">
                סמן הכל כנקרא
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notes.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-gray-400">אין התראות</p>
            )}
            {notes.map(n => (
              <div
                key={n.id}
                className={`border-b border-[#f9f7ff] px-4 py-3 transition hover:bg-[#f5f3ff] ${!n.is_read ? "bg-[#faf5ff]" : ""}`}
              >
                {!n.is_read && (
                  <span className="mb-1 inline-block h-1.5 w-1.5 rounded-full bg-[#7c3aed]" />
                )}
                <p className="text-xs font-semibold text-[#4c1d95]">{n.post_title}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-gray-600">{n.comment_body}</p>
                <p className="mt-1 text-[10px] text-gray-400" dir="ltr">
                  {new Date(n.created_at).toLocaleString("he-IL")}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
