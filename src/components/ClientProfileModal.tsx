"use client";

import { useState } from "react";
import type { Client, ContentPillar, ChannelConfig, SocialChannel, PostFormatMix, PostFormat } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { AiSpinner } from "@/components/AiSpinner";

const PLATFORMS: { id: SocialChannel; label: string; icon: string }[] = [
  { id: "instagram", label: "אינסטגרם", icon: "ti-brand-instagram" },
  { id: "facebook",  label: "פייסבוק",  icon: "ti-brand-facebook" },
  { id: "linkedin",  label: "לינקדאין", icon: "ti-brand-linkedin" },
  { id: "tiktok",    label: "טיקטוק",   icon: "ti-brand-tiktok" },
  { id: "twitter",   label: "X / טוויטר", icon: "ti-brand-x" },
];

const FORMAT_OPTIONS: { id: PostFormat; label: string; desc: string; icon: string }[] = [
  { id: "reel",     label: "רילס",          desc: "סרטון קצר 15-90 שניות", icon: "ti-video" },
  { id: "carousel", label: "קרוסלה",        desc: "מצגת 2-10 תמונות",      icon: "ti-layout-columns" },
  { id: "static",   label: "תמונה בודדת",  desc: "פוסט תמונה/גרפיקה",     icon: "ti-photo" },
  { id: "story",    label: "סטורי",         desc: "Story 24 שעות",          icon: "ti-circle" },
];

const PILLAR_SUGGESTIONS = [
  "טיפים מקצועיים", "הצגת מוצרים", "עדויות לקוחות",
  "מאחורי הקלעים", "מבצעים והנחות", "תוכן חינוכי",
  "חדשות ועדכונים", "השראה ומוטיבציה", "תוכן עונתי",
];

type Tab = "profile" | "content" | "channels";

