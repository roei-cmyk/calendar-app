"use client";

import { useEffect, useState } from "react";
import { addDays, addMonths } from "date-fns";
import type { Client, Profile, Recurrence, Task, TaskStatus } from "@/lib/types";
import { createTask, deleteTask, fetchTasks, updateTask } from "@/lib/tasks";
import { toISODate } from "@/lib/date";

const RECURRENCE_LABELS: Record<Recurrence, string> = {
  none: "חד פעמי",
  daily: "יומי",
  weekly: "שבועי",
  monthly: "חודשי",
};

const STATUS_CONFIG: Record<TaskStatus, { label: string; bg: string; color: string; border: string }> = {
  pending:     { label: "ממתין",   bg: "rgba(124,58,237,0.15)",  color: "#c4b5fd", border: "rgba(167,139,250,0.3)" },
  in_progress: { label: "בתהליך",  bg: "rgba(251,191,36,0.15)",  color: "#fcd34d", border: "rgba(251,191,36,0.4)" },
  done:        { label: "בוצע",    bg: "rgba(52,211,153,0.15)",   color: "#6ee7b7", border: "rgba(52,211,153,0.35)" },
};

const STATUS_CYCLE: Record<TaskStatus, TaskStatus> = {
  pending: "in_progress",
  in_progress: "done",
  done: "pending",
};

function nextDueDate(dateStr: string, recurrence: Recurrence): string {
  const d = new Date(dateStr + "T12:00:00");
  if (recurrence === "daily")   return toISODate(addDays(d, 1));
  if (recurrence === "weekly")  return toISODate(addDays(d, 7));
  if (recurrence === "monthly") return toISODate(addMonths(d, 1));
  return dateStr;
}

function fmtDate(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("he-IL", {
    day: "numeric", month: "short",
  });
}

