import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json() as { prompt: string };
    if (!prompt?.trim()) {
      return NextResponse.json({ error: "חסר תיאור לתמונה" }, { status: 400 });
    }

    // Claude translates + picks the right visual style
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      messages: [{
        role: "user",
        content: `You are an expert at writing prompts for AI image generators for Israeli social media marketing.

Convert this Hebrew/English image request into a detailed English prompt.

FIRST identify what is being requested:
- CITY or PLACE (עיר, שכונה, לוד, תל אביב, etc.) → aerial or street view cityscape photography, urban landscape, golden hour, Israeli architecture
- BUDGET/FINANCE/MONEY (תקציב, כלכלה, מספרים, נתונים) → flat design infographic, vector illustration, colorful icons, charts, white background
- FOOD/BAKERY (אוכל, מאפייה, עוגה, לחם) → professional food photography, appetizing, warm lighting
- ANIMALS/ZOO (חיות, ספארי, גן חיות) → wildlife photography, natural lighting
- FAMILIES/PEOPLE (משפחות, ילדים, קהילה) → lifestyle photography, diverse adults, warm tones
- EVENTS/HOLIDAYS (חג, אירוע, חנוכה, פסח) → festive photography, colorful, celebratory
- ART/MUSEUM (אמנות, מוזיאון, תרבות) → editorial photography, artistic, sophisticated
- REAL ESTATE/APARTMENTS (דירות, נדל"ן, בנייה) → modern residential architecture, aerial view

Rules: NO text, NO logos, NO watermarks, NO children or minors. Be very specific and visual.
Return ONLY the English prompt, nothing else.

Request: ${prompt}`,
      }],
    });

    const englishPrompt = msg.content[0].type === "text" ? msg.content[0].text.trim() : prompt;

    // gpt-image-1 — same model as ChatGPT image generation
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt: englishPrompt,
        n: 1,
        size: "1024x1024",
        quality: "standard",
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error((err as { error?: { message?: string } }).error?.message ?? "שגיאה בייצור תמונה");
    }

    const data = await response.json() as { data: Array<{ url?: string; b64_json?: string }> };
    const item = data.data?.[0];
    if (!item) throw new Error("לא התקבלה תמונה");

    const url = item.url ?? (item.b64_json ? `data:image/png;base64,${item.b64_json}` : null);
    if (!url) throw new Error("לא התקבל URL לתמונה");

    return NextResponse.json({ url, englishPrompt });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
