import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function POST(req: NextRequest) {
  try {
    const { clientId, month, instructions } = await req.json() as {
      clientId: string;
      month: string; // YYYY-MM
      instructions: string;
    };

    if (!clientId || !month || !instructions) {
      return NextResponse.json({ error: "חסרים פרטים" }, { status: 400 });
    }

    // Get client info
    const { data: client } = await supabase
      .from("clients")
      .select("id, name")
      .eq("id", clientId)
      .single();

    if (!client) {
      return NextResponse.json({ error: "לקוח לא נמצא" }, { status: 404 });
    }

    // Get admin profile
    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "admin")
      .limit(1)
      .single();

    // Parse month to get date range
    const [year, mon] = month.split("-").map(Number);
    const daysInMonth = new Date(year, mon, 0).getDate();

    // Call Claude API
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: `אתה עוזר ליצירת לוח תוכן לרשתות חברתיות עבור הלקוח: ${client.name}.

החודש: ${month} (${daysInMonth} ימים)

הוראות: ${instructions}

צור לוח תוכן חודשי. החזר JSON בלבד, ללא טקסט נוסף, בפורמט הבא:
{
  "posts": [
    {
      "title": "כותרת הפוסט",
      "body": "תוכן מלא של הפוסט",
      "platform": "פייסבוק",
      "scheduled_date": "${month}-01",
      "scheduled_time": "10:00"
    }
  ]
}

חשוב:
- scheduled_date חייב להיות בפורמט YYYY-MM-DD בתוך החודש ${month}
- פזר את הפוסטים לאורך כל החודש
- כתוב תוכן אמיתי ומקצועי בעברית
- החזר JSON בלבד ללא הסברים`,
        },
      ],
    });

    // Extract JSON from response
    const rawText = message.content[0].type === "text" ? message.content[0].text : "";
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "שגיאה בפענוח התגובה מ-Claude" }, { status: 500 });
    }

    const parsed = JSON.parse(jsonMatch[0]) as { posts: Array<{
      title: string;
      body?: string;
      platform?: string;
      scheduled_date: string;
      scheduled_time?: string;
    }> };

    // Delete existing drafts for this month
    const from = `${month}-01`;
    const to = `${month}-${daysInMonth}`;
    await supabase
      .from("posts")
      .delete()
      .eq("client_id", clientId)
      .eq("status", "draft")
      .gte("scheduled_date", from)
      .lte("scheduled_date", to);

    // Insert new posts
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

    return NextResponse.json({
      success: true,
      inserted: inserted?.length ?? 0,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
