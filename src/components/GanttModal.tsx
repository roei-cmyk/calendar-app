"use client";

import { useState } from "react";
import type { Client } from "@/lib/types";
import { AiSpinner } from "@/components/AiSpinner";

const HEB_MONTHS = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];

function buildMonths() {
  const now = new Date();
  const months = [];
  for (let i = -1; i <= 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    months.push({ value: `${y}-${m}`, label: `${HEB_MONTHS[d.getMonth()]} ${y}` });
  }
  return months;
}

const MONTHS = buildMonths();

export function GanttModal({
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
  const [instructions, setInstructions] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ inserted: number; withImages?: number } | null>(null);
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
              {(result.withImages ?? 0) > 0 && (
                <span className="block text-xs mt-0.5 text-emerald-600">
                  🖼 {result.withImages} תמונות נוצרו אוטומטית
                </span>
              )}
            </div>
          )}

          {loading && <AiSpinner label="Claude בונה את הגאנט החודשי…" />}

          {!loading && (
            <button
              onClick={handleGenerate}
              className="w-full rounded-full py-2.5 text-sm font-semibold text-white transition"
              style={{ background: "linear-gradient(135deg, #4c1d95, #7c3aed)" }}
            >
              צור גאנט אוטומטי ✨
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
