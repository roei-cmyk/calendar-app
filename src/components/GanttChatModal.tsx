"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Client } from "@/lib/types";

type ChatMessage = { role: "user" | "assistant"; content: string };

type DraftPost = {
  title: string;
  body: string;
  platform: string;
  post_type?: string;
  scheduled_date: string;
  scheduled_time?: string;
  image_prompt?: string;
};

const HEB_MONTHS = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];
const HEB_DAYS   = ["ראשון","שני","שלישי","רביעי","חמישי","שישי","שבת"];

const PLATFORM_COLORS: Record<string, string> = {
  instagram: "#e1306c",
  facebook:  "#1877f2",
  tiktok:    "#69c9d0",
  linkedin:  "#0077b5",
  twitter:   "#1da1f2",
};
const PLATFORM_LABELS: Record<string, string> = {
  instagram: "אינסטגרם",
  facebook:  "פייסבוק",
  tiktok:    "טיקטוק",
  linkedin:  "לינקדאין",
  twitter:   "X",
};
const POST_TYPE_LABELS: Record<string, string> = {
  tip: "טיפ", promo: "מבצע", story: "סיפור",
  testimonial: "עדות", engagement: "אינטרקציה",
  seasonal: "עונתי", product: "מוצר", educational: "חינוכי",
};

function buildMonths() {
  const now = new Date();
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + i - 1, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return { value: `${y}-${m}`, label: `${HEB_MONTHS[d.getMonth()]} ${y}` };
  });
}
const MONTHS = buildMonths();

