import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const PROMPT = (clientName: string, sources: string, searchQuery: string) => `אתה יועץ שיווק דיגיטלי ישראלי מוביל. חקור את העסק "${clientName}" וספק ניתוח מעמיק לצורך יצירת תוכן שיווקי.
${sources ? `מקורות: ${sources}` : ""}

החזר JSON בלבד עם כל השדות הבאים (בעברית):
{
  "business_description": "תיאור העסק — מה הם מוכרים, מה ייחודם, כמה ותיקים הם (2-3 משפטים)",
  "target_audience": "קהל יעד מדויק — גיל, מגדר, מיקום, תחומי עניין, כוח קנייה",
  "competitors": "2-3 מתחרים ישירים בישראל עם הסבר קצר מה הבדל",
  "tone": "הטון השיווקי — פורמלי/לא פורמלי, חמים/מקצועי, שפת הפנייה (אתה/את/תמנה), קצר/ארוך",
  "design_notes": "סגנון ויזואלי — צבעי המותג, אווירה, סגנון צילום, אלמנטים חזותיים אופייניים",
  "brand_hashtags": "5-10 האשטאגים רלוונטיים לעסק (עברית ואנגלית, מופרדים ברווח)",
  "do_not_post": "נושאים רגישים, מתחרים שאין להזכיר, ערכים שאין לסתור — מה לא לפרסם",
  "seasonal_events": "אירועים עונתיים, ימי מכירות, מבצעים קבועים, ימי שנה/יובל — מה חוזר כל שנה",
  "writing_examples": "2 דוגמאות לפוסטים מוצלחים בסגנון הלקוח (המצאה בהתאם לטון — לא חובה אמיתיים)"
}

חפש: ${searchQuery}`;

export async function POST(req: NextRequest) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
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

    const searchQuery = `${clientName} ישראל ${sources ? `(${sources})` : ""} — מי הם, מה הם מוכרים, קהל יעד, טון, מתחרים, אירועים עונתיים, האשטאגים`;
    const promptText = PROMPT(clientName, sources, searchQuery);

    let raw = "";

    try {
      const response = await openai.responses.create({
        model: "gpt-4o-search-preview",
        tools: [{ type: "web_search_preview" as const }],
        input: promptText,
      });
      raw = response.output_text ?? "";
    } catch {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: promptText }],
        max_tokens: 1200,
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
