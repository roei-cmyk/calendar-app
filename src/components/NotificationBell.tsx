"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Notification {
  id: string;
  post_id: string;
  post_title: string;
  comment_body: string;
  is_read: boolean;
  created_at: string;
}

export function NotificationBell() {
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
        className={`relative flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20 ${pulse ? "animate-bounce" : ""}`}
        title="התראות"
      >
        🔔
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 top-10 z-50 w-80 overflow-hidden rounded-2xl border border-[#ddd6fe] bg-white shadow-2xl">
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
                className={`border-b border-[#f9f7ff] px-4 py-3 transition hover:bg-[#f5f3ff] ${!n.is_read ? "bg-[#fdf8ff]" : "bg-white"}`}
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
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
