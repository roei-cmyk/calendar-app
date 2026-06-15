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
const inputCls = "input";

const PLATFORM_ICON: Record<string, string> = {
  פייסבוק: "📘", facebook: "📘",
  אינסטגרם: "📸", instagram: "📸",
  טיקטוק: "🎵", tiktok: "🎵",
  לינקדאין: "💼", linkedin: "💼",
  יוטיוב: "▶️", youtube: "▶️",
};

const STATUS_STYLE: Record<PostStatus, { label: string; cls: string }> = {
  draft:     { label: "טיוטה",        cls: "bg-gray-100 text-gray-500" },
  pending:   { label: "ממתין לאישור", cls: "bg-amber-100 text-amber-700" },
  approved:  { label: "✓ מאושר",      cls: "bg-emerald-100 text-emerald-700" },
  scheduled: { label: "מתוזמן",       cls: "bg-sky-100 text-sky-700" },
  published: { label: "פורסם",        cls: "bg-violet-100 text-violet-700" },
};

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
  const isNew = !post;

  // ── client read-only view ──────────────────────────────────────────────────
  if (!canEdit && post) {
    return (
      <ClientPostView
        post={post}
        profile={profile}
        onClose={onClose}
        onChanged={onChanged}
      />
    );
  }

  // ── admin edit / create view ───────────────────────────────────────────────
  return (
    <AdminPostForm
      post={post}
      isNew={isNew}
      defaultDate={defaultDate}
      defaultClientId={defaultClientId}
      clients={clients}
      profile={profile}
      onClose={onClose}
      onChanged={onChanged}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Client view — looks like a real social-media post
// ─────────────────────────────────────────────────────────────────────────────
function ClientPostView({
  post,
  profile,
  onClose,
  onChanged,
}: {
  post: Post;
  profile: Profile;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<PostStatus>(post.status);
  const [changeMode, setChangeMode] = useState(false);
  const [changeText, setChangeText] = useState("");

  useEffect(() => {
    fetchComments(post.id).then(setComments).catch(() => {});
  }, [post.id]);

  const isVideo = post.media_url && /\.(mp4|mov|avi|webm|mkv)$/i.test(post.media_url);
  const platformIcon = post.platform
    ? PLATFORM_ICON[post.platform.toLowerCase()] ?? "📱"
    : null;
  const statusCfg = STATUS_STYLE[currentStatus];

  const hebDate = new Date(post.scheduled_date).toLocaleDateString("he-IL", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  async function approve() {
    setBusy(true);
    try {
      await updatePost(post.id, { status: "approved" });
      setCurrentStatus("approved");
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function requestChanges() {
    if (!changeText.trim()) return;
    setBusy(true);
    try {
      // Send comment via server route (triggers notification)
      await sendCommentViaApi(`🔄 בקשת שינוי: ${changeText.trim()}`);
      await updatePost(post.id, { status: "pending" });
      setCurrentStatus("pending");
      setChangeMode(false);
      setChangeText("");
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function sendCommentViaApi(text: string) {
    const res = await fetch("/api/client-comment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId: post.id, authorId: profile.id, body: text }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    setComments(prev => [...prev, data.comment]);
  }

  async function sendComment() {
    if (!newComment.trim()) return;
    setBusy(true);
    try {
      await sendCommentViaApi(newComment.trim());
      setNewComment("");
    } catch { /* ignore */ }
    finally { setBusy(false); }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex animate-fade-in items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="scroll-thin max-h-[95vh] w-full max-w-md animate-scale-in overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-gray-200" />
        </div>

        {/* Media — full image, no crop */}
        {post.media_url && (
          <div className="relative bg-gray-950">
            {isVideo ? (
              <video src={post.media_url} controls className="w-full" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={post.media_url} alt="" className="w-full" />
            )}
            <button
              onClick={onClose}
              className="absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70"
            >
              ×
            </button>
          </div>
        )}

        <div className="p-5">
          {!post.media_url && (
            <div className="mb-3 flex justify-end">
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                ×
              </button>
            </div>
          )}

          {/* Platform + status + date */}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {platformIcon && (
              <span className="flex items-center gap-1.5 rounded-full bg-[#ede9fe] px-3 py-1 text-xs font-semibold text-[#4c1d95]">
                {platformIcon} {post.platform}
              </span>
            )}
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusCfg.cls}`}>
              {statusCfg.label}
            </span>
            <span className="ms-auto text-xs text-gray-400">
              {hebDate}
              {post.scheduled_time && (
                <span dir="ltr"> · {post.scheduled_time.slice(0, 5)}</span>
              )}
            </span>
          </div>

          {/* Title */}
          <h2 className="mb-2 text-lg font-bold text-[#1e1b4b]">{post.title}</h2>

          {/* Body */}
          {post.body && (
            <p className="mb-5 whitespace-pre-wrap text-sm leading-relaxed text-gray-600">
              {post.body}
            </p>
          )}

          {/* Status actions */}
          {currentStatus === "pending" && !changeMode && (
            <div className="mb-5 flex gap-2">
              <button
                onClick={approve}
                disabled={busy}
                className="flex-1 rounded-2xl py-3 text-sm font-bold text-white shadow-md transition hover:opacity-90 disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #059669, #10b981)" }}
              >
                {busy ? "…" : "✓ אישור פוסט"}
              </button>
              <button
                onClick={() => setChangeMode(true)}
                disabled={busy}
                className="flex-1 rounded-2xl border border-amber-300 bg-amber-50 py-3 text-sm font-bold text-amber-700 transition hover:bg-amber-100 disabled:opacity-50"
              >
                ✏️ בקשת שינוי
              </button>
            </div>
          )}

          {currentStatus === "approved" && (
            <div className="mb-5 flex items-center justify-between rounded-2xl bg-emerald-50 px-4 py-3">
              <span className="text-sm font-semibold text-emerald-700">✓ הפוסט מאושר</span>
              <button
                onClick={() => setChangeMode(true)}
                className="text-xs text-amber-600 hover:underline"
              >
                בקשת שינוי
              </button>
            </div>
          )}

          {/* Request changes form */}
          {changeMode && (
            <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="mb-2 text-sm font-semibold text-amber-800">מה צריך לשנות?</p>
              <textarea
                className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-300"
                rows={3}
                placeholder="תאר מה אתה רוצה לשנות…"
                value={changeText}
                onChange={e => setChangeText(e.target.value)}
              />
              <div className="mt-2 flex gap-2">
                <button
                  onClick={requestChanges}
                  disabled={busy || !changeText.trim()}
                  className="flex-1 rounded-xl bg-amber-500 py-2 text-sm font-bold text-white transition hover:bg-amber-600 disabled:opacity-50"
                >
                  {busy ? "שולח…" : "שלח בקשה"}
                </button>
                <button
                  onClick={() => { setChangeMode(false); setChangeText(""); }}
                  className="rounded-xl border border-amber-200 px-4 py-2 text-sm text-amber-700 hover:bg-amber-100"
                >
                  ביטול
                </button>
              </div>
            </div>
          )}

          {/* Comments */}
          <div className="border-t border-[#f3f0ff] pt-4">
            <h4 className="mb-3 text-sm font-bold text-[#1e1b4b]">
              הערות {comments.length > 0 && `(${comments.length})`}
            </h4>
            <div className="mb-3 space-y-2">
              {comments.length === 0 && (
                <p className="text-xs text-gray-400">אין הערות עדיין</p>
              )}
              {comments.map(c => (
                <div key={c.id} className="rounded-2xl bg-[#f5f3ff] px-4 py-2.5 text-sm text-gray-700">
                  {c.body}
                  <span className="mt-1 block text-[10px] text-gray-400" dir="ltr">
                    {new Date(c.created_at).toLocaleString("he-IL")}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                className="flex-1 rounded-full border border-[#ddd6fe] bg-[#f5f3ff] px-4 py-2 text-sm outline-none transition focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/15"
                placeholder="כתוב הערה…"
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendComment()}
              />
              <button
                onClick={sendComment}
                disabled={busy || !newComment.trim()}
                className="shrink-0 rounded-full px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #4c1d95, #7c3aed)" }}
              >
                שלח
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin form — unchanged edit / create view
// ─────────────────────────────────────────────────────────────────────────────
function AdminPostForm({
  post,
  isNew,
  defaultDate,
  defaultClientId,
  clients,
  profile,
  onClose,
  onChanged,
}: {
  post: Post | null;
  isNew: boolean;
  defaultDate: string;
  defaultClientId: string | null;
  clients: Client[];
  profile: Profile;
  onClose: () => void;
  onChanged: () => void;
}) {
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
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [commentBusy, setCommentBusy] = useState(false);

  useEffect(() => {
    if (post) fetchComments(post.id).then(setComments).catch(() => {});
  }, [post]);

  function update<K extends keyof PostInput>(key: K, value: PostInput[K]) {
    setForm(f => ({ ...f, [key]: value }));
  }

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

  async function handleAddComment() {
    if (!post || !newComment.trim()) return;
    setCommentBusy(true);
    try {
      const c = await addComment(post.id, profile.id, newComment.trim());
      setComments(prev => [...prev, c]);
      setNewComment("");
    } catch { /* ignore */ }
    finally { setCommentBusy(false); }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-ink/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="scroll-thin max-h-[90vh] w-full max-w-lg animate-scale-in overflow-y-auto rounded-2xl border border-line bg-white shadow-modal"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-white/95 px-5 py-3.5 backdrop-blur">
          <h3 className="font-bold tracking-tight text-ink">
            {isNew ? "פוסט חדש" : "עריכת פוסט"}
          </h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-xl leading-none text-ink-faint transition hover:bg-gray-100 hover:text-ink"
          >
            ×
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          )}

          <Field label="כותרת">
            <input className={inputCls} value={form.title} onChange={e => update("title", e.target.value)} />
          </Field>

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

          <div className="grid grid-cols-2 gap-3">
            <Field label="תאריך">
              <input type="date" dir="ltr" className={inputCls} value={form.scheduled_date} onChange={e => update("scheduled_date", e.target.value)} />
            </Field>
            <Field label="שעה">
              <input type="time" dir="ltr" className={inputCls} value={form.scheduled_time ?? ""} onChange={e => update("scheduled_time", e.target.value || null)} />
            </Field>
          </div>

          <Field label="פלטפורמה">
            <input className={inputCls} value={form.platform ?? ""} placeholder="אינסטגרם / פייסבוק / טיקטוק" onChange={e => update("platform", e.target.value)} />
          </Field>

          <Field label="תמונה / סרטון">
            {form.media_url ? (
              <div className="relative overflow-hidden rounded-xl border border-line bg-gray-50">
                {/\.(mp4|mov|avi|webm|mkv)$/i.test(form.media_url) ? (
                  <video src={form.media_url} controls className="max-h-52 w-full object-contain" />
                ) : (
                  <img src={form.media_url} alt="תצוגה מקדימה" className="max-h-52 w-full object-contain" />
                )}
                <button
                  type="button"
                  onClick={() => update("media_url", "")}
                  className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-sm text-white hover:bg-black/70"
                >×</button>
              </div>
            ) : (
              <label className="group flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line-strong bg-canvas p-6 transition hover:border-brand/50 hover:bg-brand-lighter/20">
                <input type="file" className="hidden" accept="image/*,video/*" onChange={handleFileUpload} disabled={uploading} />
                {uploading ? (
                  <>
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
                    <span className="text-sm font-medium text-brand">מעלה קובץ…</span>
                  </>
                ) : (
                  <>
                    <span className="text-3xl">🖼️</span>
                    <span className="text-sm font-medium text-ink-muted group-hover:text-brand">לחץ לבחירת קובץ</span>
                    <span className="text-xs text-ink-faint">תמונות וסרטונים עד 50MB</span>
                  </>
                )}
              </label>
            )}
          </Field>

          <Field label="תוכן">
            <textarea className={`${inputCls} min-h-[96px] resize-y`} value={form.body ?? ""} onChange={e => update("body", e.target.value)} />
          </Field>

          {!isNew && (
            <div className="border-t border-line pt-4">
              <h4 className="mb-2.5 text-sm font-semibold text-ink">תגובות ({comments.length})</h4>
              <div className="mb-3 space-y-2">
                {comments.length === 0 && <p className="text-xs text-ink-faint">אין תגובות עדיין</p>}
                {comments.map(c => (
                  <div key={c.id} className="rounded-lg border border-line bg-gray-50 px-3 py-2 text-sm">
                    <p className="text-ink">{c.body}</p>
                    <p className="mt-1 text-[10px] text-ink-faint" dir="ltr">{new Date(c.created_at).toLocaleString("he-IL")}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input className={inputCls} placeholder="הוספת תגובה…" value={newComment} onChange={e => setNewComment(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAddComment()} />
                <button onClick={handleAddComment} disabled={commentBusy || !newComment.trim()} className="btn-primary shrink-0">שליחה</button>
              </div>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 flex items-center justify-between border-t border-line bg-white/95 px-5 py-3.5 backdrop-blur">
          <div>
            {!isNew && (
              <button onClick={handleDelete} disabled={saving} className="rounded-lg px-3 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50 disabled:opacity-50">
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
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-ink-muted">{label}</span>
      {children}
    </label>
  );
}
