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

const STATUSES: PostStatus[] = [
  "draft",
  "pending",
  "approved",
  "scheduled",
  "published",
];

const inputCls = "input";

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

  // Comments
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [commentBusy, setCommentBusy] = useState(false);

  useEffect(() => {
    if (post) fetchComments(post.id).then(setComments).catch(() => {});
  }, [post]);

  function update<K extends keyof PostInput>(key: K, value: PostInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    setError(null);
    if (!form.title.trim()) return setError("יש להזין כותרת");
    if (!form.client_id) return setError("יש לבחור לקוח");
    setSaving(true);
    try {
      if (isNew) {
        await createPost(form, profile.id);
      } else {
        await updatePost(post!.id, form);
      }
      onChanged();
      onClose();
    } catch (e) {
      setError((e as Error).message ?? "שמירה נכשלה");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!post) return;
    if (!confirm("למחוק את הפוסט?")) return;
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
      setComments((prev) => [...prev, c]);
      setNewComment("");
    } catch {
      // ignore
    } finally {
      setCommentBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-ink/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="scroll-thin max-h-[90vh] w-full max-w-lg animate-scale-in overflow-y-auto rounded-2xl border border-line bg-white shadow-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-white/95 px-5 py-3.5 backdrop-blur">
          <h3 className="font-bold tracking-tight text-ink">
            {isNew ? "פוסט חדש" : canEdit ? "עריכת פוסט" : "פרטי פוסט"}
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

          {/* Title */}
          <Field label="כותרת">
            <input
              className={inputCls}
              value={form.title}
              disabled={!canEdit}
              onChange={(e) => update("title", e.target.value)}
            />
          </Field>

          {/* Client + status */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="לקוח">
              <select
                className={inputCls}
                value={form.client_id}
                disabled={!canEdit}
                onChange={(e) => update("client_id", e.target.value)}
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="סטטוס">
              <select
                className={inputCls}
                value={form.status}
                disabled={!canEdit}
                onChange={(e) => update("status", e.target.value as PostStatus)}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {POST_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {/* Date + time */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="תאריך">
              <input
                type="date"
                dir="ltr"
                className={inputCls}
                value={form.scheduled_date}
                disabled={!canEdit}
                onChange={(e) => update("scheduled_date", e.target.value)}
              />
            </Field>
            <Field label="שעה">
              <input
                type="time"
                dir="ltr"
                className={inputCls}
                value={form.scheduled_time ?? ""}
                disabled={!canEdit}
                onChange={(e) => update("scheduled_time", e.target.value || null)}
              />
            </Field>
          </div>

          {/* Platform */}
          <Field label="פלטפורמה">
            <input
              className={inputCls}
              value={form.platform ?? ""}
              disabled={!canEdit}
              placeholder="אינסטגרם / פייסבוק / טיקטוק"
              onChange={(e) => update("platform", e.target.value)}
            />
          </Field>

          {/* Media upload */}
          <Field label="תמונה / סרטון">
            {form.media_url ? (
              <div className="relative overflow-hidden rounded-xl border border-line bg-gray-50">
                {/\.(mp4|mov|avi|webm|mkv)$/i.test(form.media_url) ? (
                  <video
                    src={form.media_url}
                    controls
                    className="max-h-52 w-full object-contain"
                  />
                ) : (
                  <img
                    src={form.media_url}
                    alt="תצוגה מקדימה"
                    className="max-h-52 w-full object-contain"
                  />
                )}
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => update("media_url", "")}
                    className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-sm text-white transition hover:bg-black/70"
                    title="הסר קובץ"
                  >
                    ×
                  </button>
                )}
              </div>
            ) : canEdit ? (
              <label className="group flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line-strong bg-canvas p-6 transition hover:border-brand/50 hover:bg-brand-lighter/20">
                <input
                  type="file"
                  className="hidden"
                  accept="image/*,video/*"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
                {uploading ? (
                  <>
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
                    <span className="text-sm font-medium text-brand">מעלה קובץ…</span>
                  </>
                ) : (
                  <>
                    <span className="text-3xl">🖼️</span>
                    <span className="text-sm font-medium text-ink-muted group-hover:text-brand">
                      לחץ לבחירת קובץ
                    </span>
                    <span className="text-xs text-ink-faint">תמונות וסרטונים עד 50MB</span>
                  </>
                )}
              </label>
            ) : form.media_url === "" || form.media_url === null ? (
              <p className="text-sm text-ink-faint">אין מדיה</p>
            ) : null}
          </Field>

          {/* Body */}
          <Field label="תוכן">
            <textarea
              className={`${inputCls} min-h-[96px] resize-y`}
              value={form.body ?? ""}
              disabled={!canEdit}
              onChange={(e) => update("body", e.target.value)}
            />
          </Field>

          {/* Comments (only for existing posts) */}
          {!isNew && (
            <div className="border-t border-line pt-4">
              <h4 className="mb-2.5 text-sm font-semibold text-ink">
                תגובות ({comments.length})
              </h4>
              <div className="mb-3 space-y-2">
                {comments.length === 0 && (
                  <p className="text-xs text-ink-faint">אין תגובות עדיין</p>
                )}
                {comments.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-lg border border-line bg-gray-50 px-3 py-2 text-sm"
                  >
                    <p className="text-ink">{c.body}</p>
                    <p className="mt-1 text-[10px] text-ink-faint" dir="ltr">
                      {new Date(c.created_at).toLocaleString("he-IL")}
                    </p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  className={inputCls}
                  placeholder="הוספת תגובה…"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
                />
                <button
                  onClick={handleAddComment}
                  disabled={commentBusy || !newComment.trim()}
                  className="btn-primary shrink-0"
                >
                  שליחה
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {canEdit && (
          <div className="sticky bottom-0 flex items-center justify-between border-t border-line bg-white/95 px-5 py-3.5 backdrop-blur">
            <div>
              {!isNew && (
                <button
                  onClick={handleDelete}
                  disabled={saving}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
                >
                  מחיקה
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={onClose} className="btn-ghost">
                ביטול
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary"
              >
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
      <span className="mb-1.5 block text-xs font-medium text-ink-muted">
        {label}
      </span>
      {children}
    </label>
  );
}
