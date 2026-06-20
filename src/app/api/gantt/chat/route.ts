import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 120;

const HEBREW_MONTHS: Record<number, string> = {
  1: "ינואר", 2: "פברואר", 3: "מרץ", 4: "אפריל", 5: "מאי", 6: "יוני",
  7: "יולי", 8: "אוגוסט", 9: "ספטמבר", 10: "אוקטובר", 11: "נובמבר", 12: "דצמבר",
};

function getMonthEvents(year: number, mon: number): string {
  const fixed: Record<number, string[]> = {
    1:  ["1.1 ראש השנה הלועזי", "ט\"ו בשבט (בד\"כ ינואר-פברואר)"],
    2:  ["14.2 יום האהבה / ולנטיינס דיי", "פורים (בד\"כ פברואר-מרץ)"],
    3:  ["8.3 יום האישה הבינלאומי", "פסח (אפריל — הכנות נעשות במרץ)"],
    4:  ["פסח ומועד חג", "יום השואה"],
    5:  ["יום הזיכרון", "5.5 יום העצמאות", "שבועות (מאי-יוני)"],
    6:  ["יום הילד הבינלאומי 1.6", "יום האב (ראשון ראשון ביוני)", "תחילת קיץ"],
    7:  ["קיץ / חופשות גדולות"],
    8:  ["חופשות גדולות / ילדים בבית", "קניות לקראת ספטמבר"],
    9:  ["ראש השנה", "יום כיפור", "סוכות"],
    10: ["שמחת תורה", "מכירות אחרי החגים", "הכנות לחנוכה"],
    11: ["חנוכה (בד\"כ נובמבר-דצמבר)", "Black Friday", "Singles Day 11.11"],
    12: ["חנוכה", "סוף שנה", "31.12 ערב השנה החדשה"],
  };
  const events = fixed[mon] ?? [];
  return events.length
    ? `\nאירועים רלוונטיים ב${HEBREW_MONTHS[mon]} ${year}:\n${events.map(e => `• ${e}`).join("\n")}`
    : "";
}

