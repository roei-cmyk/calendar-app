"use client";

import { useState } from "react";
import type { Client, ContentPillar, ChannelConfig, SocialChannel } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { AiSpinner } from "@/components/AiSpinner";

const PLATFORMS: { id: SocialChannel; label: string; icon: string }[] = [
  { id: "instagram", label: "אינסטגרם", icon: "ti-brand-instagram" },
  { id: "facebook",  label: "פייסבוק",  icon: "ti-brand-facebook" },
  { id: "linkedin",  label: "לינקדאין", icon: "ti-brand-linkedin" },
  { id: "tiktok",    label: "טיקטוק",   icon: "ti-brand-tiktok" },
  { id: "twitter",   label: "X / טוויטר", icon: "ti-brand-x" },
];

const PILLAR_SUGGESTIONS = [
  "טיפים מקצועיים", "הצגת מוצרים", "עדויות לקוחות",
  "מאחורי הקלעים", "מבצעים והנחות", "תוכן חינוכי",
  "חדשות ועדכונים", "השראה ומוטיבציה",
];

export function ClientProfileModal({
  client,
  onClose,
  onSaved,
}: {
  client: Client;
  onClose: () => void;
  onSaved: (updated: Client) => void;
}) {
  const [tab, setTab] = useState<"profile" | "pillars" | "channels">("profile");

  const [form, setForm] = useState({
    business_description: client.business_description ?? "",
    target_audience: client.target_audience ?? "",
    competitors: client.competitors ?? "",
    tone: client.tone ?? "",
    design_notes: client.design_notes ?? "",
  });

  const [pillars, setPillars] = useState<ContentPillar[]>(
    client.content_pillars ?? [
      { name: "טיפים מקצועיים", percentage: 40 },
      { name: "הצגת מוצרים",    percentage: 35 },
      { name: "עדויות לקוחות",  percentage: 25 },
    ]
  );

  const [channels, setChannels] = useState<ChannelConfig[]>(
    client.social_channels ?? []
  );

  const [sources, setSources] = useState({
    websiteUrl: client.website_url ?? "",
    instagramHandle: client.instagram_handle ?? "",
    facebookUrl: client.facebook_url ?? "",
  });
  const [scrapedFrom, setScrapedFrom] = useState<string[]>([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [researching, setResearching] = useState(false);

  function field(key: keyof typeof form, value: string) {
    setForm(f => ({ ...f, [key]: value }));
  }

  // Pillars
  const totalPct = pillars.reduce((s, p) => s + p.percentage, 0);

  function addPillar() {
    if (pillars.length >= 6) return;
    const remaining = Math.max(0, 100 - totalPct);
    setPillars(p => [...p, { name: "", percentage: remaining }]);
  }

  function removePillar(i: number) {
    setPillars(p => p.filter((_, idx) => idx !== i));
  }

  function updatePillar(i: number, key: keyof ContentPillar, val: string | number) {
    setPillars(p => p.map((item, idx) => idx === i ? { ...item, [key]: val } : item));
  }

  // Channels
  function toggleChannel(platform: SocialChannel) {
    const exists = channels.find(c => c.platform === platform);
    if (exists) {
      setChannels(ch => ch.filter(c => c.platform !== platform));
    } else {
      setChannels(ch => [...ch, { platform, posts_per_week: 3 }]);
    }
  }

  function updateFreq(platform: SocialChannel, val: number) {
    setChannels(ch => ch.map(c => c.platform === platform ? { ...c, posts_per_week: val } : c));
  }

  async function handleResearch() {
    setResearching(true);
    setError(null);
    setScrapedFrom([]);
    try {
      const res = await fetch("/api/client/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: client.name,
          websiteUrl: sources.websiteUrl || undefined,
          instagramHandle: sources.instagramHandle || undefined,
          facebookUrl: sources.facebookUrl || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "שגיאה");
      setForm({
        business_description: data.business_description ?? "",
        target_audience: data.target_audience ?? "",
        competitors: data.competitors ?? "",
        tone: data.tone ?? "",
        design_notes: data.design_notes ?? "",
      });
      setScrapedFrom(data.scrapedSources ?? []);
      setTab("profile");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setResearching(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data, error: err } = await supabase
        .from("clients")
        .update({
          business_description: form.business_description || null,
          target_audience: form.target_audience || null,
          competitors: form.competitors || null,
          tone: form.tone || null,
          design_notes: form.design_notes || null,
          content_pillars: pillars.length > 0 ? pillars : null,
          social_channels: channels.length > 0 ? channels : null,
          website_url: sources.websiteUrl || null,
          instagram_handle: sources.instagramHandle || null,
          facebook_url: sources.facebookUrl || null,
        })
        .eq("id", client.id)
        .select()
        .single();

      if (err) throw new Error(err.message);
      onSaved(data as Client);
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg animate-scale-in overflow-hidden rounded-2xl border border-[#ddd6fe] bg-white shadow-2xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ background: "linear-gradient(135deg, #4c1d95, #7c3aed)" }}
        >
          <div>
            <h3 className="font-bold text-white">הגדרת לקוח</h3>
            <p className="text-xs text-white/60 mt-0.5">{client.name}</p>
          </div>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20">×</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#ede9fe] bg-white shrink-0">
          {(["profile", "pillars", "channels"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 py-2.5 text-xs font-semibold transition"
              style={{
                color: tab === t ? "#7c3aed" : "#9ca3af",
                borderBottom: tab === t ? "2px solid #7c3aed" : "2px solid transparent",
              }}
            >
              {t === "profile"   && <><i className="ti ti-user me-1" aria-hidden="true" />פרופיל</>}
              {t === "pillars"   && <><i className="ti ti-layout-columns me-1" aria-hidden="true" />עמודי תוכן</>}
              {t === "channels"  && <><i className="ti ti-brand-instagram me-1" aria-hidden="true" />ערוצים</>}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5">
          {error && (
            <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>
          )}

          {researching && <AiSpinner label={`Claude חוקר את ${client.name}…`} />}

          {!researching && tab === "profile" && (
            <div className="space-y-4">

              {/* Sources */}
              <div className="rounded-xl border border-[#ede9fe] bg-[#faf5ff] p-3 space-y-2">
                <p className="text-xs font-semibold text-[#6d28d9] mb-2 flex items-center gap-1.5">
                  <i className="ti ti-world" aria-hidden="true" />
                  מקורות מידע — Claude יסרוק ויש מהם
                </p>
                <div className="flex items-center gap-2">
                  <i className="ti ti-world-www text-gray-400" style={{fontSize:15}} aria-hidden="true" />
                  <input
                    className="input flex-1 text-sm"
                    placeholder="כתובת אתר (https://example.co.il)"
                    value={sources.websiteUrl}
                    onChange={e => setSources(s => ({ ...s, websiteUrl: e.target.value }))}
                    dir="ltr"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <i className="ti ti-brand-instagram text-gray-400" style={{fontSize:15}} aria-hidden="true" />
                  <input
                    className="input flex-1 text-sm"
                    placeholder="@שם_משתמש_אינסטגרם"
                    value={sources.instagramHandle}
                    onChange={e => setSources(s => ({ ...s, instagramHandle: e.target.value }))}
                    dir="ltr"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <i className="ti ti-brand-facebook text-gray-400" style={{fontSize:15}} aria-hidden="true" />
                  <input
                    className="input flex-1 text-sm"
                    placeholder="קישור לדף פייסבוק"
                    value={sources.facebookUrl}
                    onChange={e => setSources(s => ({ ...s, facebookUrl: e.target.value }))}
                    dir="ltr"
                  />
                </div>
                <button
                  onClick={handleResearch}
                  disabled={researching}
                  className="mt-1 w-full rounded-lg py-2 text-xs font-bold text-white transition disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg,#7c3aed,#ec4899)" }}
                >
                  <i className="ti ti-sparkles me-1" aria-hidden="true" />
                  נתח מהאינטרנט עם AI
                </button>
                {scrapedFrom.length > 0 && (
                  <p className="text-[11px] text-emerald-600 text-center">
                    ✓ נסרקו: {scrapedFrom.join(", ")}
                  </p>
                )}
              </div>

              <Field label="תיאור העסק" hint="מה העסק מוכר? מה ייחודו?">
                <textarea className="input min-h-[80px] resize-y" placeholder="לדוגמה: חנות בגדי ילדים מובילה, מתמחה בגילאי 0-12" value={form.business_description} onChange={e => field("business_description", e.target.value)} />
              </Field>
              <Field label="קהל יעד" hint="מי הלקוחות?">
                <textarea className="input min-h-[60px] resize-y" placeholder="לדוגמה: הורים לילדים בגיל 0-12, גיל 25-45" value={form.target_audience} onChange={e => field("target_audience", e.target.value)} />
              </Field>
              <Field label="מתחרים עיקריים">
                <textarea className="input min-h-[60px] resize-y" placeholder="לדוגמה: H&M Kids, Zara Kids" value={form.competitors} onChange={e => field("competitors", e.target.value)} />
              </Field>
              <Field label="טון וסגנון" hint="איך הלקוח מדבר?">
                <textarea className="input min-h-[60px] resize-y" placeholder="לדוגמה: חמים ומשפחתי, עברית פשוטה" value={form.tone} onChange={e => field("tone", e.target.value)} />
              </Field>
              <Field label="הערות עיצוב מהסטודיו">
                <textarea className="input min-h-[60px] resize-y" placeholder="לדוגמה: פלטת ורוד-לבן, תמונות ילדים אמיתיים" value={form.design_notes} onChange={e => field("design_notes", e.target.value)} />
              </Field>
            </div>
          )}

          {!researching && tab === "pillars" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-[#ede9fe] bg-[#faf5ff] p-3 text-xs text-[#6d28d9]">
                <i className="ti ti-info-circle me-1" aria-hidden="true" />
                עמודי תוכן מגדירים על מה ה-AI יכתוב וכמה מכל נושא. הסכום צריך להיות 100%.
              </div>

              {/* Percentage bar */}
              <div className="relative h-3 rounded-full overflow-hidden bg-gray-100">
                {pillars.map((p, i) => {
                  const colors = ["#7c3aed","#ec4899","#f97316","#10b981","#3b82f6","#f59e0b"];
                  const left = pillars.slice(0, i).reduce((s, x) => s + x.percentage, 0);
                  return (
                    <div
                      key={i}
                      className="absolute top-0 h-full transition-all"
                      style={{ left: `${left}%`, width: `${p.percentage}%`, background: colors[i % colors.length] }}
                    />
                  );
                })}
              </div>
              <p className="text-xs text-center" style={{ color: totalPct === 100 ? "#10b981" : "#ef4444" }}>
                סה״כ: {totalPct}% {totalPct === 100 ? "✓" : `(חסר ${100 - totalPct}%)`}
              </p>

              <div className="space-y-3">
                {pillars.map((p, i) => {
                  const colors = ["#7c3aed","#ec4899","#f97316","#10b981","#3b82f6","#f59e0b"];
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: colors[i % colors.length] }} />
                      <input
                        className="input flex-1 text-sm"
                        placeholder="שם הנושא"
                        value={p.name}
                        onChange={e => updatePillar(i, "name", e.target.value)}
                        list={`pillar-suggestions-${i}`}
                      />
                      <datalist id={`pillar-suggestions-${i}`}>
                        {PILLAR_SUGGESTIONS.map(s => <option key={s} value={s} />)}
                      </datalist>
                      <div className="flex items-center gap-1 shrink-0">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          className="input w-16 text-center text-sm"
                          value={p.percentage}
                          onChange={e => updatePillar(i, "percentage", Number(e.target.value))}
                        />
                        <span className="text-xs text-gray-400">%</span>
                      </div>
                      <button onClick={() => removePillar(i)} className="text-gray-300 hover:text-red-400 text-lg leading-none">×</button>
                    </div>
                  );
                })}
              </div>

              {pillars.length < 6 && (
                <button
                  onClick={addPillar}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-[#c4b5fd] py-2.5 text-xs font-semibold text-[#7c3aed] hover:bg-[#faf5ff] transition"
                >
                  <i className="ti ti-plus" aria-hidden="true" /> הוסף עמוד תוכן
                </button>
              )}
            </div>
          )}

          {!researching && tab === "channels" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-[#ede9fe] bg-[#faf5ff] p-3 text-xs text-[#6d28d9]">
                <i className="ti ti-info-circle me-1" aria-hidden="true" />
                בחר את הפלטפורמות הפעילות של הלקוח — ה-AI יתאים את סגנון הכתיבה לכל ערוץ.
              </div>

              <div className="space-y-3">
                {PLATFORMS.map(pl => {
                  const active = channels.find(c => c.platform === pl.id);
                  return (
                    <div
                      key={pl.id}
                      className="flex items-center gap-3 rounded-xl border p-3 transition"
                      style={{
                        borderColor: active ? "rgba(124,58,237,0.4)" : "rgba(0,0,0,0.08)",
                        background: active ? "rgba(124,58,237,0.04)" : "transparent",
                      }}
                    >
                      <button
                        onClick={() => toggleChannel(pl.id)}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition"
                        style={{
                          background: active ? "#7c3aed" : "#f3f4f6",
                          color: active ? "#fff" : "#9ca3af",
                        }}
                      >
                        <i className={`ti ${pl.icon}`} style={{ fontSize: 16 }} aria-hidden="true" />
                      </button>
                      <span className="flex-1 text-sm font-medium text-gray-700">{pl.label}</span>
                      {active && (
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-gray-400">פוסטים/שבוע</span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => updateFreq(pl.id, Math.max(1, active.posts_per_week - 1))}
                              className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 text-xs"
                            >−</button>
                            <span className="w-5 text-center text-sm font-semibold text-[#7c3aed]">{active.posts_per_week}</span>
                            <button
                              onClick={() => updateFreq(pl.id, Math.min(14, active.posts_per_week + 1))}
                              className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 text-xs"
                            >+</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {channels.length > 0 && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                  סה״כ: ~{channels.reduce((s, c) => s + c.posts_per_week * 4, 0)} פוסטים לחודש
                  ({channels.map(c => `${PLATFORMS.find(p => p.id === c.platform)?.label} ×${c.posts_per_week * 4}`).join(", ")})
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-[#ede9fe] bg-white px-5 py-3.5 shrink-0">
          <button onClick={onClose} className="btn-ghost text-gray-500 hover:bg-gray-100">ביטול</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? "שומר…" : "שמירה"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 flex items-baseline gap-2">
        <span className="text-xs font-semibold text-[#1e1b4b]">{label}</span>
        {hint && <span className="text-[10px] text-gray-400">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
