"use client";

import { useState, useEffect } from "react";
import type { Client, ContentPillar, ChannelConfig, SocialChannel, PostFormatMix, PostFormat } from "@/lib/types";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";
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

const PLATFORMS: { id: SocialChannel; label: string }[] = [
  { id: "instagram", label: "אינסטגרם" },
  { id: "facebook",  label: "פייסבוק" },
  { id: "linkedin",  label: "לינקדאין" },
  { id: "tiktok",    label: "טיקטוק" },
  { id: "twitter",   label: "X / טוויטר" },
];

const FORMAT_OPTIONS: { id: PostFormat; label: string }[] = [
  { id: "reel",     label: "רילס" },
  { id: "carousel", label: "קרוסלה" },
  { id: "static",   label: "תמונה" },
  { id: "story",    label: "סטורי" },
];

const PILLAR_COLORS = ["#7c3aed","#ec4899","#f97316","#10b981","#3b82f6","#f59e0b"];
const PILLAR_SUGGESTIONS = ["טיפים מקצועיים","הצגת מוצרים","עדויות לקוחות","מאחורי הקלעים","מבצעים והנחות","תוכן חינוכי","חדשות ועדכונים","השראה ומוטיבציה","תוכן עונתי"];

type Tab = "generate" | "profile" | "content";

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
  const [tab, setTab] = useState<Tab>("generate");
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const [researching, setResearching] = useState(false);

  const selectedClient = clients.find(c => c.id === clientId) ?? clients[0];

  // Editable profile state — syncs when clientId changes
  const [form, setForm] = useState({
    business_description: selectedClient?.business_description ?? "",
    target_audience:      selectedClient?.target_audience ?? "",
    competitors:          selectedClient?.competitors ?? "",
    tone:                 selectedClient?.tone ?? "",
    design_notes:         selectedClient?.design_notes ?? "",
    do_not_post:          selectedClient?.do_not_post ?? "",
    seasonal_events:      selectedClient?.seasonal_events ?? "",
    writing_examples:     selectedClient?.writing_examples ?? "",
    brand_hashtags:       selectedClient?.brand_hashtags ?? "",
    website_url:          selectedClient?.website_url ?? "",
    instagram_handle:     selectedClient?.instagram_handle ?? "",
  });
  const [pillars, setPillars] = useState<ContentPillar[]>(
    selectedClient?.content_pillars ?? [
      { name: "טיפים מקצועיים", percentage: 40 },
      { name: "הצגת מוצרים",    percentage: 35 },
      { name: "עדויות לקוחות",  percentage: 25 },
    ]
  );
  const [channels, setChannels] = useState<ChannelConfig[]>(selectedClient?.social_channels ?? []);
  const [formats, setFormats] = useState<PostFormatMix[]>(
    selectedClient?.post_format_mix ?? [
      { format: "static",   percentage: 40 },
      { format: "reel",     percentage: 35 },
      { format: "carousel", percentage: 25 },
    ]
  );

  useEffect(() => {
    const c = clients.find(cl => cl.id === clientId);
    if (!c) return;
    setForm({
      business_description: c.business_description ?? "",
      target_audience:      c.target_audience ?? "",
      competitors:          c.competitors ?? "",
      tone:                 c.tone ?? "",
      design_notes:         c.design_notes ?? "",
      do_not_post:          c.do_not_post ?? "",
      seasonal_events:      c.seasonal_events ?? "",
      writing_examples:     c.writing_examples ?? "",
      brand_hashtags:       c.brand_hashtags ?? "",
      website_url:          c.website_url ?? "",
      instagram_handle:     c.instagram_handle ?? "",
    });
    setPillars(c.content_pillars ?? [{ name: "טיפים מקצועיים", percentage: 40 }, { name: "הצגת מוצרים", percentage: 35 }, { name: "עדויות לקוחות", percentage: 25 }]);
    setChannels(c.social_channels ?? []);
    setFormats(c.post_format_mix ?? [{ format: "static", percentage: 40 }, { format: "reel", percentage: 35 }, { format: "carousel", percentage: 25 }]);
    setSaveOk(false);
  }, [clientId, clients]);

  function field(key: keyof typeof form, val: string) { setForm(f => ({ ...f, [key]: val })); }

  // Pillars
  const totalPillarPct = pillars.reduce((s, p) => s + p.percentage, 0);
  function addPillar() { if (pillars.length < 6) setPillars(p => [...p, { name: "", percentage: Math.max(0, 100 - totalPillarPct) }]); }
  function removePillar(i: number) { setPillars(p => p.filter((_, idx) => idx !== i)); }
  function updatePillar(i: number, key: keyof ContentPillar, val: string | number) {
    setPillars(p => p.map((item, idx) => idx === i ? { ...item, [key]: val } : item));
  }

  // Channels
  function toggleChannel(platform: SocialChannel) {
    const exists = channels.find(c => c.platform === platform);
    if (exists) setChannels(ch => ch.filter(c => c.platform !== platform));
    else        setChannels(ch => [...ch, { platform, posts_per_week: 3 }]);
  }
  function updateFreq(platform: SocialChannel, val: number) {
    setChannels(ch => ch.map(c => c.platform === platform ? { ...c, posts_per_week: val } : c));
  }

  // Formats
  const totalFormatPct = formats.reduce((s, f) => s + f.percentage, 0);
  function toggleFormat(format: PostFormat) {
    const exists = formats.find(f => f.format === format);
    if (exists) setFormats(fs => fs.filter(f => f.format !== format));
    else        setFormats(fs => [...fs, { format, percentage: Math.max(0, 100 - totalFormatPct) }]);
  }
  function updateFormatPct(format: PostFormat, val: number) {
    setFormats(fs => fs.map(f => f.format === format ? { ...f, percentage: val } : f));
  }

  async function handleResearch() {
    setResearching(true);
    setError(null);
    try {
      const c = clients.find(cl => cl.id === clientId);
      const res = await fetch("/api/client/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName:      c?.name ?? "",
          websiteUrl:      form.website_url || undefined,
          instagramHandle: form.instagram_handle || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "שגיאה");
      setForm(f => ({
        ...f,
        business_description: data.business_description ?? f.business_description,
        target_audience:      data.target_audience ?? f.target_audience,
        competitors:          data.competitors ?? f.competitors,
        tone:                 data.tone ?? f.tone,
        design_notes:         data.design_notes ?? f.design_notes,
        do_not_post:          data.do_not_post ?? f.do_not_post,
        seasonal_events:      data.seasonal_events ?? f.seasonal_events,
        writing_examples:     data.writing_examples ?? f.writing_examples,
        brand_hashtags:       data.brand_hashtags ?? f.brand_hashtags,
      }));
      setTab("profile");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setResearching(false);
    }
  }

  async function handleSaveProfile() {
    setSaving(true);
    setError(null);
    try {
      const supabase = createSupabaseClient();
      const { error: err } = await supabase.from("clients").update({
        business_description: form.business_description || null,
        target_audience:      form.target_audience || null,
        competitors:          form.competitors || null,
        tone:                 form.tone || null,
        design_notes:         form.design_notes || null,
        do_not_post:          form.do_not_post || null,
        seasonal_events:      form.seasonal_events || null,
        writing_examples:     form.writing_examples || null,
        brand_hashtags:       form.brand_hashtags || null,
        website_url:          form.website_url || null,
        instagram_handle:     form.instagram_handle || null,
        content_pillars:      pillars.length > 0 ? pillars : null,
        social_channels:      channels.length > 0 ? channels : null,
        post_format_mix:      formats.length > 0 ? formats : null,
      }).eq("id", clientId);
      if (err) throw new Error(err.message);
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 3000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

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
      setTimeout(() => { onDone(); onClose(); }, 1800);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: "generate", label: "יצירת גאנט" },
    { id: "profile",  label: "פרופיל לקוח" },
    { id: "content",  label: "אסטרטגיית תוכן" },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-xl flex-col overflow-hidden rounded-2xl"
        style={{
          background: "rgba(10,5,35,0.96)",
          border: "0.5px solid rgba(167,139,250,0.3)",
          boxShadow: "0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(124,58,237,0.1)",
          backdropFilter: "blur(24px)",
          maxHeight: "90vh",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between px-5 py-4"
          style={{ background: "rgba(0,0,0,0.3)", borderBottom: "0.5px solid rgba(167,139,250,0.2)" }}>
          <div>
            <h3 className="font-bold" style={{ color: "rgba(255,255,255,0.95)" }}>
              <i className="ti ti-sparkles me-2 text-purple-400" aria-hidden="true" />
              צור גאנט חודשי
            </h3>
            <p className="mt-0.5 text-xs" style={{ color: "rgba(167,139,250,0.6)" }}>
              עדכן את פרטי הלקוח, ואז צור את הלוח
            </p>
          </div>
          <button onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full transition"
            style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}>×</button>
        </div>

        {/* Client selector — always visible */}
        <div className="shrink-0 px-5 pt-4 pb-2">
          <label className="mb-1.5 block text-xs font-semibold" style={{ color: "rgba(167,139,250,0.7)" }}>לקוח</label>
          <select className="input-dark" value={clientId} onChange={e => setClientId(e.target.value)}>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {/* Tabs */}
        <div className="flex shrink-0 px-5" style={{ borderBottom: "0.5px solid rgba(167,139,250,0.15)" }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="mr-1 py-2 text-xs font-semibold transition"
              style={{
                color: tab === t.id ? "#c4b5fd" : "rgba(255,255,255,0.3)",
                borderBottom: tab === t.id ? "2px solid #7c3aed" : "2px solid transparent",
                paddingLeft: 8, paddingRight: 8,
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="scroll-thin flex-1 overflow-y-auto p-5">
          {error && (
            <div className="mb-3 rounded-lg px-3 py-2 text-sm"
              style={{ background: "rgba(239,68,68,0.15)", border: "0.5px solid rgba(239,68,68,0.4)", color: "#fca5a5" }}>
              {error}
            </div>
          )}

          {researching && <AiSpinner label="מנתח את הלקוח עם AI…" />}

          {/* ===== יצירת גאנט ===== */}
          {tab === "generate" && !researching && (
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold" style={{ color: "rgba(167,139,250,0.7)" }}>חודש</label>
                <select className="input-dark" value={month} onChange={e => setMonth(e.target.value)}>
                  {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold" style={{ color: "rgba(167,139,250,0.7)" }}>
                  הוראות לסוכן
                </label>
                <textarea
                  className="input-dark min-h-[120px] resize-y"
                  placeholder={`לדוגמה:\n12 פוסטים על נדל״ן, תחבורה וחינוך בלוד.\nטון מקצועי ומעורר השראה.\nפייסבוק בלבד.`}
                  value={instructions}
                  onChange={e => setInstructions(e.target.value)}
                />
              </div>

              {/* Profile summary */}
              {selectedClient && (
                <div className="rounded-xl p-3 space-y-1.5"
                  style={{ background: "rgba(124,58,237,0.08)", border: "0.5px solid rgba(124,58,237,0.25)" }}>
                  <p className="text-xs font-semibold mb-2" style={{ color: "#c4b5fd" }}>
                    נתונים שישמשו את ה-AI
                  </p>
                  {[
                    { label: "תיאור", val: form.business_description },
                    { label: "קהל יעד", val: form.target_audience },
                    { label: "טון", val: form.tone },
                    { label: "מה לא לפרסם", val: form.do_not_post },
                    { label: "עמודי תוכן", val: pillars.length > 0 ? pillars.map(p => `${p.name} ${p.percentage}%`).join(" · ") : null },
                    { label: "ערוצים", val: channels.length > 0 ? channels.map(c => `${c.platform} ×${c.posts_per_week}`).join(", ") : null },
                  ].map(({ label, val }) => (
                    <div key={label} className="flex gap-2 text-xs">
                      <span className="w-24 shrink-0 text-left" style={{ color: "rgba(167,139,250,0.6)" }}>{label}:</span>
                      <span className="truncate" style={{ color: val ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.2)" }}>
                        {val || "לא הוגדר — עדכן בטאב פרופיל"}
                      </span>
                    </div>
                  ))}
                  <button onClick={() => setTab("profile")} className="mt-1 text-xs underline-offset-2"
                    style={{ color: "#a78bfa", textDecoration: "underline" }}>
                    עדכן פרופיל ←
                  </button>
                </div>
              )}

              {result && (
                <div className="rounded-lg px-3 py-2 text-sm"
                  style={{ background: "rgba(52,211,153,0.12)", border: "0.5px solid rgba(52,211,153,0.4)", color: "#6ee7b7" }}>
                  ✅ {result.inserted} פוסטים נוצרו ועלו ללוח!
                  {(result.withImages ?? 0) > 0 && (
                    <span className="mt-0.5 block text-xs" style={{ color: "#34d399" }}>
                      🖼 {result.withImages} תמונות נוצרו אוטומטית
                    </span>
                  )}
                </div>
              )}

              {loading && <AiSpinner label="Claude בונה את הגאנט החודשי…" />}
            </div>
          )}

          {/* ===== פרופיל לקוח ===== */}
          {tab === "profile" && !researching && (
            <div className="space-y-4">
              {/* AI Research */}
              <div className="space-y-2 rounded-xl p-3"
                style={{ background: "rgba(124,58,237,0.1)", border: "0.5px solid rgba(124,58,237,0.3)" }}>
                <p className="text-xs font-semibold" style={{ color: "#c4b5fd" }}>
                  <i className="ti ti-sparkles me-1" aria-hidden="true" />מלא אוטומטית עם AI
                </p>
                <div className="flex gap-2">
                  <input className="input-dark flex-1 text-sm" dir="ltr" placeholder="https://example.co.il"
                    value={form.website_url} onChange={e => field("website_url", e.target.value)} />
                  <input className="input-dark w-36 text-sm" dir="ltr" placeholder="@instagram"
                    value={form.instagram_handle} onChange={e => field("instagram_handle", e.target.value)} />
                </div>
                <button onClick={handleResearch} disabled={researching}
                  className="w-full rounded-lg py-1.5 text-xs font-bold text-white transition disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg,#7c3aed,#6d28d9)" }}>
                  נתח מהאינטרנט
                </button>
              </div>

              <GField label="תיאור העסק">
                <textarea className="input-dark min-h-[70px] resize-y" value={form.business_description}
                  placeholder="מה העסק מוכר? מה ייחודו?"
                  onChange={e => field("business_description", e.target.value)} />
              </GField>
              <GField label="קהל יעד">
                <textarea className="input-dark min-h-[55px] resize-y" value={form.target_audience}
                  placeholder="גיל, מגדר, תחומי עניין..."
                  onChange={e => field("target_audience", e.target.value)} />
              </GField>
              <GField label="מתחרים">
                <textarea className="input-dark min-h-[55px] resize-y" value={form.competitors}
                  placeholder="2-3 מתחרים ישירים"
                  onChange={e => field("competitors", e.target.value)} />
              </GField>
              <GField label="טון וסגנון">
                <textarea className="input-dark min-h-[55px] resize-y" value={form.tone}
                  placeholder="חמים, מקצועי, עברית פשוטה..."
                  onChange={e => field("tone", e.target.value)} />
              </GField>
              <GField label="הערות עיצוב">
                <textarea className="input-dark min-h-[55px] resize-y" value={form.design_notes}
                  placeholder="צבעי מותג, סגנון תמונות..."
                  onChange={e => field("design_notes", e.target.value)} />
              </GField>
              <GField label="⛔ מה לא לפרסם">
                <textarea className="input-dark min-h-[55px] resize-y" value={form.do_not_post}
                  placeholder="נושאים רגישים, מתחרים לא להזכיר..."
                  onChange={e => field("do_not_post", e.target.value)} />
              </GField>
              <GField label="אירועים עונתיים">
                <textarea className="input-dark min-h-[55px] resize-y" value={form.seasonal_events}
                  placeholder="מבצעי Sale, ימי שנה, אירועים חוזרים..."
                  onChange={e => field("seasonal_events", e.target.value)} />
              </GField>
              <GField label="דוגמאות כתיבה" hint="לימוד סגנון ל-AI">
                <textarea className="input-dark min-h-[90px] resize-y" value={form.writing_examples}
                  placeholder={"1-2 פוסטים מוצלחים לדוגמה...\n\n״הגיע ה-SALE! עד 70% הנחה ← ״"}
                  onChange={e => field("writing_examples", e.target.value)} />
              </GField>
            </div>
          )}

          {/* ===== אסטרטגיית תוכן ===== */}
          {tab === "content" && !researching && (
            <div className="space-y-5">
              {/* Pillars */}
              <div>
                <p className="mb-2 text-xs font-bold" style={{ color: "#c4b5fd" }}>עמודי תוכן</p>
                <div className="relative mb-2 h-2.5 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}>
                  {pillars.map((p, i) => {
                    const left = pillars.slice(0, i).reduce((s, x) => s + x.percentage, 0);
                    return <div key={i} className="absolute top-0 h-full"
                      style={{ left: `${left}%`, width: `${p.percentage}%`, background: PILLAR_COLORS[i % PILLAR_COLORS.length] }} />;
                  })}
                </div>
                <p className="mb-2 text-center text-[11px]" style={{ color: totalPillarPct === 100 ? "#6ee7b7" : "#fca5a5" }}>
                  {totalPillarPct}% {totalPillarPct === 100 ? "✓" : `(חסר ${100 - totalPillarPct}%)`}
                </p>
                <div className="space-y-2">
                  {pillars.map((p, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: PILLAR_COLORS[i % PILLAR_COLORS.length] }} />
                      <input className="input-dark flex-1 text-sm" placeholder="שם הנושא"
                        value={p.name} onChange={e => updatePillar(i, "name", e.target.value)}
                        list={`ps-${i}`} />
                      <datalist id={`ps-${i}`}>{PILLAR_SUGGESTIONS.map(s => <option key={s} value={s} />)}</datalist>
                      <input type="number" min={0} max={100} className="input-dark w-16 text-center text-sm"
                        value={p.percentage} onChange={e => updatePillar(i, "percentage", Number(e.target.value))} />
                      <span className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>%</span>
                      <button onClick={() => removePillar(i)} className="text-lg leading-none"
                        style={{ color: "rgba(255,255,255,0.2)" }}>×</button>
                    </div>
                  ))}
                </div>
                {pillars.length < 6 && (
                  <button onClick={addPillar} className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg py-2 text-xs font-semibold transition"
                    style={{ border: "1px dashed rgba(167,139,250,0.35)", color: "#a78bfa" }}>
                    + הוסף עמוד
                  </button>
                )}
              </div>

              {/* Formats */}
              <div>
                <p className="mb-2 text-xs font-bold" style={{ color: "#c4b5fd" }}>סוגי פורמט</p>
                <div className="grid grid-cols-2 gap-2">
                  {FORMAT_OPTIONS.map(opt => {
                    const active = formats.find(f => f.format === opt.id);
                    return (
                      <div key={opt.id} className="flex items-center gap-2 rounded-lg p-2 transition"
                        style={{ border: `0.5px solid ${active ? "rgba(124,58,237,0.5)" : "rgba(255,255,255,0.1)"}`, background: active ? "rgba(124,58,237,0.1)" : "rgba(255,255,255,0.03)" }}>
                        <button onClick={() => toggleFormat(opt.id)}
                          className="h-5 w-5 shrink-0 rounded-full border text-[10px] font-bold transition"
                          style={{ borderColor: active ? "#7c3aed" : "rgba(255,255,255,0.2)", background: active ? "#7c3aed" : "transparent", color: active ? "#fff" : "rgba(255,255,255,0.3)" }}>
                          {active ? "✓" : ""}
                        </button>
                        <span className="flex-1 text-xs" style={{ color: active ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.35)" }}>{opt.label}</span>
                        {active && (
                          <>
                            <input type="number" min={0} max={100} className="input-dark w-14 text-center text-xs"
                              value={active.percentage} onChange={e => updateFormatPct(opt.id, Number(e.target.value))} />
                            <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>%</span>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Channels */}
              <div>
                <p className="mb-2 text-xs font-bold" style={{ color: "#c4b5fd" }}>ערוצים ותדירות</p>
                <div className="space-y-1.5">
                  {PLATFORMS.map(pl => {
                    const active = channels.find(c => c.platform === pl.id);
                    return (
                      <div key={pl.id} className="flex items-center gap-3 rounded-lg px-3 py-2 transition"
                        style={{ border: `0.5px solid ${active ? "rgba(124,58,237,0.45)" : "rgba(255,255,255,0.08)"}`, background: active ? "rgba(124,58,237,0.1)" : "rgba(255,255,255,0.02)" }}>
                        <button onClick={() => toggleChannel(pl.id)}
                          className="h-5 w-5 shrink-0 rounded-full border text-[10px] font-bold transition"
                          style={{ borderColor: active ? "#7c3aed" : "rgba(255,255,255,0.2)", background: active ? "#7c3aed" : "transparent", color: active ? "#fff" : "transparent" }}>
                          ✓
                        </button>
                        <span className="flex-1 text-sm" style={{ color: active ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.35)" }}>{pl.label}</span>
                        {active && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>פוסטים/שבוע</span>
                            <button onClick={() => updateFreq(pl.id, Math.max(1, active.posts_per_week - 1))}
                              className="flex h-5 w-5 items-center justify-center rounded-full text-xs"
                              style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}>−</button>
                            <span className="w-4 text-center text-sm font-bold" style={{ color: "#c4b5fd" }}>{active.posts_per_week}</span>
                            <button onClick={() => updateFreq(pl.id, Math.min(14, active.posts_per_week + 1))}
                              className="flex h-5 w-5 items-center justify-center rounded-full text-xs"
                              style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}>+</button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Hashtags */}
              <GField label="האשטאגים">
                <input className="input-dark" dir="ltr" placeholder="#ישראל #שיווק #marketing"
                  value={form.brand_hashtags} onChange={e => field("brand_hashtags", e.target.value)} />
              </GField>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-between px-5 py-3.5"
          style={{ background: "rgba(0,0,0,0.28)", borderTop: "0.5px solid rgba(167,139,250,0.15)" }}>
          {tab !== "generate" ? (
            <>
              <button onClick={onClose} className="btn-ghost text-sm">ביטול</button>
              <div className="flex items-center gap-2">
                {saveOk && <span className="text-xs" style={{ color: "#6ee7b7" }}>✓ נשמר</span>}
                <button onClick={handleSaveProfile} disabled={saving} className="btn-primary">
                  {saving ? "שומר…" : "שמור פרופיל"}
                </button>
                <button onClick={() => setTab("generate")} className="btn-primary" style={{ background: "rgba(124,58,237,0.4)" }}>
                  ← יצירה
                </button>
              </div>
            </>
          ) : (
            <>
              <button onClick={onClose} className="btn-ghost text-sm">ביטול</button>
              {!loading && (
                <button onClick={handleGenerate} className="btn-primary px-6">
                  <i className="ti ti-sparkles me-1" aria-hidden="true" />
                  צור גאנט אוטומטי
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function GField({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline gap-2">
        <span className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.75)" }}>{label}</span>
        {hint && <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}
