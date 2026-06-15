"use client";

import { useState } from "react";
import type { Client } from "@/lib/types";

const MONTHS = [
  { value: "2025-07", label: "יולי 2025" },
  { value: "2025-08", label: "אוגוסט 2025" },
  { value: "2025-09", label: "ספטמבר 2025" },
  { value: "2025-10", label: "אוקטובר 2025" },
  { value: "2025-11", label: "נובמבר 2025" },
  { value: "2025-12", label: "דצמבר 2025" },
  { value: "2026-01", label: "ינואר 2026" },
  { value: "2026-02", label: "פברואר 2026" },
  { value: "2026-03", label: "מרץ 2026" },
  { value: "2026-04", label: "אפריל 2026" },
  { value: "2026-05", label: "מאי 2026" },
  { value: "2026-06", label: "יוני 2026" },
];

export function GanttModal({
  clients,
  defaultClientId,
  onClose,
  onDone,
}: {
  clients: Client[];
  defaultClientId: string | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [clientId, setClientId] = useState(defaultClientId ?? clients[0]?.id ?? "");
  const [month, setMonth] = useState(MONTHS[0].value);
  const [instructions, setInstructions] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ inserted: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    if (!instructions.trim()) return setError("יש לכתוב הוראות לסוכן");
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/gantt/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, month, instructions }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "שגיאה");
      setResult(data);
      setTimeout(() => { onDone(); onClose(); }, 1500);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md animate-scale-in rounded-2xl border border-[#ddd6fe] bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between rounded-t-2xl px-5 py-4"
          style={{ background: "linear-gradient(135deg, #4c1d95, #7c3aed)" }}
        >
          <div>
            <h3 className="font-bold text-white">✨ צור גאנט חודשי</h3>
            <p className="text-xs text-white/60 mt-0.5">Claude יבנה את לוח התוכן אוטומטית</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            ×
          </button>
        </div>

        <div className="space-y-4 p-5">
          {/* Client */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[#6b7280]">לקוח</label>
            <select
              className="input"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Month */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[#6b7280]">חודש</label>
            <select
              className="input"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            >
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* Instructions */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[#6b7280]">
              הוראות לסוכן
            </label>
            <textarea
              className="input min-h-[100px] resize-y"
              placeholder={`לדוגמה:\n12 פוסטים על נדל״ן, תחבורה וחינוך בלוד. טון מקצועי ומעורר השראה. פייסבוק בלבד.`}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
            />
          </div>

          {error && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          )}

          {result && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-700">
              ✅ {result.inserted} פוסטים נוצרו ועלו ללוח!
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full rounded-full py-2.5 text-sm font-semibold text-white transition disabled:opacity-60"
            style={{ background: loading ? "#a78bfa" : "linear-gradient(135deg, #4c1d95, #7c3aed)" }}
          >
            {loading ? "Claude בונה את הגאנט... ✨" : "צור גאנט אוטומטי ✨"}
          </button>
        </div>
      </div>
    </div>
  );
}
