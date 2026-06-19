import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 120;

async function generateImage(prompt: string): Promise<string | null> {
  try {
    const encoded = encodeURIComponent(prompt);
    const seed = Math.floor(Math.random() * 1000000);
    const url = `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=1024&seed=${seed}&nologo=true&enhance=true`;
    const res = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(25000) });
    return res.ok ? url : null;
  } catch {
    return null;
  }
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
      .select("id, name, business_description, target_audience, competitors, tone, design_notes, content_pillars, social_channels")
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

    const profileLines = [
      client.business_description && `תיאור העסק: ${client.business_description}`,
      client.target_audience      && `קהל יעד: ${client.target_audience}`,
      client.competitors          && `מתחרים: ${client.competitors}`,
      client.tone                 && `טון וסגנון: ${client.tone}`,
      client.design_notes         && `הערות עיצוב: ${client.design_notes}`,
    ].filter(Boolean).join("\n");

    const pillarsText = client.content_pillars?.length
      ? `\nעמודי תוכן:\n${client.content_pillars.map((p: { name: string; percentage: number }) => `- ${p.name}: ${p.percentage}%`).join("\n")}`
      : "";

    const channelsText = client.social_channels?.length
      ? `\nערוצים: ${client.social_channels.map((c: { platform: string; posts_per_week: number }) => `${c.platform} ×${c.posts_per_week}/שבוע`).join(", ")}`
      : "";

    const designStyle = [client.tone, client.design_notes].filter(Boolean).join(". ");

    // Step 1: Claude generates posts + image prompts
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 3000,
      messages: [{
        role: "user",
        content: `צור לוח תוכן חודשי לרשתות חברתיות עבור: ${client.name}.
חודש: ${month} (${daysInMonth} ימים)
${profileLines ? `\nפרופיל:\n${profileLines}` : ""}${pillarsText}${channelsText}
הוראות: ${instructions}

החזר JSON בלבד — כל פוסט חייב לכלול image_prompt באנגלית המתאר תמונה שיווקית לפוסט:
{"posts":[{
  "title":"...",
  "body":"...",
  "platform":"...",
  "scheduled_date":"${month}-DD",
  "scheduled_time":"HH:MM",
  "image_prompt":"photorealistic marketing image for [describe scene in English, style: ${designStyle || "professional social media"}], no text, no logos"
}]}

כללים: עברית בלבד לטקסט, scheduled_date בפורמט ${month}-DD, פזר לאורך החודש, JSON בלבד.`,
      }],
    });

    const rawText = message.content[0].type === "text" ? message.content[0].text : "";
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json({ error: "שגיאה בפענוח התגובה" }, { status: 500 });

    const parsed = JSON.parse(jsonMatch[0]) as {
      posts: Array<{
        title: string;
        body?: string;
        platform?: string;
        scheduled_date: string;
        scheduled_time?: string;
        image_prompt?: string;
      }>;
    };

    // Step 2: Generate images in parallel
    const imageUrls = await Promise.all(
      parsed.posts.map(p =>
        p.image_prompt ? generateImage(p.image_prompt) : Promise.resolve(null)
      )
    );

    // Step 3: Delete old drafts for this month
    const from = `${month}-01`;
    const to = `${month}-${String(daysInMonth).padStart(2, "0")}`;
    await supabase
      .from("posts")
      .delete()
      .eq("client_id", clientId)
      .eq("status", "draft")
      .gte("scheduled_date", from)
      .lte("scheduled_date", to);

    // Step 4: Insert posts with images
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