export function GanttChatModal({
  clients,
  defaultClientId,
  defaultMonth,
  onClose,
  onDone,
}: {
  clients: Client[];
  defaultClientId: string | null;
  defaultMonth?: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [clientId, setClientId] = useState(defaultClientId ?? clients[0]?.id ?? "");
  const [month, setMonth] = useState(() => {
    if (defaultMonth && MONTHS.find(m => m.value === defaultMonth)) return defaultMonth;
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const [messages,   setMessages]   = useState<ChatMessage[]>([]);
  const [draftPosts, setDraftPosts] = useState<DraftPost[]>([]);
  const [input,      setInput]      = useState("");
  const [loading,    setLoading]    = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [savedOk,    setSavedOk]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLTextAreaElement>(null);
  const startedRef     = useRef(false);

  const monthLabel = MONTHS.find(m => m.value === month)?.label ?? month;

  const callAPI = useCallback(async (msgs: ChatMessage[]) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/gantt/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, month, messages: msgs }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text ? JSON.parse(text).error ?? `שגיאת שרת ${res.status}` : `timeout — הבקשה לקחה יותר מדי זמן (${res.status})`);
      }
      const data = await res.json();
      if (data.reply) {
        setMessages(prev => [
          ...prev.filter(m => m.content !== "__start__"),
          { role: "assistant", content: data.reply },
        ]);
      }
      if (Array.isArray(data.posts) && data.posts.length) {
        setDraftPosts(data.posts);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [clientId, month]);

  const startChat = useCallback(async () => {
    setMessages([{ role: "user", content: "__start__" }]);
    setDraftPosts([]);
    setSavedOk(false);
    await callAPI([{ role: "user", content: "__start__" }]);
  }, [callAPI]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    startChat();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;
    const userMsg: ChatMessage = { role: "user", content: text };
    const next = [...messages.filter(m => m.content !== "__start__"), userMsg];
    setMessages(next);
    setInput("");
    await callAPI(next);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  async function handleRestart() {
    startedRef.current = false;
    startedRef.current = true;
    setMessages([]);
    setDraftPosts([]);
    setSavedOk(false);
    await callAPI([{ role: "user", content: "__start__" }]);
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  async function saveGantt() {
    if (!draftPosts.length || saving || savedOk) return;
    setSaving(true);
    try {
      const res = await fetch("/api/gantt/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, month, posts: draftPosts }),
      });
      const data = await res.json();
      if (data.success) {
        setSavedOk(true);
        setTimeout(() => { onDone(); onClose(); }, 1600);
      } else {
        setError(data.error ?? "שגיאה בשמירה");
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }

  function formatDate(dateStr: string) {
    try {
      const d = new Date(dateStr + "T12:00:00");
      const day = parseInt(dateStr.split("-")[2]);
      return `${day} — ${HEB_DAYS[d.getDay()]}`;
    } catch { return dateStr; }
  }

  const visibleMessages = messages.filter(m => m.content !== "__start__");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(10px)" }}
    >
      <div
        className="relative w-full flex flex-col rounded-2xl overflow-hidden"
        style={{
          background: "#0d0620",
          border: "1px solid rgba(124,58,237,0.35)",
          maxWidth: "1300px",
          height: "92vh",
        }}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center justify-between px-5 py-3 shrink-0"
          style={{ borderBottom: "1px solid rgba(124,58,237,0.2)" }}
        >
          <div className="flex items-center gap-3" dir="rtl">
            <span className="text-xl">💬</span>
            <span className="text-white font-bold">תכנון גאנט עם AI</span>
            <span className="text-purple-400 text-sm">—</span>

            {/* Client selector */}
            <select
              value={clientId}
              onChange={e => { setClientId(e.target.value); }}
              className="text-sm rounded-lg px-3 py-1.5 outline-none"
              style={{ background: "#1a0a35", color: "#c4b5fd", border: "1px solid rgba(124,58,237,0.3)" }}
            >
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>

            {/* Month selector */}
            <select
              value={month}
              onChange={e => setMonth(e.target.value)}
              className="text-sm rounded-lg px-3 py-1.5 outline-none"
              style={{ background: "#1a0a35", color: "#c4b5fd", border: "1px solid rgba(124,58,237,0.3)" }}
            >
              {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>

          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors text-2xl leading-none"
          >×</button>
        </div>

        {/* ── Body ── */}
        <div className="flex flex-1 overflow-hidden" dir="rtl">

          {/* ── Chat panel (right, 55%) ── */}
          <div
            className="flex flex-col w-[55%] shrink-0"
            style={{ borderLeft: "1px solid rgba(124,58,237,0.15)" }}
          >
            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
              {visibleMessages.length === 0 && loading && (
                <div className="flex justify-center py-8 opacity-50">
                  <span className="text-sm text-purple-300">מנהל התוכן חושב...</span>
                </div>
              )}

              {visibleMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-start" : "justify-end"}`}>
                  <div
                    className="max-w-[82%] text-sm leading-relaxed whitespace-pre-wrap"
                    style={{
                      background: msg.role === "user"
                        ? "rgba(124,58,237,0.22)"
                        : "rgba(255,255,255,0.06)",
                      color: msg.role === "user" ? "#e9d5ff" : "#d1d5db",
                      borderRadius: msg.role === "user"
                        ? "18px 18px 4px 18px"
                        : "18px 18px 18px 4px",
                      padding: "12px 16px",
                    }}
                  >
                    {msg.role === "assistant" && (
                      <div className="flex items-center gap-1.5 mb-2 text-xs opacity-50">
                        <span>🤖</span>
                        <span>מנהל התוכן AI</span>
                      </div>
                    )}
                    {msg.content}
                  </div>
                </div>
              ))}

              {loading && visibleMessages.length > 0 && (
                <div className="flex justify-end">
                  <div
                    className="px-5 py-3 rounded-2xl"
                    style={{ background: "rgba(255,255,255,0.06)" }}
                  >
                    <div className="flex items-center gap-1.5">
                      {[0, 1, 2].map(i => (
                        <div
                          key={i}
                          className="w-2 h-2 rounded-full animate-bounce"
                          style={{ background: "#7c3aed", animationDelay: `${i * 0.15}s` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="text-xs text-red-400 text-center py-2 opacity-80">{error}</div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div
              className="px-4 py-3 shrink-0"
              style={{ borderTop: "1px solid rgba(124,58,237,0.15)" }}
            >
              <div className="flex gap-2 items-end">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
                  }}
                  placeholder="בקש שינוי... לדוגמה: שנה את פוסט 3 לסטורי, תוסיף פוסט על חנוכה..."
                  rows={2}
                  disabled={loading}
                  className="flex-1 resize-none rounded-xl px-4 py-2.5 text-sm outline-none"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    color: "#e9d5ff",
                    border: "1px solid rgba(124,58,237,0.3)",
                    lineHeight: "1.5",
                  }}
                />
                <button
                  onClick={sendMessage}
                  disabled={loading || !input.trim()}
                  className="px-4 py-2.5 rounded-xl text-sm font-bold transition-all shrink-0"
                  style={{
                    background: loading || !input.trim() ? "rgba(124,58,237,0.15)" : "#7c3aed",
                    color: loading || !input.trim() ? "#7c3aed" : "white",
                  }}
                >
                  שלח ↵
                </button>
              </div>
              <div className="flex justify-between items-center mt-2 px-1">
                <span className="text-xs" style={{ color: "#4b5563" }}>Shift+Enter לשורה חדשה</span>
                <button
                  onClick={handleRestart}
                  disabled={loading}
                  className="text-xs transition-colors"
                  style={{ color: "#6b7280" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#a78bfa")}
                  onMouseLeave={e => (e.currentTarget.style.color = "#6b7280")}
                >
                  ↺ התחל מחדש
                </button>
              </div>
            </div>
          </div>

          {/* ── Posts preview panel (left, 45%) ── */}
          <div className="flex flex-col w-[45%]">
            {/* Panel header */}
            <div
              className="flex items-center justify-between px-4 py-3 shrink-0"
              style={{ borderBottom: "1px solid rgba(124,58,237,0.15)" }}
            >
              <span className="text-sm font-semibold" style={{ color: "#9ca3af" }}>
                {draftPosts.length > 0
                  ? `${draftPosts.length} פוסטים — ${monthLabel}`
                  : "טיוטת הפוסטים תופיע כאן"}
              </span>

              {draftPosts.length > 0 && (
                <button
                  onClick={saveGantt}
                  disabled={saving || savedOk}
                  className="px-4 py-2 rounded-xl text-sm font-bold transition-all"
                  style={{
                    background: savedOk
                      ? "#10b981"
                      : "linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)",
                    color: "white",
                    opacity: saving ? 0.7 : 1,
                    boxShadow: savedOk ? "none" : "0 0 20px rgba(124,58,237,0.4)",
                  }}
                >
                  {savedOk ? "✅ נשמר!" : saving ? "שומר..." : "✅ אשר גאנט"}
                </button>
              )}
            </div>

            {/* Posts list */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {draftPosts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 opacity-30">
                  <span className="text-5xl">📅</span>
                  <p className="text-sm" style={{ color: "#9ca3af" }}>
                    {loading ? "ה-AI מכין הצעה..." : "הפוסטים יופיעו כאן"}
                  </p>
                </div>
              ) : (
                draftPosts.map((post, i) => {
                  const color = PLATFORM_COLORS[post.platform] ?? "#7c3aed";
                  return (
                    <div
                      key={i}
                      className="rounded-xl p-3 text-sm transition-all"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.07)",
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.07)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                    >
                      {/* Row 1: date + platform + type */}
                      <div className="flex items-center justify-between mb-1.5 gap-2">
                        <span className="font-mono text-xs" style={{ color: "#6b7280" }}>
                          {post.scheduled_date ? formatDate(post.scheduled_date) : ""}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {post.post_type && (
                            <span
                              className="text-xs px-1.5 py-0.5 rounded"
                              style={{ background: "rgba(255,255,255,0.07)", color: "#9ca3af" }}
                            >
                              {POST_TYPE_LABELS[post.post_type] ?? post.post_type}
                            </span>
                          )}
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{ background: `${color}28`, color }}
                          >
                            {PLATFORM_LABELS[post.platform] ?? post.platform}
                          </span>
                        </div>
                      </div>

                      {/* Title */}
                      <div
                        className="font-semibold text-sm leading-snug mb-1"
                        style={{ color: "#e5e7eb" }}
                      >
                        {post.title}
                      </div>

                      {/* Body preview */}
                      {post.body && (
                        <div
                          className="text-xs leading-relaxed line-clamp-2"
                          style={{ color: "#6b7280" }}
                        >
                          {post.body}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
