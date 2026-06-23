"use client";

import { useEffect, useState } from "react";
import type { Client, Comment, Post, PostStatus, Profile } from "@/lib/types";
import { POST_STATUS_LABELS } from "@/lib/types";
import {
  addComment,
  createPost,
  deletePost,
  fetchComments,
  updatePost,
  type PostInput,
} from "@/lib/posts";

const STATUSES: PostStatus[] = ["draft", "pending", "approved", "scheduled", "published"];
const inputCls = "input-dark";

function parsePlatforms(raw: string | null): string[] {
  if (!raw) return [];
  return raw.split(",").map(s => s.trim()).filter(Boolean);
}

function PlatformIcon({ platform, size = 20 }: { platform: string; size?: number }) {
  const key = platform.toLowerCase();
  if (key === "פייסבוק" || key === "facebook") return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#1877F2" aria-label="פייסבוק"><path d="M24 12.073C24 5.404 18.627 0 12 0S0 5.404 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.887v2.267h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/></svg>
  );
  if (key === "אינסטגרם" || key === "instagram") return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-label="אינסטגרם"><defs><linearGradient id="ig" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stopColor="#FED373"/><stop offset="25%" stopColor="#F15245"/><stop offset="50%" stopColor="#D92E7F"/><stop offset="75%" stopColor="#9B36B7"/><stop offset="100%" stopColor="#515ECF"/></linearGradient></defs><rect width="24" height="24" rx="6" fill="url(#ig)"/><rect x="2.5" y="2.5" width="19" height="19" rx="4.5" fill="none" stroke="white" strokeWidth="1.5"/><circle cx="12" cy="12" r="4.5" fill="none" stroke="white" strokeWidth="1.5"/><circle cx="17.5" cy="6.5" r="1" fill="white"/></svg>
  );
  if (key === "טיקטוק" || key === "tiktok") return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-label="טיקטוק"><rect width="24" height="24" rx="6" fill="#010101"/><path d="M16.6 5.82s.51.5 0 0A4.278 4.278 0 0 1 15.54 3h-3.09v12.4a2.592 2.592 0 0 1-2.59 2.5 2.592 2.592 0 0 1-2.59-2.5 2.592 2.592 0 0 1 2.59-2.5c.28 0 .54.04.79.1V9.78a5.66 5.66 0 0 0-.79-.05 5.65 5.65 0 0 0-5.65 5.65 5.65 5.65 0 0 0 5.65 5.65 5.65 5.65 0 0 0 5.65-5.65V8.37a7.32 7.32 0 0 0 4.26 1.35V6.66s-2.12.05-3.16-0.84z" fill="white"/></svg>
  );
  if (key === "לינקדאין" || key === "linkedin") return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#0A66C2" aria-label="לינקדאין"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
  );
  if (key === "יוטיוב" || key === "youtube") return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#FF0000" aria-label="יוטיוב"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
  );
  if (key === "טוויטר" || key === "twitter" || key === "x") return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-label="X"><rect width="24" height="24" rx="6" fill="#000"/><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L2.25 2.25h6.846l4.262 5.633 5.886-5.633zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" fill="white"/></svg>
  );
  return null;
}

const PLATFORM_COLORS: Record<string, { bg: string; text: string }> = {
  פייסבוק:  { bg: "#E7F0FD", text: "#1877F2" },
  facebook:  { bg: "#E7F0FD", text: "#1877F2" },
  אינסטגרם: { bg: "#FDE9F4", text: "#D92E7F" },
  instagram: { bg: "#FDE9F4", text: "#D92E7F" },
  טיקטוק:   { bg: "#E8F8F8", text: "#010101" },
  tiktok:    { bg: "#E8F8F8", text: "#010101" },
  לינקדאין:  { bg: "#E8F2FB", text: "#0A66C2" },
  linkedin:  { bg: "#E8F2FB", text: "#0A66C2" },
  יוטיוב:   { bg: "#FDECEA", text: "#FF0000" },
  youtube:   { bg: "#FDECEA", text: "#FF0000" },
  טוויטר:   { bg: "#E7F5FE", text: "#000000" },
  twitter:   { bg: "#E7F5FE", text: "#000000" },
  x:         { bg: "#E7F5FE", text: "#000000" },
};

