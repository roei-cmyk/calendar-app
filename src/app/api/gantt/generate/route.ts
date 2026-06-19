import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

// Allow up to 60 seconds (requires Vercel Pro — on Hobby the cap is 10s)
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
  );

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY!,
  });

  try {
    const { clientId, month, instructions } = await req.json() as {
      clientId: string;
      month: string; // YYYY-MM
      instructions: string;
    };

    if (!clientId || !month || !instructions) {
      return NextResponse.json({ error: "חסרים פרטים" }, { status: 400 });
    }

    const { data: client } = await supabase
      .from("clients")
      .select("id, name, business_description, target_audience, competitors, tone, design_notes, content_pillars, social_channels")
      .eq("id", clientId)
      .single();

    if (!client) {
      return NextResponse.json({ error: "לקוח לא נמצא" }, { status: 404 });
    }

    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "admin")
      .limit(1)
      .single();

    const [year, mon] = month.split("-").map(Number);
    const daysInMonth = new Date(year, mon, 0).getDate();

    // Build client profile context
    const profileLines = [
      client.business_description && `תיאור העסק: ${client.business_description}`,
      client.target_audience      && `קהל יעד: ${client.target_audience}`,
      client.competitors          && `מתחרים: ${client.competitors}`,
      client.tone                 && `טון וסגנון: ${client.tone}`,
      client.design_notes         && `הערות עיצוב: ${client.design_notes}`,
    ].filter(Boolean).join("\n");

    // Content pillars instruction
    const pillarsText = client.content_pillars?.length
      ? `\nעמודי תוכן (חלוקה נדרשת):\n${client.content_pillars.map((p: { name: string; percentage: number }) => `- ${p.name}: ${p.percentage}% מהפוסטים`).join("\n")}\nחשוב: שמור על חלוקה זו בין הנושאים.`
      : "";

    // Social channels instruction
    const channelsText = client.social_channels?.length
      ? `\nערוצים פעילים ותדירות:\n${client.social_channels.map((c: { platform: string; posts_per_week: number }) => `- ${c.platform}: ${c.posts_per_week} פוסטים לשבוע (≈${c.posts_per_week * 4} לחודש)`).join("\n")}\nחשוב: התאם את סגנון הכתיבה לכל פלטפורמה (אינסטגרם=קצר+אמוג׳י, לינקדאין=מקצועי, פייסבוק=שיחתי, טיקטוק=טרנדי).`
      : "";

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: `צור לוח תוכן חודשי לרשתות חברתיות עבור: ${client.name}.
חודש: ${month} (${daysInMonth} ימים)
${profileLines ? `\nפרופיל הלקוח:\n${profileLines}` : ""}${pillarsText}${channelsText}
הוראות נוספות: ${instructions}

החזר JSON בלבד:
{"posts":[{"title":"...","body":"...","platform":"...","scheduled_date":"${month}-DD","scheduled_time":"HH:MM"}]}

כללים: scheduled_date בפורמט ${month}-DD, פזר לאורך החודש, עברית בלבד, JSON בלבד.`,
        },
      ],
    });

    const rawText = message.content[0].type === "text" ? message.content[0].text : "";
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "שגיאה בפענוח התגובה" }, { status: 500 });
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      posts: Array<{
        title: string;
        body?: string;
        platform?: string;
        scheduled_date: string;
        scheduled_time?: string;
      }>;
    };

    const from = `${month}-01`;
    const to = `${month}-${String(daysInMonth).padStart(2, "0")}`;
    await supabase
      .from("posts")
      .delete()
      .eq("client_id", clientId)
      .eq("status", "draft")
      .gte("scheduled_date", from)
      .lte("scheduled_date", to);

    const rows = parsed.posts.map((p) => ({
      client_id: clientId,
      title: p.title,
      body: p.body ?? null,
      platform: p.platform ?? null,
      scheduled_date: p.scheduled_date,
      scheduled_time: p.scheduled_time ?? null,
      status: "draft" as const,
      created_by: adminProfile?.id ?? null,
    }));

    const { data: inserted, error: insertErr } = await supabase
      .from("posts")
      .insert(rows)
      .select("id");

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, inserted: inserted?.length ?? 0 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