export function ClientProfileModal({
  client,
  onClose,
  onSaved,
}: {
  client: Client;
  onClose: () => void;
  onSaved: (updated: Client) => void;
}) {
  const [tab, setTab] = useState<Tab>("profile");

  const [form, setForm] = useState({
    business_description: client.business_description ?? "",
    target_audience:      client.target_audience ?? "",
    competitors:          client.competitors ?? "",
    tone:                 client.tone ?? "",
    design_notes:         client.design_notes ?? "",
    do_not_post:          client.do_not_post ?? "",
    seasonal_events:      client.seasonal_events ?? "",
    writing_examples:     client.writing_examples ?? "",
    brand_hashtags:       client.brand_hashtags ?? "",
  });

  const [pillars, setPillars] = useState<ContentPillar[]>(
    client.content_pillars ?? [
      { name: "טיפים מקצועיים", percentage: 40 },
      { name: "הצגת מוצרים",    percentage: 35 },
      { name: "עדויות לקוחות",  percentage: 25 },
    ]
  );

  const [channels, setChannels] = useState<ChannelConfig[]>(client.social_channels ?? []);

  const [formats, setFormats] = useState<PostFormatMix[]>(
    client.post_format_mix ?? [
      { format: "static",   percentage: 40 },
      { format: "reel",     percentage: 35 },
      { format: "carousel", percentage: 25 },
    ]
  );

  const [sources, setSources] = useState({
    websiteUrl:       client.website_url ?? "",
    instagramHandle:  client.instagram_handle ?? "",
    facebookUrl:      client.facebook_url ?? "",
  });
  const [scrapedFrom, setScrapedFrom] = useState<string[]>([]);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [researching, setResearching] = useState(false);

  function field(key: keyof typeof form, value: string) {
    setForm(f => ({ ...f, [key]: value }));
  }

  // Pillars
  const totalPillarPct = pillars.reduce((s, p) => s + p.percentage, 0);
  function addPillar() {
    if (pillars.length >= 6) return;
    setPillars(p => [...p, { name: "", percentage: Math.max(0, 100 - totalPillarPct) }]);
  }
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

  // Format mix
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
    setScrapedFrom([]);
    try {
      const res = await fetch("/api/client/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName:      client.name,
          websiteUrl:      sources.websiteUrl || undefined,
          instagramHandle: sources.instagramHandle || undefined,
          facebookUrl:     sources.facebookUrl || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "שגיאה");
      setForm({
        business_description: data.business_description ?? "",
        target_audience:      data.target_audience ?? "",
        competitors:          data.competitors ?? "",
        tone:                 data.tone ?? "",
        design_notes:         data.design_notes ?? "",
        do_not_post:          data.do_not_post ?? "",
        seasonal_events:      data.seasonal_events ?? "",
        writing_examples:     data.writing_examples ?? "",
        brand_hashtags:       data.brand_hashtags ?? "",
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
          target_audience:      form.target_audience || null,
          competitors:          form.competitors || null,
          tone:                 form.tone || null,
          design_notes:         form.design_notes || null,
          do_not_post:          form.do_not_post || null,
          seasonal_events:      form.seasonal_events || null,
          writing_examples:     form.writing_examples || null,
          brand_hashtags:       form.brand_hashtags || null,
          content_pillars:      pillars.length > 0 ? pillars : null,
          social_channels:      channels.length > 0 ? channels : null,
          post_format_mix:      formats.length > 0 ? formats : null,
          website_url:          sources.websiteUrl || null,
          instagram_handle:     sources.instagramHandle || null,
          facebook_url:         sources.facebookUrl || null,
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

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: "profile",  label: "פרופיל",         icon: "ti-user" },
    { id: "content",  label: "אסטרטגיית תוכן", icon: "ti-layout-columns" },
    { id: "channels", label: "ערוצים",          icon: "ti-brand-instagram" },
  ];

  const PILLAR_COLORS = ["#7c3aed","#ec4899","#f97316","#10b981","#3b82f6","#f59e0b"];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-lg flex-col overflow-hidden rounded-2xl max-h-[90vh]"
        style={{
          background: "rgba(10,5,35,0.95)",
          border: "0.5px solid rgba(167,139,250,0.3)",
          boxShadow: "0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(124,58,237,0.1)",
          backdropFilter: "blur(24px)",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex shrink-0 items-center justify-between px-5 py-4"
          style={{ background: "rgba(0,0,0,0.3)", borderBottom: "0.5px solid rgba(167,139,250,0.2)" }}
        >
          <div>
            <h3 className="font-bold" style={{ color: "rgba(255,255,255,0.95)" }}>הגדרת לקוח</h3>
            <p className="mt-0.5 text-xs" style={{ color: "rgba(167,139,250,0.7)" }}>{client.name}</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-sm transition"
            style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}
          >×</button>
        </div>

        {/* Tabs */}
        <div className="flex shrink-0" style={{ borderBottom: "0.5px solid rgba(167,139,250,0.15)" }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition"
              style={{
                color: tab === t.id ? "#c4b5fd" : "rgba(255,255,255,0.35)",
                borderBottom: tab === t.id ? "2px solid #7c3aed" : "2px solid transparent",
                background: tab === t.id ? "rgba(124,58,237,0.08)" : "transparent",
              }}
            >
              <i className={`ti ${t.icon}`} style={{ fontSize: 13 }} aria-hidden="true" />
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

          {researching && <AiSpinner label={`Claude חוקר את ${client.name}…`} />}

          {/* ===== TAB: פרופיל ===== */}
          {!researching && tab === "profile" && (
            <div className="space-y-4">
              {/* Research sources */}
              <div className="space-y-2 rounded-xl p-3" style={{ background: "rgba(124,58,237,0.1)", border: "0.5px solid rgba(124,58,237,0.3)" }}>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold" style={{ color: "#c4b5fd" }}>
                  <i className="ti ti-world" aria-hidden="true" />
                  מקורות מידע — AI יסרוק ויש מהם
                </p>
                {[
                  { icon: "ti-world-www", key: "websiteUrl" as const, placeholder: "כתובת אתר (https://example.co.il)" },
                  { icon: "ti-brand-instagram", key: "instagramHandle" as const, placeholder: "@שם_משתמש_אינסטגרם" },
                  { icon: "ti-brand-facebook", key: "facebookUrl" as const, placeholder: "קישור לדף פייסבוק" },
                ].map(({ icon, key, placeholder }) => (
                  <div key={key} className="flex items-center gap-2">
                    <i className={`ti ${icon}`} style={{ fontSize: 15, color: "rgba(167,139,250,0.5)" }} aria-hidden="true" />
                    <input
                      className="input-dark flex-1 text-sm"
                      placeholder={placeholder}
                      value={sources[key]}
                      onChange={e => setSources(s => ({ ...s, [key]: e.target.value }))}
                      dir="ltr"
                    />
                  </div>
                ))}
                <button
                  onClick={handleResearch}
                  disabled={researching}
                  className="mt-1 w-full rounded-lg py-2 text-xs font-bold text-white transition disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg,#7c3aed,#6d28d9)" }}
                >
                  <i className="ti ti-sparkles me-1" aria-hidden="true" />
                  נתח מהאינטרנט עם AI
                </button>
                {scrapedFrom.length > 0 && (
                  <p className="text-center text-[11px]" style={{ color: "#6ee7b7" }}>
                    ✓ נסרקו: {scrapedFrom.join(", ")}
                  </p>
                )}
              </div>

              <DField label="תיאור העסק" hint="מה מוכרים? מה ייחודי?">
                <textarea className="input-dark min-h-[80px] resize-y"
                  placeholder="לדוגמה: חנות בגדי ילדים מובילה, מתמחה בגילאי 0-12, ידועה במחירים נגישים"
                  value={form.business_description} onChange={e => field("business_description", e.target.value)} />
              </DField>
              <DField label="קהל יעד" hint="גיל, מגדר, תחומי עניין">
                <textarea className="input-dark min-h-[60px] resize-y"
                  placeholder="לדוגמה: הורים לילדים 0-12, גיל 25-45, מחפשים איכות במחיר הוגן"
                  value={form.target_audience} onChange={e => field("target_audience", e.target.value)} />
              </DField>
              <DField label="מתחרים עיקריים">
                <textarea className="input-dark min-h-[60px] resize-y"
                  placeholder="לדוגמה: H&M Kids, Zara Kids, פוקס קידס"
                  value={form.competitors} onChange={e => field("competitors", e.target.value)} />
              </DField>
              <DField label="טון וסגנון" hint="איך הלקוח מדבר?">
                <textarea className="input-dark min-h-[60px] resize-y"
                  placeholder="לדוגמה: חמים ומשפחתי, עברית פשוטה, פנייה בגוף שני"
                  value={form.tone} onChange={e => field("tone", e.target.value)} />
              </DField>
              <DField label="הערות עיצוב / ויזואל">
                <textarea className="input-dark min-h-[60px] resize-y"
                  placeholder="לדוגמה: פלטת ורוד-לבן, תמונות ילדים אמיתיים, לא סטוק"
                  value={form.design_notes} onChange={e => field("design_notes", e.target.value)} />
              </DField>
              <DField label="⛔ מה לא לפרסם" hint="נושאים רגישים / איסורים">
                <textarea className="input-dark min-h-[60px] resize-y"
                  placeholder="לדוגמה: אין להזכיר מחירים מדויקים, אין פוליטיקה, אין תמונות מבוגרים"
                  value={form.do_not_post} onChange={e => field("do_not_post", e.target.value)} />
              </DField>
              <DField label="אירועים עונתיים ייחודיים" hint="חגים, מבצעים חוזרים, ימי שנה">
                <textarea className="input-dark min-h-[60px] resize-y"
                  placeholder="לדוגמה: מכירת חיסול בסוף כל עונה, Sale ראש השנה 30%, יום הולדת לחנות בפברואר"
                  value={form.seasonal_events} onChange={e => field("seasonal_events", e.target.value)} />
              </DField>
              <DField label="דוגמאות כתיבה / פוסטים מוצלחים" hint="מלמד את ה-AI את הסגנון">
                <textarea className="input-dark min-h-[100px] resize-y"
                  placeholder={"לדוגמה:\n״הילדים חוזרים לבית ספר ואתם? אצלנו מחכה לכם קולקציית ספטמבר החדשה 🎒 כנסו לאתר ← ״\n\n״הגיע ה-SALE! עד 70% הנחה על כל האביב-קיץ. רק השבוע. לא תחכו.״"}
                  value={form.writing_examples} onChange={e => field("writing_examples", e.target.value)} />
              </DField>
            </div>
          )}

          {/* ===== TAB: אסטרטגיית תוכן ===== */}
          {!researching && tab === "content" && (
            <div className="space-y-5">
              {/* Content Pillars */}
              <div>
                <p className="mb-3 text-xs font-bold" style={{ color: "#c4b5fd" }}>
                  <i className="ti ti-chart-pie me-1.5" aria-hidden="true" />
                  עמודי תוכן — על מה כותבים וכמה
                </p>
                <div className="relative mb-2 h-3 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}>
                  {pillars.map((p, i) => {
                    const left = pillars.slice(0, i).reduce((s, x) => s + x.percentage, 0);
                    return <div key={i} className="absolute top-0 h-full transition-all"
                      style={{ left: `${left}%`, width: `${p.percentage}%`, background: PILLAR_COLORS[i % PILLAR_COLORS.length] }} />;
                  })}
                </div>
                <p className="mb-3 text-center text-xs" style={{ color: totalPillarPct === 100 ? "#6ee7b7" : "#fca5a5" }}>
                  סה״כ: {totalPillarPct}% {totalPillarPct === 100 ? "✓" : `(חסר ${100 - totalPillarPct}%)`}
                </p>
                <div className="space-y-2">
                  {pillars.map((p, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: PILLAR_COLORS[i % PILLAR_COLORS.length] }} />
                      <input className="input-dark flex-1 text-sm" placeholder="שם הנושא"
                        value={p.name} onChange={e => updatePillar(i, "name", e.target.value)}
                        list={`pillar-sugg-${i}`} />
                      <datalist id={`pillar-sugg-${i}`}>
                        {PILLAR_SUGGESTIONS.map(s => <option key={s} value={s} />)}
                      </datalist>
                      <div className="flex shrink-0 items-center gap-1">
                        <input type="number" min={0} max={100} className="input-dark w-16 text-center text-sm"
                          value={p.percentage} onChange={e => updatePillar(i, "percentage", Number(e.target.value))} />
                        <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>%</span>
                      </div>
                      <button onClick={() => removePillar(i)} className="text-lg leading-none transition"
                        style={{ color: "rgba(255,255,255,0.2)" }}
                        onMouseEnter={e => (e.currentTarget.style.color = "#f87171")}
                        onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.2)")}>×</button>
                    </div>
                  ))}
                </div>
                {pillars.length < 6 && (
                  <button onClick={addPillar}
                    className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition"
                    style={{ border: "1px dashed rgba(167,139,250,0.4)", color: "#a78bfa" }}>
                    <i className="ti ti-plus" aria-hidden="true" /> הוסף עמוד תוכן
                  </button>
                )}
              </div>

              {/* Format mix */}
              <div>
                <p className="mb-3 text-xs font-bold" style={{ color: "#c4b5fd" }}>
                  <i className="ti ti-video me-1.5" aria-hidden="true" />
                  סוגי תוכן — פורמטים מועדפים
                </p>
                <div className="relative mb-2 h-3 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}>
                  {formats.map((f, i) => {
                    const left = formats.slice(0, i).reduce((s, x) => s + x.percentage, 0);
                    return <div key={f.format} className="absolute top-0 h-full transition-all"
                      style={{ left: `${left}%`, width: `${f.percentage}%`, background: PILLAR_COLORS[i % PILLAR_COLORS.length] }} />;
                  })}
                </div>
                <p className="mb-3 text-center text-xs" style={{ color: totalFormatPct === 100 ? "#6ee7b7" : "#fca5a5" }}>
                  סה״כ: {totalFormatPct}% {totalFormatPct === 100 ? "✓" : `(חסר ${100 - totalFormatPct}%)`}
                </p>
                <div className="space-y-2">
                  {FORMAT_OPTIONS.map((opt, i) => {
                    const active = formats.find(f => f.format === opt.id);
                    return (
                      <div key={opt.id} className="flex items-center gap-3 rounded-xl p-2.5 transition"
                        style={{
                          border: `0.5px solid ${active ? "rgba(124,58,237,0.5)" : "rgba(255,255,255,0.1)"}`,
                          background: active ? "rgba(124,58,237,0.12)" : "rgba(255,255,255,0.03)",
                        }}>
                        <button onClick={() => toggleFormat(opt.id)}
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition"
                          style={{ background: active ? "#7c3aed" : "rgba(255,255,255,0.08)", color: active ? "#fff" : "rgba(255,255,255,0.3)" }}>
                          <i className={`ti ${opt.icon}`} style={{ fontSize: 13 }} aria-hidden="true" />
                        </button>
                        <div className="flex-1">
                          <p className="text-xs font-semibold" style={{ color: active ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.4)" }}>{opt.label}</p>
                          <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>{opt.desc}</p>
                        </div>
                        {active && (
                          <div className="flex shrink-0 items-center gap-1">
                            <input type="number" min={0} max={100} className="input-dark w-16 text-center text-sm"
                              value={active.percentage} onChange={e => updateFormatPct(opt.id, Number(e.target.value))} />
                            <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>%</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Hashtags */}
              <DField label="האשטאגים קבועים" hint="יצורפו לכל פוסט">
                <input className="input-dark" dir="ltr"
                  placeholder="#ישראל #שיווק #תוכן #marketing"
                  value={form.brand_hashtags} onChange={e => field("brand_hashtags", e.target.value)} />
              </DField>
            </div>
          )}

          {/* ===== TAB: ערוצים ===== */}
          {!researching && tab === "channels" && (
            <div className="space-y-4">
              <div className="rounded-xl p-3 text-xs" style={{ background: "rgba(124,58,237,0.1)", border: "0.5px solid rgba(124,58,237,0.3)", color: "#c4b5fd" }}>
                <i className="ti ti-info-circle me-1" aria-hidden="true" />
                בחר פלטפורמות פעילות — הגאנט יחלק פוסטים בהתאם לתדירות שתגדיר
              </div>
              <div className="space-y-2">
                {PLATFORMS.map(pl => {
                  const active = channels.find(c => c.platform === pl.id);
                  return (
                    <div key={pl.id} className="flex items-center gap-3 rounded-xl p-3 transition"
                      style={{
                        border: `0.5px solid ${active ? "rgba(124,58,237,0.5)" : "rgba(255,255,255,0.1)"}`,
                        background: active ? "rgba(124,58,237,0.12)" : "rgba(255,255,255,0.03)",
                      }}>
                      <button onClick={() => toggleChannel(pl.id)}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition"
                        style={{ background: active ? "#7c3aed" : "rgba(255,255,255,0.08)", color: active ? "#fff" : "rgba(255,255,255,0.3)" }}>
                        <i className={`ti ${pl.icon}`} style={{ fontSize: 16 }} aria-hidden="true" />
                      </button>
                      <span className="flex-1 text-sm font-medium" style={{ color: active ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.4)" }}>{pl.label}</span>
                      {active && (
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>פוסטים/שבוע</span>
                          <div className="flex items-center gap-1">
                            <button onClick={() => updateFreq(pl.id, Math.max(1, active.posts_per_week - 1))}
                              className="flex h-6 w-6 items-center justify-center rounded-full text-xs transition"
                              style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}>−</button>
                            <span className="w-5 text-center text-sm font-semibold" style={{ color: "#c4b5fd" }}>{active.posts_per_week}</span>
                            <button onClick={() => updateFreq(pl.id, Math.min(14, active.posts_per_week + 1))}
                              className="flex h-6 w-6 items-center justify-center rounded-full text-xs transition"
                              style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}>+</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {channels.length > 0 && (
                <div className="rounded-xl px-3 py-2 text-xs"
                  style={{ background: "rgba(52,211,153,0.1)", border: "0.5px solid rgba(52,211,153,0.3)", color: "#6ee7b7" }}>
                  סה״כ: ~{channels.reduce((s, c) => s + c.posts_per_week * 4, 0)} פוסטים לחודש
                  ({channels.map(c => `${PLATFORMS.find(p => p.id === c.platform)?.label} ×${c.posts_per_week * 4}`).join(", ")})
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 justify-end gap-2 px-5 py-3.5"
          style={{ background: "rgba(0,0,0,0.25)", borderTop: "0.5px solid rgba(167,139,250,0.15)" }}>
          <button onClick={onClose} className="btn-ghost">ביטול</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? "שומר…" : "שמירה"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DField({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline gap-2">
        <span className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.8)" }}>{label}</span>
        {hint && <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}
