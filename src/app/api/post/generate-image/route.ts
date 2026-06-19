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
        content: `You are an expert at writing prompts for DALL-E 3 for Israeli social media marketing.

Convert this Hebrew/English image request into a detailed English prompt.

FIRST identify what is being requested:
- If it mentions a CITY or PLACE (עיר, שכונה, לוד, תל אביב, etc.) → aerial or street view cityscape photography, urban landscape, golden hour, Israeli architecture
- If it mentions BUDGET/FINANCE/MONEY (תקציב, כלכלה, מספרים, נתונים) → flat design infographic, vector illustration, colorful icons, charts, white background
- If it mentions FOOD/BAKERY (אוכל, מאפייה, עוגה, לחם) → professional food photography, appetizing, warm lighting
- If it mentions ANIMALS/ZOO (חיות, ספארי, גן חיות) → wildlife photography, natural lighting
- If it mentions FAMILIES/PEOPLE (משפחות, ילדים, קהילה) → lifestyle photography, diverse adults, warm tones
- If it mentions EVENTS/HOLIDAYS (חג, אירוע, חנוכה, פסח) → festive photography, colorful, celebratory
- If it mentions ART/MUSEUM (אמנות, מוזיאון, תרבות) → editorial photography, artistic, sophisticated
- If it mentions REAL ESTATE/APARTMENTS (דירות, נדל"ן, בנייה) → modern residential architecture, aerial view

Rules:
- NO text or words in the image
- NO logos or watermarks
- NO children or minors
- Be very specific and visual about what is in the scene
- Return ONLY the English prompt, nothing else

Request: ${prompt}`,
      }],
    });

    const englishPrompt = msg.content[0].type === "text" ? msg.content[0].text.trim() : prompt;

    // DALL-E 3 generation
    const image = await openai.images.generate({
      model: "dall-e-3",
      prompt: englishPrompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
    });

    const url = image.data[0]?.url;
    if (!url) throw new Error("לא התקבלה תמונה");

    return NextResponse.json({ url, englishPrompt });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