type ChatMessage = { role: "user" | "assistant"; content: string };

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
  );
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

  const { clientId, month, messages } = await req.json() as {
    clientId: string;
    month: string;
    messages: ChatMessage[];
  };

  const { data: client } = await supabase
    .from("clients")
    .select(`id, name, business_description, target_audience, competitors, tone, design_notes,
             content_pillars, social_channels, post_format_mix, brand_hashtags,
             do_not_post, seasonal_events, writing_examples`)
    .eq("id", clientId)
    .single();

  if (!client) return NextResponse.json({ error: "לקוח לא נמצא" }, { status: 404 });

  const [year, mon] = month.split("-").map(Number);
  const daysInMonth = new Date(year, mon, 0).getDate();

  type ChannelRow = { platform: string; posts_per_week: number };
  const totalPostsPerWeek = (client.social_channels as ChannelRow[] | null)
    ?.reduce((s: number, c: ChannelRow) => s + c.posts_per_week, 0) ?? 4;
  const totalPosts = Math.round(totalPostsPerWeek * 4.3);

  type PillarRow = { name: string; percentage: number };
  const pillarsText = (client.content_pillars as PillarRow[] | null)?.length
    ? `\nעמודי תוכן:\n${(client.content_pillars as PillarRow[]).map(p => `• ${p.name}: ${p.percentage}% (~${Math.round(totalPosts * p.percentage / 100)} פוסטים)`).join("\n")}`
    : "";

  const channelsText = (client.social_channels as ChannelRow[] | null)?.length
    ? `\nפלטפורמות ותדירות:\n${(client.social_channels as ChannelRow[]).map(c => `• ${c.platform}: ${c.posts_per_week} פוסטים/שבוע`).join("\n")}`
    : "";

  type FormatRow = { format: string; percentage: number };
  const formatLabels: Record<string, string> = { reel: "רילס", carousel: "קרוסלה", static: "תמונה בודדת", story: "סטורי" };
  const formatText = (client.post_format_mix as FormatRow[] | null)?.length
    ? `\nסוגי תוכן:\n${(client.post_format_mix as FormatRow[]).map(f => `• ${formatLabels[f.format] ?? f.format}: ${f.percentage}%`).join("\n")}`
    : "";

  const monthEvents = getMonthEvents(year, mon);
  const monthLabel = `${HEBREW_MONTHS[mon]} ${year}`;

  const systemPrompt = `אתה מנהל תוכן ישראלי מנוסה עם 10 שנות ניסיון בסושיאל מדיה.
אתה עוזר לבנות ולחדד לוח תוכן חודשי עבור הלקוח: ${client.name}.

===== פרופיל הלקוח =====
${client.business_description ? `תיאור: ${client.business_description}` : ""}
${client.target_audience ? `קהל יעד: ${client.target_audience}` : ""}
${client.competitors ? `מתחרים: ${client.competitors}` : ""}
${client.tone ? `טון: ${client.tone}` : ""}
${client.design_notes ? `עיצוב: ${client.design_notes}` : ""}
${pillarsText}${channelsText}${formatText}
${client.brand_hashtags ? `האשטאגים: ${client.brand_hashtags}` : ""}
${client.do_not_post ? `⛔ אסור לפרסם: ${client.do_not_post}` : ""}
${client.seasonal_events ? `אירועים עונתיים: ${client.seasonal_events}` : ""}
${client.writing_examples ? `דוגמאות לפוסטים מוצלחים:\n${client.writing_examples}` : ""}
${monthEvents}

===== חודש עבודה =====
${monthLabel} (${daysInMonth} ימים) | ${totalPosts} פוסטים בסך הכל

===== כללי עבודה =====
1. דבר בעברית בלבד, בצורה מקצועית וחמה.
2. כשתציע פוסטים — כתוב גוף פוסט אמיתי ומוכן לפרסום (לא תבנית). גוף: עד 5 שורות קצרות בלבד — ממוקד וחד.
3. הקשב לבקשות המשתמש ושנה בהתאם.
4. בכל תגובה שכוללת פוסטים, חובה להתחיל עם הבלוק הבא (לפני כל טקסט אחר):

---POSTS_START---
{"posts":[{"title":"...","body":"...","platform":"instagram|facebook|tiktok|linkedin","post_type":"tip|promo|story|testimonial|engagement|seasonal|product|educational","scheduled_date":"${month}-DD","scheduled_time":"HH:MM","image_prompt":"..."}]}
---POSTS_END---

אחרי הבלוק — כתוב 1-2 משפטים קצרים בלבד שמסכמים את ההצעה.
5. תמיד כלול את כל הפוסטים בבלוק — גם כשמשנים רק פוסט אחד.
6. image_prompt: עד 15 מילים באנגלית, ללא טקסט/לוגו/ילדים.
7. חשוב: סיים תמיד עם ---POSTS_END--- לסגירת הבלוק.`;

  const isStart = messages.length === 1 && messages[0].content === "__start__";

  const initialPosts = Math.min(totalPosts, 5);

  const apiMessages: ChatMessage[] = isStart
    ? [{ role: "user", content: `צור לי הצעה ראשונית ללוח תוכן ל${monthLabel}. הצע ${initialPosts} פוסטים מגוונים פזורים לאורך החודש. גוף כל פוסט: 2-3 שורות קצרות בלבד. התחל ישירות עם בלוק ה-JSON (---POSTS_START---), סיים עם ---POSTS_END---, ואחריו שורה אחת שמסכמת.` }]
    : messages;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4000,
    system: systemPrompt,
    messages: apiMessages,
  });

  const raw = response.content[0].type === "text" ? response.content[0].text : "";

  // Extract JSON block — with or without closing delimiter (handles token-limit truncation)
  const blockStart = raw.indexOf("---POSTS_START---");
  let posts = null;
  let reply = raw.trim();

  if (blockStart !== -1) {
    const blockEnd = raw.indexOf("---POSTS_END---", blockStart);
    const jsonStr = blockEnd !== -1
      ? raw.slice(blockStart + "---POSTS_START---".length, blockEnd).trim()
      : raw.slice(blockStart + "---POSTS_START---".length).trim();

    // Try full parse first
    try {
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed.posts)) posts = parsed.posts;
    } catch {
      // Recovery: find last complete post object and close the array
      const lastBrace = jsonStr.lastIndexOf("}");
      if (lastBrace !== -1) {
        try {
          const parsed = JSON.parse(jsonStr.slice(0, lastBrace + 1) + "]}");
          if (Array.isArray(parsed.posts)) posts = parsed.posts;
        } catch { /* give up */ }
      }
    }

    // Strip the block from the visible reply
    reply = (blockEnd !== -1
      ? raw.slice(blockEnd + "---POSTS_END---".length)
      : ""
    ).trim();
  }

  return NextResponse.json({ reply, posts });
}
