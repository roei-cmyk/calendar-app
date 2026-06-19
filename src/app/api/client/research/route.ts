import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const maxDuration = 60;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: NextRequest) {
  try {
    const { clientName, websiteUrl, instagramHandle, facebookUrl } = await req.json() as {
      clientName: string;
      websiteUrl?: string;
      instagramHandle?: string;
      facebookUrl?: string;
    };

    if (!clientName?.trim()) {
      return NextResponse.json({ error: "חסר שם לקוח" }, { status: 400 });
    }

    const sources = [
      websiteUrl?.trim() && `אתר: ${websiteUrl.trim()}`,
      instagramHandle?.trim() && `אינסטגרם: @${instagramHandle.replace(/^@/, "")}`,
      facebookUrl?.trim() && `פייסבוק: ${facebookUrl.trim()}`,
    ].filter(Boolean).join(", ");

    const searchQuery = `${clientName} ישראל ${sources ? `(${sources})` : ""} - מי הם, מה הם מוכרים, קהל יעד, טון שיווקי, מתחרים`;

    const response = await openai.responses.create({
      model: "gpt-4o-search-preview",
      tools: [{ type: "web_search_preview" }],
      input: `אתה יועץ שיווק דיגיטלי ישראלי. חפש מידע על העסק: "${clientName}"
${sources ? `מקורות לחפש: ${sources}` : ""}

לאחר החיפוש, החזר JSON בלבד עם הפרופיל השיווקי:
{
  "business_description": "תיאור העסק לפי המידע שמצאת (2-3 משפטים, עברית)",
  "target_audience": "קהל היעד המדויק (עברית)",
  "competitors": "2-3 מתחרים ישירים בישראל (עברית)",
  "tone": "הטון השיווקי שהעסק משתמש בו (עברית)",
  "design_notes": "סגנון ויזואלי, צבעים, אווירה (עברית)"
}

חפש עכשיו: ${searchQuery}`,
    });

    const raw = response.output_text ?? "";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return NextResponse.json({ error: "שגיאה בפענוח" }, { status: 500 });

    const result = JSON.parse(match[0]);
    return NextResponse.json({ ...result, scrapedSources: ["ChatGPT Web Search"] });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
