import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 120;

function buildImageUrl(prompt: string): string {
  const encoded = encodeURIComponent(prompt);
  const seed = Math.floor(Math.random() * 1000000);
  return `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=1024&seed=${seed}&nologo=true&enhance=true&model=flux-pro`;
}

function generateImagesBatch(prompts: (string | undefined)[]): (string | null)[] {
  return prompts.map(p => p ? buildImageUrl(p) : null);
}

const HEBREW_MONTHS: Record<number, string> = {
  1: "ינואר", 2: "פברואר", 3: "מרץ", 4: "אפריל", 5: "מאי", 6: "יוני",
  7: "יולי", 8: "אוגוסט", 9: "ספטמבר", 10: "אוקטובר", 11: "נובמבר", 12: "דצמבר",
};

function getMonthEvents(year: number, mon: number): string {
  const fixed: Record<number, string[]> = {
    1:  ["1.1 ראש השנה הלועזי", "ט\"ו בשבט (בד\"כ ינואר-פברואר)"],
    2:  ["14.2 יום האהבה / ולנטיינס דיי", "פורים (בד\"כ פברואר-מרץ)"],
    3:  ["8.3 יום האישה הבינלאומי", "פסח (אפריל — הכנות נעשות במרץ)"],
    4:  ["פסח ומועד חג — סיכום מכירות, הנחות", "יום השואה (סוף אפריל)"],
    5:  ["יום הזיכרון לחללי מערכות ישראל", "5.5 יום העצמאות", "שבועות (מאי-יוני)"],
    6:  ["יום הילד הבינלאומי 1.6", "יום האב 3.6 (ראשון ראשון ביוני)", "תחילת קיץ / קמפיינים עונתיים"],
    7:  ["קיץ / חופשות גדולות", "חגים ישראליים בספטמבר (הכנות)"],
    8:  ["חופשות גדולות / ילדים בבית", "קניות לקראת ספטמבר — ציוד לבית ספר"],
    9:  ["ראש השנה — שנה טובה ומתוקה", "יום כיפור — מסרים של חידוש ותקווה", "סוכות — שמחת החג"],
    10: ["שמחת תורה", "מכירות אחרי החגים", "חנוכה (בד\"כ נובמבר-דצמבר — הכנות באוקטובר)"],
    11: ["חנוכה (בד\"כ נובמבר-דצמבר)", "Black Friday", "Singles Day 11.11"],
    12: ["חנוכה", "סוף שנה / ביקורת שנתית", "31.12 ערב השנה החדשה — מבצעי סיום שנה"],
  };
  const events = fixed[mon] ?? [];
  return events.length ? `\nאירועים רלוונטיים ב${HEBREW_MONTHS[mon]} ${year}:\n${events.map(e => `• ${e}`).join("\n")}` : "";
}

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
  );
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

  try {
    const { clientId, month, instructions } = await req.json() as {
      clientId: string;
      month: string;
      instructions: string;
    };

    if (!clientId || !month || !instructions) {
      return NextResponse.json({ error: "חסרים פרטים" }, { status: 400 });
    }

    const { data: client } = await supabase
      .from("clients")
      .select(`id, name, business_description, target_audience, competitors, tone, design_notes,
               content_pillars, social_channels, post_format_mix, brand_hashtags,
               do_not_post, seasonal_events, writing_examples`)
      .eq("id", clientId)
      .single();

    if (!client) return NextResponse.json({ error: "לקוח לא נמצא" }, { status: 404 });

    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "admin")
      .limit(1)
      .single();

    const [year, mon] = month.split("-").map(Number);
    const daysInMonth = new Date(year, mon, 0).getDate();

    // Calculate total posts from channels
    type ChannelRow = { platform: string; posts_per_week: number };
    const totalPostsPerWeek = (client.social_channels as ChannelRow[] | null)
      ?.reduce((s: number, c: ChannelRow) => s + c.posts_per_week, 0) ?? 4;
    const totalPosts = Math.round(totalPostsPerWeek * 4.3);

    // Build pillar distribution instruction
    type PillarRow = { name: string; percentage: number };
    const pillarsText = (client.content_pillars as PillarRow[] | null)?.length
      ? `\nעמודי תוכן (חלק בדיוק לפי אחוזים):\n${(client.content_pillars as PillarRow[]).map(p => `• ${p.name}: ${p.percentage}% (~${Math.round(totalPosts * p.percentage / 100)} פוסטים)`).join("\n")}`
      : "";

    // Build channels & format text
    const channelsText = (client.social_channels as ChannelRow[] | null)?.length
      ? `\nפלטפורמות ותדירות:\n${(client.social_channels as ChannelRow[]).map(c => `• ${c.platform}: ${c.posts_per_week} פוסטים/שבוע`).join("\n")}`
      : "";

    type FormatRow = { format: string; percentage: number };
    const formatLabels: Record<string, string> = { reel: "רילס", carousel: "קרוסלה", static: "תמונה בודדת", story: "סטורי" };
    const formatText = (client.post_format_mix as FormatRow[] | null)?.length
      ? `\nסוגי תוכן מועדפים:\n${(client.post_format_mix as FormatRow[]).map(f => `• ${formatLabels[f.format] ?? f.format}: ${f.percentage}%`).join("\n")}`
      : "";

    const profileLines = [
      client.business_description && `תיאור העסק: ${client.business_description}`,
      client.target_audience      && `קהל יעד: ${client.target_audience}`,
      client.competitors          && `מתחרים: ${client.competitors}`,
      client.tone                 && `טון וסגנון: ${client.tone}`,
      client.design_notes         && `הערות עיצוב: ${client.design_notes}`,
    ].filter(Boolean).join("\n");

    const hashtagsLine    = client.brand_hashtags   ? `\nהאשטאגים קבועים: ${client.brand_hashtags}` : "";
    const doNotLine       = client.do_not_post      ? `\n⛔ אסור לכתוב על: ${client.do_not_post}` : "";
    const seasonalLine    = client.seasonal_events  ? `\nאירועים עונתיים ייחודיים ללקוח: ${client.seasonal_events}` : "";
    const examplesLine    = client.writing_examples ? `\nדוגמאות לפוסטים מוצלחים של הלקוח (לימוד סגנון):\n${client.writing_examples}` : "";
    const monthEvents     = getMonthEvents(year, mon);

    const designStyle = [client.tone, client.design_notes].filter(Boolean).join(". ");

    const POST_TYPES = [
      "tip — טיפ מקצועי/חינוכי",
      "promo — מבצע או הצעה מיוחדת",
      "story — סיפור אמיתי / מאחורי הקלעים",
      "testimonial — עדות לקוח / ביקורת חיובית",
      "engagement — שאלה לקהל / סקר / אתגר",
      "seasonal — קשור לחג / עונה / אירוע שוטף",
      "product — הצגת מוצר / שירות ספציפי",
      "educational — תוכן מידעי / רשימה / 'כך תעשו'",
    ];

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 6000,
      messages: [{
        role: "user",
        content: `אתה מנהל תוכן סושיאל מדיה ישראלי מוביל עם 10 שנות ניסיון. צור לוח תוכן חודשי מקצועי ומגוון.

===== פרטי לקוח =====
שם: ${client.name}
חודש: ${HEBREW_MONTHS[mon]} ${year} (${daysInMonth} ימים)
${profileLines ? `\n${profileLines}` : ""}${pillarsText}${channelsText}${formatText}${hashtagsLine}${doNotLine}${seasonalLine}${examplesLine}${monthEvents}

===== הוראות המנהל =====
${instructions}

===== כללי יצירה =====
1. צור בדיוק ${totalPosts} פוסטים, פזורים לאורך כל ימי החודש (לא רק בימי עבודה).
2. גוון בסוגי פוסטים — השתמש בכל הסוגים הבאים לפחות פעם אחת:
${POST_TYPES.map(t => `   • ${t}`).join("\n")}
3. הקפד על חלוקה לפי עמודי התוכן — כל עמוד מקבל את אחוזו.
4. כתוב גוף פוסט מלא בעברית (3-5 שורות), עם CTA ברור בסוף. לא סכמות, לא תבניות — טקסט אמיתי ומוכן לפרסום.
5. כותרת: קצרה, מושכת, עד 8 מילים.
6. התאם לחגים ואירועים של החודש — לפחות פוסט אחד עונתי.
7. image_prompt: תאר תמונה שיווקית ספציפית לפוסט, באנגלית, ובהתאמה לסגנון: "${designStyle || "professional social media marketing"}".
   - tip/educational: "flat design infographic, vector illustration, clean icons, white background, professional"
   - promo: "vibrant promotional banner, bold colors, product showcase, marketing"
   - story/behind-scenes: "candid lifestyle photography, natural lighting, authentic"
   - testimonial: "happy customer, lifestyle photography, warm and inviting"
   - seasonal: match the holiday/event mood
   - כלל: NO text, NO logos, NO watermarks, NO children.

===== פורמט תגובה =====
JSON בלבד, ללא טקסט נוסף:
{"posts":[{
  "title":"...",
  "body":"...",
  "platform":"instagram|facebook|linkedin|tiktok",
  "post_type":"tip|promo|story|testimonial|engagement|seasonal|product|educational",
  "scheduled_date":"${month}-DD",
  "scheduled_time":"HH:MM",
  "image_prompt":"..."
}]}`,
      }],
    });

    const rawText = message.content[0].type === "text" ? message.content[0].text : "";
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json({ error: "שגיאה בפענוח התגובה" }, { status: 500 });

    let parsed: {
      posts: Array<{
        title: string;
        body?: string;
        platform?: string;
        post_type?: string;
        scheduled_date: string;
        scheduled_time?: string;
        image_prompt?: string;
      }>;
    };
    try {
      parsed = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(parsed.posts)) throw new Error("Missing posts array");
    } catch {
      return NextResponse.json({ error: "שגיאה בפענוח JSON מהAI" }, { status: 500 });
    }

    const imageUrls = generateImagesBatch(parsed.posts.map(p => p.image_prompt));

    const from = `${month}-01`;
    const to = `${month}-${String(daysInMonth).padStart(2, "0")}`;
    await supabase
      .from("posts")
      .delete()
      .eq("client_id", clientId)
      .eq("status", "draft")
      .gte("scheduled_date", from)
      .lte("scheduled_date", to);

    const rows = parsed.posts.map((p, i) => ({
      client_id: clientId,
      title: p.title,
      body: p.body ?? null,
      platform: p.platform ?? null,
      scheduled_date: p.scheduled_date,
      scheduled_time: p.scheduled_time ?? null,
      media_url: imageUrls[i] ?? null,
      status: "draft" as const,
      created_by: adminProfile?.id ?? null,
    }));

    const { data: inserted, error: insertErr } = await supabase
      .from("posts")
      .insert(rows)
      .select("id");

    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

    const withImages = imageUrls.filter(Boolean).length;
    return NextResponse.json({ success: true, inserted: inserted?.length ?? 0, withImages });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