const STATUS_CHIP: Record<PostStatus, { cls: string; style?: React.CSSProperties }> = {
  draft:     { cls: "text-[#4B4869]",  style: { background: "#F1F0F5" } },
  pending:   { cls: "text-[#5B21B6]",  style: { background: "#EDE9FE" } },
  approved:  { cls: "text-[#a5b4fc]",  style: { background: "#1e1b4b" } },
  scheduled: { cls: "text-[#7C3AED]",  style: { background: "#F5F3FF" } },
  published: { cls: "text-white",       style: { background: "linear-gradient(135deg,#4c1d95,#7c3aed)" } },
};

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────
export function PostModal({
  post,
  defaultDate,
  defaultClientId,
  clients,
  profile,
  canEdit,
  onClose,
  onChanged,
}: {
  post: Post | null;
  defaultDate: string;
  defaultClientId: string | null;
  clients: Client[];
  profile: Profile;
  canEdit: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  return (
    <PostForm
      post={post}
      isNew={!post}
      defaultDate={defaultDate}
      defaultClientId={defaultClientId}
      clients={clients}
      profile={profile}
      canEdit={canEdit}
      onClose={onClose}
      onChanged={onChanged}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Unified post form — same design for admin (editable) and client (read-only)
// ─────────────────────────────────────────────────────────────────────────────
function PostForm({
  post,
  isNew,
  defaultDate,
  defaultClientId,
  clients,
  profile,
  canEdit,
  onClose,
  onChanged,
}: {
  post: Post | null;
  isNew: boolean;
  defaultDate: string;
  defaultClientId: string | null;
  clients: Client[];
  profile: Profile;
  canEdit: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  // Admin edit state
  const [form, setForm] = useState<PostInput>({
    client_id: post?.client_id ?? defaultClientId ?? clients[0]?.id ?? "",
    title: post?.title ?? "",
    body: post?.body ?? "",
    platform: post?.platform ?? "",
    media_url: post?.media_url ?? "",
    status: post?.status ?? "draft",
    scheduled_date: post?.scheduled_date ?? defaultDate,
    scheduled_time: post?.scheduled_time ?? null,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Client approval state
  const [currentStatus, setCurrentStatus] = useState<PostStatus>(post?.status ?? "pending");
  const [changeMode, setChangeMode] = useState(false);
  const [changeText, setChangeText] = useState("");
  const [approvalBusy, setApprovalBusy] = useState(false);

  // Comments — shared by both roles
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [commentBusy, setCommentBusy] = useState(false);

  useEffect(() => {
    if (post) fetchComments(post.id).then(setComments).catch(() => {});
  }, [post?.id]);

  function update<K extends keyof PostInput>(key: K, value: PostInput[K]) {
    setForm(f => ({ ...f, [key]: value }));
  }

  // ── Admin actions ────────────────────────────────────────────────────────────
  async function handleSave() {
    setError(null);
    if (!form.title.trim()) return setError("יש להזין כותרת");
    if (!form.client_id) return setError("יש לבחור לקוח");
    setSaving(true);
    try {
      if (isNew) await createPost(form, profile.id);
      else await updatePost(post!.id, form);
      onChanged();
      onClose();
    } catch (e) {
      setError((e as Error).message ?? "שמירה נכשלה");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!post || !confirm("למחוק את הפוסט?")) return;
    setSaving(true);
    try {
      await deletePost(post.id);
      onChanged();
      onClose();
    } catch (e) {
      setError((e as Error).message ?? "מחיקה נכשלה");
      setSaving(false);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "שגיאה בהעלאה");
      update("media_url", data.url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleAdminComment() {
    if (!post || !newComment.trim()) return;
    setCommentBusy(true);
    try {
      const c = await addComment(post.id, profile.id, newComment.trim());
      setComments(prev => [...prev, c]);
      setNewComment("");
    } catch { /* ignore */ }
    finally { setCommentBusy(false); }
  }

  // ── Client actions ───────────────────────────────────────────────────────────
  async function sendCommentViaApi(text: string) {
    const res = await fetch("/api/client-comment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId: post!.id, authorId: profile.id, body: text }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    setComments(prev => [...prev, data.comment]);
  }

  async function handleApprove() {
    setApprovalBusy(true);
    try {
      await updatePost(post!.id, { status: "approved" });
      setCurrentStatus("approved");
      setChangeMode(false);
      onChanged();
    } finally { setApprovalBusy(false); }
  }

  async function handleRequestChanges() {
    if (!changeText.trim()) return;
    setApprovalBusy(true);
    try {
      await sendCommentViaApi(`🔄 בקשת שינוי: ${changeText.trim()}`);
      await updatePost(post!.id, { status: "pending" });
      setCurrentStatus("pending");
      setChangeMode(false);
      setChangeText("");
      onChanged();
    } finally { setApprovalBusy(false); }
  }

  async function handleClientComment() {
    if (!newComment.trim()) return;
    setCommentBusy(true);
    try {
      await sendCommentViaApi(newComment.trim());
      setNewComment("");
    } catch { /* ignore */ }
    finally { setCommentBusy(false); }
  }

  // ── Derived ──────────────────────────────────────────────────────────────────
  const platforms = parsePlatforms(canEdit ? form.platform : (post?.platform ?? null));
  const displayDate = canEdit ? form.scheduled_date : (post?.scheduled_date ?? "");
  const displayTime = canEdit ? form.scheduled_time : (post?.scheduled_time ?? null);
  const isVideo = (canEdit ? form.media_url : post?.media_url) &&
    /\.(mp4|mov|avi|webm|mkv)$/i.test((canEdit ? form.media_url : post?.media_url) ?? "");
  const mediaUrl = canEdit ? form.media_url : (post?.media_url ?? "");

  const hebDate = displayDate
    ? new Date(displayDate).toLocaleDateString("he-IL", {
        weekday: "long", day: "numeric", month: "long", year: "numeric",
      })
    : "";

  const chip = STATUS_CHIP[currentStatus];

  return (
    <div
      className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-ink/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="scroll-thin max-h-[90vh] w-full max-w-lg animate-scale-in overflow-y-auto rounded-2xl"
        style={{
          background: "rgba(10, 5, 35, 0.92)",
          border: "0.5px solid rgba(167,139,250,0.25)",
          backdropFilter: "blur(24px)",
          boxShadow: "0 24px 60px rgba(76,29,149,0.5), 0 0 0 0.5px rgba(167,139,250,0.1) inset",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3.5"
          style={{ background: "rgba(0,0,0,0.3)", borderBottom: "0.5px solid rgba(167,139,250,0.2)", backdropFilter: "blur(12px)" }}>
          <div className="flex items-center gap-2.5 min-w-0">
            <h3 className="truncate font-bold tracking-tight" style={{ color: "rgba(255,255,255,0.95)" }}>
              {canEdit
                ? (isNew ? "פוסט חדש" : "עריכת פוסט")
                : (post?.title ?? "פוסט")}
            </h3>
            {!canEdit && post && (
              <span
                className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${chip.cls}`}
                style={chip.style}
              >
                {POST_STATUS_LABELS[currentStatus]}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xl leading-none transition"
            style={{ color: "rgba(167,139,250,0.6)" }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            ×
          </button>
        </div>

        {/* ── Body ── */}
        <div className="space-y-4 px-5 py-5">
          {error && (
            <div className="rounded-lg px-3 py-2 text-sm" style={{ background: "rgba(239,68,68,0.15)", border: "0.5px solid rgba(239,68,68,0.4)", color: "#fca5a5" }}>
              {error}
            </div>
          )}

          {/* ─ ADMIN: editable title ─ */}
          {canEdit && (
            <Field label="כותרת">
              <input className={inputCls} value={form.title} onChange={e => update("title", e.target.value)} />
            </Field>
          )}

          {/* ─ ADMIN: client + status selects ─ */}
          {canEdit && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="לקוח">
                <select className={inputCls} value={form.client_id} onChange={e => update("client_id", e.target.value)}>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <Field label="סטטוס">
                <select className={inputCls} value={form.status} onChange={e => update("status", e.target.value as PostStatus)}>
                  {STATUSES.map(s => <option key={s} value={s}>{POST_STATUS_LABELS[s]}</option>)}
                </select>
              </Field>
            </div>
          )}

          {/* ─ Date / time ─ */}
          {canEdit ? (
            <div className="grid grid-cols-2 gap-3">
              <Field label="תאריך">
                <input type="date" dir="ltr" className={inputCls} value={form.scheduled_date} onChange={e => update("scheduled_date", e.target.value)} />
              </Field>
              <Field label="שעה">
                <input type="time" dir="ltr" className={inputCls} value={form.scheduled_time ?? ""} onChange={e => update("scheduled_time", e.target.value || null)} />
              </Field>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm" style={{ color: "rgba(196,181,253,0.8)" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              <span>{hebDate}</span>
              {displayTime && <span dir="ltr">· {displayTime.slice(0, 5)}</span>}
            </div>
          )}

          {/* ─ Platform ─ */}
          <Field label="פלטפורמה">
            {canEdit ? (
              <div className="flex flex-wrap gap-2 pt-0.5">
                {["פייסבוק", "אינסטגרם", "טיקטוק", "לינקדאין", "טוויטר"].map(p => {
                  const color = PLATFORM_COLORS[p] ?? { bg: "#f3f4f6", text: "#6b7280" };
                  const selected = parsePlatforms(form.platform).includes(p);
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        const current = parsePlatforms(form.platform);
                        const next = selected
                          ? current.filter(x => x !== p)
                          : [...current, p];
                        update("platform", next.join(",") || null as unknown as string);
                      }}
                      className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition"
                      style={{
                        backgroundColor: selected ? color.bg + "22" : "rgba(255,255,255,0.05)",
                        color: selected ? color.text : "rgba(255,255,255,0.4)",
                        borderColor: selected ? color.text + "88" : "rgba(255,255,255,0.12)",
                      }}
                    >
                      <PlatformIcon platform={p} size={14} />
                      {p}
                      {selected && <span style={{ fontSize: 10 }}>✓</span>}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 pt-0.5">
                {platforms.length > 0 ? platforms.map(p => {
                  const color = PLATFORM_COLORS[p] ?? { bg: "#f3f4f6", text: "#6b7280" };
                  return (
                    <span key={p} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"
                      style={{ backgroundColor: color.bg, color: color.text }}>
                      <PlatformIcon platform={p} size={14} />
                      {p}
                    </span>
                  );
                }) : (
                  <span className="text-sm text-ink-faint">—</span>
                )}
              </div>
            )}
          </Field>

          {/* ─ Media ─ */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-medium text-ink-muted">תמונה / סרטון</span>
            </div>

            {canEdit ? (
              form.media_url ? (
                <div className="relative overflow-hidden rounded-xl" style={{ border: "0.5px solid rgba(167,139,250,0.25)", background: "rgba(255,255,255,0.05)" }}>
                  {isVideo ? (
                    <video src={form.media_url} controls className="max-h-52 w-full object-contain" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={form.media_url} alt="תצוגה מקדימה" className="max-h-52 w-full object-contain" />
                  )}
                  <button
                    type="button"
                    onClick={() => update("media_url", "")}
                    className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-sm text-white hover:bg-black/70"
                  >×</button>
                </div>
              ) : (
                <label className="group flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl p-6 transition" style={{ border: "1.5px dashed rgba(167,139,250,0.35)", background: "rgba(124,58,237,0.06)" }}>
                  <input type="file" className="hidden" accept="image/*,video/*" onChange={handleFileUpload} disabled={uploading} />
                  {uploading ? (
                    <>
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
                      <span className="text-sm font-medium text-brand">מעלה קובץ…</span>
                    </>
                  ) : (
                    <>
                      <span className="text-3xl">🖼️</span>
                      <span className="text-sm font-medium transition" style={{ color: "rgba(167,139,250,0.7)" }}>לחץ לבחירת קובץ</span>
                      <span className="text-xs" style={{ color: "rgba(167,139,250,0.4)" }}>תמונות וסרטונים עד 50MB</span>
                    </>
                  )}
                </label>
              )
            ) : (
              mediaUrl ? (
                <div className="overflow-hidden rounded-xl" style={{ border: "0.5px solid rgba(167,139,250,0.2)", background: "rgba(255,255,255,0.04)" }}>
                  {isVideo ? (
                    <video src={mediaUrl} controls className="max-h-64 w-full object-contain" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={mediaUrl} alt="" className="max-h-64 w-full object-contain" />
                  )}
                </div>
              ) : (
                <span className="text-sm text-ink-faint">אין מדיה</span>
              )
            )}
          </div>

          {/* ─ Body / content ─ */}
          <div>
            <div className="mb-1.5">
              <span className="text-xs font-medium text-ink-muted">תוכן</span>
            </div>

            {canEdit ? (
              <textarea className={`${inputCls} min-h-[96px] resize-y`} value={form.body ?? ""} onChange={e => update("body", e.target.value)} />
            ) : (
              post?.body ? (
                <p className="rounded-lg px-3 py-2.5 text-sm leading-relaxed" style={{ background: "rgba(255,255,255,0.05)", border: "0.5px solid rgba(167,139,250,0.2)", color: "rgba(255,255,255,0.85)" }}>
                  {post.body}
                </p>
              ) : (
                <span className="text-sm" style={{ color: "rgba(167,139,250,0.4)" }}>—</span>
              )
            )}
          </div>

          {/* ─ CLIENT: approval buttons ─ */}
          {!canEdit && post && (
            <>
              <div className="flex gap-3 pt-1">
                <button
                  disabled={approvalBusy}
                  onClick={handleApprove}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold transition disabled:opacity-50 ${
                    currentStatus === "approved"
                      ? "bg-emerald-500 text-white shadow-lg shadow-emerald-200"
                      : "border-2 border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100"
                  }`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                  מאושר
                </button>
                <button
                  disabled={approvalBusy}
                  onClick={() => setChangeMode(v => !v)}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold transition disabled:opacity-50 ${
                    changeMode
                      ? "border-2 border-rose-300 bg-rose-50 text-rose-700"
                      : "border-2 border-gray-200 bg-gray-50 text-gray-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                  }`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                  לא מאושר
                </button>
              </div>
              {changeMode && (
                <div className="rounded-2xl p-4" style={{ background: "rgba(239,68,68,0.1)", border: "0.5px solid rgba(239,68,68,0.35)" }}>
                  <p className="mb-2 text-xs font-semibold" style={{ color: "#fca5a5" }}>מה צריך לשנות?</p>
                  <textarea
                    className="input-dark"
                    rows={3}
                    placeholder="תאר מה תרצה לשנות בפוסט..."
                    value={changeText}
                    onChange={e => setChangeText(e.target.value)}
                  />
                  <button
                    disabled={approvalBusy || !changeText.trim()}
                    onClick={handleRequestChanges}
                    className="mt-2 w-full rounded-xl bg-rose-500 py-2 text-sm font-semibold text-white transition hover:bg-rose-600 disabled:opacity-50"
                  >
                    {approvalBusy ? "שולח…" : "שלח בקשת שינוי"}
                  </button>
                </div>
              )}
            </>
          )}

          {/* ─ Comments ─ */}
          {!isNew && (
            <div className="pt-4" style={{ borderTop: "0.5px solid rgba(167,139,250,0.2)" }}>
              <h4 className="mb-2.5 text-sm font-semibold" style={{ color: "rgba(255,255,255,0.85)" }}>
                {canEdit ? `תגובות (${comments.length})` : `הערות ${comments.length > 0 ? `(${comments.length})` : ""}`}
              </h4>
              <div className="mb-3 space-y-2">
                {comments.length === 0 && <p className="text-xs" style={{ color: "rgba(167,139,250,0.4)" }}>אין תגובות עדיין</p>}
                {comments.map(c => (
                  <div key={c.id} className="rounded-lg px-3 py-2 text-sm" style={{ background: "rgba(255,255,255,0.05)", border: "0.5px solid rgba(167,139,250,0.18)" }}>
                    <p style={{ color: "rgba(255,255,255,0.85)" }}>{c.body}</p>
                    <p className="mt-1 text-[10px]" dir="ltr" style={{ color: "rgba(167,139,250,0.4)" }}>{new Date(c.created_at).toLocaleString("he-IL")}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  className={inputCls}
                  placeholder={canEdit ? "הוספת תגובה…" : "כתוב הערה…"}
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  onKeyDown={e => {
                    if (e.key !== "Enter") return;
                    if (canEdit) handleAdminComment();
                    else handleClientComment();
                  }}
                />
                <button
                  onClick={canEdit ? handleAdminComment : handleClientComment}
                  disabled={commentBusy || !newComment.trim()}
                  className="btn-primary shrink-0"
                >
                  שליחה
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        {canEdit && (
          <div className="sticky bottom-0 flex items-center justify-between px-5 py-3.5"
            style={{ background: "rgba(0,0,0,0.3)", borderTop: "0.5px solid rgba(167,139,250,0.2)", backdropFilter: "blur(12px)" }}>
            <div>
              {!isNew && (
                <button onClick={handleDelete} disabled={saving} className="rounded-lg px-3 py-2 text-sm font-medium transition disabled:opacity-50" style={{ color: "#fca5a5" }}>
                  מחיקה
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={onClose} className="btn-ghost">ביטול</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary">
                {saving ? "שומר…" : "שמירה"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium" style={{ color: "rgba(167,139,250,0.7)" }}>{label}</span>
      {children}
    </label>
  );
}
