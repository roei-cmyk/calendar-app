"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Notification {
  id: string;
  post_id: string;
  post_title: string;
  comment_body: string;
  is_read: boolean;
  created_at: string;
}

export const NotificationBell = memo(function NotificationBell({ onOpenPost }: { onOpenPost?: (postId: string) => void }) {
  const [notes, setNotes] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [pulse, setPulse] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Stable client instance — never recreated
  const supabase = useMemo(() => createClient(), []);

  async function load() {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setNotes(data as Notification[]);
  }

  // Initial load + fallback polling every 15s
  useEffect(() => {
    load();
    const id = setInterval(load, 15_000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Realtime subscription (requires table in supabase_realtime publication)
  useEffect(() => {
    const channel = supabase
      .channel("knbl-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          const n = payload.new as Notification;
          setNotes(prev => [n, ...prev.slice(0, 19)]);
          setPulse(true);
          setTimeout(() => setPulse(false), 4000);
        }
      )
      .subscribe((status) => {
        // If realtime fails, polling above is the fallback
        if (status === "CHANNEL_ERROR") console.warn("Realtime unavailable, using polling fallback");
      });

    return () => { channel.unsubscribe(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  function toggleOpen() {
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen && unread > 0) setTimeout(markAllRead, 1500);
  }

  return (
    <div ref={ref} className="relative">
      {/* Bell button */}
      <button
        onClick={toggleOpen}
        title="התראות"
        className={`relative flex h-9 w-9 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-110 active:scale-95 ${pulse ? "animate-bounce" : ""}`}
        style={{
          background: "linear-gradient(135deg, #3b82f6 0%, #7c3aed 50%, #ec4899 100%)",
          boxShadow: "0 4px 14px rgba(124,58,237,0.5)",
        }}
      >
        {/* Bell SVG — white */}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
        </svg>
        {unread > 0 && (
          <span
            className="absolute -right-1 -top-1 flex h-[18px] w-[18px] items-center justify-center rounded-full text-[9px] font-bold text-white"
            style={{ background: "linear-gradient(135deg,#f97316,#ef4444)", boxShadow: "0 2px 6px rgba(239,68,68,0.6)" }}
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="fixed left-4 top-16 z-[9999] w-80 overflow-hidden rounded-2xl border border-[#ddd6fe] bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#f3f0ff] px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-[#1e1b4b]">התראות</span>
              {unread > 0 && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white">
                  {unread}
                </span>
              )}
            </div>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs text-[#7c3aed] hover:underline">
                סמן הכל כנקרא
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto">
            {notes.length === 0 && (
              <div className="flex flex-col items-center gap-2 px-4 py-8">
                <span className="text-2xl">🔔</span>
                <p className="text-sm text-gray-400">אין התראות</p>
              </div>
            )}
            {notes.map(n => (
              <div
                key={n.id}
                onClick={() => { setOpen(false); onOpenPost?.(n.post_id); }}
                className={`border-b border-[#f9f7ff] px-4 py-3 transition cursor-pointer hover:bg-[#f5f3ff] ${!n.is_read ? "bg-[#fdf8ff]" : "bg-white"}`}
              >
                <div className="flex items-start gap-2">
                  {!n.is_read && (
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#7c3aed]" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-[#4c1d95]">💬 {n.post_title}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-gray-600">{n.comment_body}</p>
                    <p className="mt-1 text-[10px] text-gray-400" dir="ltr">
                      {new Date(n.created_at).toLocaleString("he-IL")}
                    </p>
                    {onOpenPost && (
                      <p className="mt-1 text-[10px] text-[#7c3aed] font-medium">לחץ לפתיחת הפוסט ←</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});
