import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const maxDuration = 60;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

const PROMPT = (clientName: string, sources: string, searchQuery: string) => `אתה יועץ שיווק דיגיטלי ישראלי. חפש מידע על העסק: "${clientName}"
${sources ? `מקורות לחפש: ${sources}` : ""}

לאחר החיפוש, החזר JSON בלבד:
{
  "business_description": "תיאור העסק (2-3 משפטים, עברית)",
  "target_audience": "קהל היעד המדויק (עברית)",
  "competitors": "2-3 מתחרים ישירים בישראל (עברית)",
  "tone": "הטון השיווקי (עברית)",
  "design_notes": "סגנון ויזואלי, צבעים, אווירה (עברית)"
}

חפש: ${searchQuery}`;

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
    const promptText = PROMPT(clientName, sources, searchQuery);

    let raw = "";

    // Try web search first
    try {
      const response = await openai.responses.create({
        model: "gpt-4o-search-preview",
        tools: [{ type: "web_search_preview" as const }],
        input: promptText,
      });
      raw = response.output_text ?? "";
    } catch {
      // Fallback to regular GPT-4o without web search
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: promptText }],
        max_tokens: 800,
      });
      raw = response.choices[0]?.message?.content ?? "";
    }

    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return NextResponse.json({ error: "שגיאה בפענוח התגובה" }, { status: 500 });

    let result: Record<string, string>;
    try {
      result = JSON.parse(match[0]);
    } catch {
      return NextResponse.json({ error: "שגיאה בפענוח JSON" }, { status: 500 });
    }

    return NextResponse.json({ ...result, scrapedSources: ["ChatGPT Web Search"] });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