function TaskCard({
  task, clients, onStatusChange, onDelete,
}: {
  task: Task;
  clients: Client[];
  onStatusChange: (next: TaskStatus) => void;
  onDelete: () => void;
}) {
  const client = task.client_id ? clients.find(c => c.id === task.client_id) : null;
  const sc = STATUS_CONFIG[task.status];
  const isDone = task.status === "done";

  return (
    <div
      className="group flex items-start gap-3 rounded-xl px-3 py-2.5 transition"
      style={{ background: "rgba(255,255,255,0.03)", border: "0.5px solid rgba(167,139,250,0.1)" }}
    >
      {/* Status badge — click cycles */}
      <button
        onClick={() => onStatusChange(STATUS_CYCLE[task.status])}
        className="mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold transition hover:opacity-80"
        style={{ background: sc.bg, color: sc.color, border: `0.5px solid ${sc.border}`, whiteSpace: "nowrap" }}
        title="לחץ לשינוי סטטוס"
      >
        {sc.label}
      </button>

      <div className="min-w-0 flex-1">
        <p
          className="text-sm leading-snug"
          style={{
            color: isDone ? "rgba(167,139,250,0.35)" : "rgba(255,255,255,0.88)",
            textDecoration: isDone ? "line-through" : undefined,
          }}
        >
          {task.title}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {client && (
            <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{ background: client.color + "33", color: client.color }}>
              {client.name}
            </span>
          )}
          {task.recurrence !== "none" && (
            <span className="rounded-full px-2 py-0.5 text-[10px] font-medium"
              style={{ background: "rgba(124,58,237,0.2)", color: "#c4b5fd" }}>
              ↺ {RECURRENCE_LABELS[task.recurrence]}
            </span>
          )}
          {task.start_date && task.due_date && task.start_date !== task.due_date ? (
            <span className="text-[10px]" style={{ color: "rgba(167,139,250,0.5)" }}>
              {fmtDate(task.start_date)} → {fmtDate(task.due_date)}
            </span>
          ) : task.due_date ? (
            <span className="text-[10px]" style={{ color: "rgba(167,139,250,0.5)" }}>
              {fmtDate(task.due_date)}
            </span>
          ) : null}
        </div>
      </div>

      {/* Delete */}
      <button
        onClick={onDelete}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full opacity-0 transition group-hover:opacity-100"
        style={{ color: "rgba(167,139,250,0.5)", background: "rgba(255,255,255,0.06)" }}
      >
        <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
          <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

export function TaskPanel({ clients, profile }: { clients: Client[]; profile: Profile }) {
  const [tasks, setTasks]         = useState<Task[]>([]);
  const [loading, setLoading]     = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [addOpen, setAddOpen]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [newTitle,      setNewTitle]      = useState("");
  const [newStartDate,  setNewStartDate]  = useState("");
  const [newDate,       setNewDate]       = useState("");
  const [newClientId,   setNewClientId]   = useState("");
  const [newRecurrence, setNewRecurrence] = useState<Recurrence>("none");

  useEffect(() => {
    fetchTasks()
      .then(setTasks)
      .catch((err) => {
        setTasks([]);
        setLoadError(err?.message ?? "שגיאה בטעינת משימות");
      })
      .finally(() => setLoading(false));
  }, []);

  const today    = toISODate(new Date());
  const nextWeek = toISODate(addDays(new Date(), 7));

  const pending = tasks.filter(t => t.status !== "done");
  const done    = tasks.filter(t => t.status === "done");

  const groups = [
    { label: "היום",      tasks: pending.filter(t => t.due_date === today) },
    { label: "השבוע",     tasks: pending.filter(t => t.due_date && t.due_date > today && t.due_date <= nextWeek) },
    { label: "בהמשך",     tasks: pending.filter(t => t.due_date && t.due_date > nextWeek) },
    { label: "ללא תאריך", tasks: pending.filter(t => !t.due_date) },
  ].filter(g => g.tasks.length > 0);

  async function handleStatusChange(task: Task, next: TaskStatus) {
    if (next === "done" && task.recurrence !== "none" && task.due_date) {
      const updated = await updateTask(task.id, { due_date: nextDueDate(task.due_date, task.recurrence), status: "pending" });
      setTasks(prev => prev.map(t => t.id === task.id ? updated : t));
    } else {
      const updated = await updateTask(task.id, { status: next });
      setTasks(prev => prev.map(t => t.id === task.id ? updated : t));
    }
  }

  async function handleDelete(id: string) {
    await deleteTask(id);
    setTasks(prev => prev.filter(t => t.id !== id));
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      const task = await createTask({
        title:       newTitle.trim(),
        client_id:   newClientId || null,
        start_date:  newStartDate || null,
        due_date:    newDate || null,
        recurrence:  newRecurrence,
        status:      "pending",
        created_by:  profile.id,
      });
      setTasks(prev => [...prev, task]);
      setNewTitle(""); setNewStartDate(""); setNewDate(""); setNewClientId(""); setNewRecurrence("none");
      setAddOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "שגיאה בשמירה";
      setSaveError(msg.includes("relation") ? "הטבלה לא קיימת — הרץ את ה-SQL migration ב-Supabase" : msg);
    } finally {
      setSaving(false);
    }
  }

  const todayCount = pending.filter(t => t.due_date === today).length;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Stats + add */}
      <div className="flex shrink-0 items-center justify-between px-5 py-2.5"
        style={{ background: "rgba(0,0,0,0.2)", borderBottom: "0.5px solid rgba(167,139,250,0.12)" }}>
        <div className="flex items-center gap-3">
          {todayCount > 0 && (
            <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
              style={{ background: "rgba(124,58,237,0.3)", color: "#c4b5fd" }}>
              {todayCount} להיום
            </span>
          )}
          <span className="text-xs" style={{ color: "rgba(167,139,250,0.45)" }}>{pending.length} פתוחות</span>
        </div>
        <button
          onClick={() => setAddOpen(o => !o)}
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition"
          style={{ background: "rgba(124,58,237,0.25)", color: "#c4b5fd", border: "0.5px solid rgba(167,139,250,0.3)" }}
        >
          <span style={{ fontSize: 15, lineHeight: 1 }}>+</span> משימה חדשה
        </button>
      </div>

      {/* Load error */}
      {loadError && (
        <div className="shrink-0 px-4 py-2.5 text-xs"
          style={{ background: "rgba(239,68,68,0.12)", color: "#fca5a5", borderBottom: "0.5px solid rgba(239,68,68,0.2)" }}>
          ⚠️ {loadError}
        </div>
      )}

      {/* Add form */}
      {addOpen && (
        <form onSubmit={handleAdd} className="shrink-0 space-y-2 border-b p-4"
          style={{ background: "rgba(124,58,237,0.08)", borderColor: "rgba(167,139,250,0.15)" }}>
          <input
            autoFocus
            placeholder="שם המשימה…"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm outline-none"
            style={{ background: "rgba(255,255,255,0.08)", border: "0.5px solid rgba(167,139,250,0.3)", color: "white" }}
            dir="rtl"
          />
          <div className="flex gap-2">
            <div className="flex flex-1 flex-col gap-1">
              <label className="text-[10px]" style={{ color: "rgba(167,139,250,0.5)" }}>התחלה</label>
              <input type="date" value={newStartDate} onChange={e => setNewStartDate(e.target.value)}
                className="rounded-lg px-3 py-1.5 text-sm outline-none"
                style={{ background: "rgba(255,255,255,0.08)", border: "0.5px solid rgba(167,139,250,0.25)", color: "#c4b5fd" }} />
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <label className="text-[10px]" style={{ color: "rgba(167,139,250,0.5)" }}>יעד</label>
              <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)}
                className="rounded-lg px-3 py-1.5 text-sm outline-none"
                style={{ background: "rgba(255,255,255,0.08)", border: "0.5px solid rgba(167,139,250,0.25)", color: "#c4b5fd" }} />
            </div>
          </div>
          <div className="flex gap-2">
            <select value={newRecurrence} onChange={e => setNewRecurrence(e.target.value as Recurrence)}
              className="flex-1 rounded-lg px-3 py-1.5 text-sm outline-none"
              style={{ background: "rgba(255,255,255,0.08)", border: "0.5px solid rgba(167,139,250,0.25)", color: "#c4b5fd" }}>
              {(Object.keys(RECURRENCE_LABELS) as Recurrence[]).map(r => (
                <option key={r} value={r}>{RECURRENCE_LABELS[r]}</option>
              ))}
            </select>
            <select value={newClientId} onChange={e => setNewClientId(e.target.value)}
              className="flex-1 rounded-lg px-3 py-1.5 text-sm outline-none"
              style={{ background: "rgba(255,255,255,0.08)", border: "0.5px solid rgba(167,139,250,0.25)", color: "#c4b5fd" }}>
              <option value="">ללא לקוח</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {saveError && (
            <p className="rounded-lg px-3 py-2 text-xs"
              style={{ background: "rgba(239,68,68,0.12)", color: "#fca5a5" }}>⚠️ {saveError}</p>
          )}
          <div className="flex gap-2">
            <button type="submit" disabled={saving || !newTitle.trim()}
              className="flex-1 rounded-lg py-2 text-sm font-semibold transition disabled:opacity-50"
              style={{ background: "rgba(124,58,237,0.5)", color: "#e9d5ff" }}>
              {saving ? "שומר…" : "הוסף"}
            </button>
            <button type="button" onClick={() => setAddOpen(false)}
              className="rounded-lg px-4 py-2 text-sm transition"
              style={{ background: "rgba(255,255,255,0.06)", color: "#a78bfa" }}>
              ביטול
            </button>
          </div>
        </form>
      )}

      {/* List */}
      <div className="scroll-thin flex-1 overflow-y-auto px-4 py-3">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
          </div>
        ) : groups.length === 0 && done.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3">
            <span style={{ fontSize: 36 }}>✅</span>
            <p style={{ color: "rgba(167,139,250,0.4)", fontSize: 14 }}>אין משימות פתוחות</p>
            <button onClick={() => setAddOpen(true)}
              className="rounded-full px-4 py-1.5 text-sm font-medium"
              style={{ background: "rgba(124,58,237,0.2)", color: "#c4b5fd" }}>
              + הוסף משימה
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {groups.map(group => (
              <div key={group.label}>
                <h4 className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: "rgba(167,139,250,0.4)" }}>
                  {group.label}
                </h4>
                <div className="space-y-1.5">
                  {group.tasks.map(task => (
                    <TaskCard key={task.id} task={task} clients={clients}
                      onStatusChange={(next) => handleStatusChange(task, next)}
                      onDelete={() => handleDelete(task.id)} />
                  ))}
                </div>
              </div>
            ))}
            {done.length > 0 && (
              <div>
                <h4 className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: "rgba(167,139,250,0.25)" }}>
                  בוצע ({done.length})
                </h4>
                <div className="space-y-1.5">
                  {done.slice(0, 10).map(task => (
                    <TaskCard key={task.id} task={task} clients={clients}
                      onStatusChange={(next) => handleStatusChange(task, next)}
                      onDelete={() => handleDelete(task.id)} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
