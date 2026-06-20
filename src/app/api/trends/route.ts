import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;

const TODAY = new Date().toLocaleDateString("he-IL", {
  weekday: "long", year: "numeric", month: "long", day: "numeric",
});

export async function GET() {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      // @ts-expect-error — web_search_20250305 is a valid tool type in the Anthropic API
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 5 }],
      messages: [{
        role: "user",
        content: `היום ${TODAY}. אתה עוזר למשרד פרסום ישראלי (KNBL360) לזהות טרנדים חמים בסושיאל מדיה.

חפש ומצא את הטרנדים החמים ביותר עכשיו:
- אינסטגרם (גלובלי + ישראל)
- טיקטוק (גלובלי + ישראל)
- פייסבוק (ישראל)
- פורמטים חמים של AI content

החזר תשובה בעברית בפורמט JSON בלבד (אין טקסט לפני או אחרי):
{
  "date": "${TODAY}",
  "instagram": [
    {"trend": "שם הטרנד", "tip": "איך להשתמש בזה"}
  ],
  "tiktok": [
    {"trend": "שם הטרנד", "tip": "איך להשתמש בזה"}
  ],
  "facebook": [
    {"trend": "שם הטרנד", "tip": "איך להשתמש בזה"}
  ],
  "ai_ideas": [
    {"title": "רעיון AI", "desc": "תיאור קצר"}
  ],
  "hot_format": "פורמט התוכן האחד שהכי חם עכשיו"
}

הגבל ל-3 פריטים לכל פלטפורמה, 2 רעיונות AI.`,
      }],
    });

    // Extract the final text block (after any tool calls)
    let text = "";
    for (const block of response.content) {
      if (block.type === "text") text = block.text;
    }

    // Strip markdown code fences if present
    text = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();

    const data = JSON.parse(text);
    return NextResponse.json(data);
  } catch (e) {
    // Fallback: ask without web search
    const anthropic2 = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    const r2 = await anthropic2.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1500,
      messages: [{
        role: "user",
        content: `היום ${TODAY}. אתה מומחה סושיאל מדיה ישראלי.
תן המלצות טרנדים מבוססות ידע שלך על מה חם ב-2025-2026.
החזר JSON בלבד:
{"date":"${TODAY}","instagram":[{"trend":"...","tip":"..."},{"trend":"...","tip":"..."},{"trend":"...","tip":"..."}],"tiktok":[{"trend":"...","tip":"..."},{"trend":"...","tip":"..."},{"trend":"...","tip":"..."}],"facebook":[{"trend":"...","tip":"..."},{"trend":"...","tip":"..."},{"trend":"...","tip":"..."}],"ai_ideas":[{"title":"...","desc":"..."},{"title":"...","desc":"..."}],"hot_format":"..."}`,
      }],
    });
    const raw = r2.content[0].type === "text" ? r2.content[0].text : "{}";
    const clean = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    return NextResponse.json(JSON.parse(clean));
  }
}
