import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

  try {
    const { title, body, platform, instructions } = await req.json() as {
      title: string;
      body?: string;
      platform?: string;
      instructions: string;
    };

    if (!instructions?.trim()) {
      return NextResponse.json({ error: "חסרות הוראות" }, { status: 400 });
    }

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `אתה עוזר לכתיבת תוכן לרשתות חברתיות בעברית.
פוסט קיים:
כותרת: ${title}
${body ? `תוכן: ${body}` : ""}
${platform ? `פלטפורמה: ${platform}` : ""}

הוראות לעריכה: ${instructions}

החזר JSON בלבד, ללא הסברים:
{"title":"...","body":"..."}

כללים: עברית בלבד, שמור על אורך מתאים לפלטפורמה, JSON בלבד.`,
        },
      ],
    });

    const raw = message.content[0].type === "text" ? message.content[0].text : "";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return NextResponse.json({ error: "שגיאה בפענוח" }, { status: 500 });

    const result = JSON.parse(match[0]) as { title: string; body: string };
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
