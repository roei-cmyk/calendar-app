import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;

async function fetchUrl(url: string): Promise<string> {
  try {
    const jinaUrl = `https://r.jina.ai/${url}`;
    const res = await fetch(jinaUrl, {
      headers: { Accept: "text/plain" },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return "";
    const text = await res.text();
    return text.slice(0, 6000);
  } catch {
    return "";
  }
}

export async function POST(req: NextRequest) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

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

    // Fetch real content in parallel
    const fetchTasks: Promise<string>[] = [];
    const fetchLabels: string[] = [];

    if (websiteUrl?.trim()) {
      fetchTasks.push(fetchUrl(websiteUrl.trim()));
      fetchLabels.push("אתר הבית");
    }

    if (instagramHandle?.trim()) {
      const handle = instagramHandle.replace(/^@/, "").replace(/.*instagram\.com\//, "").replace(/\/$/, "");
      fetchTasks.push(fetchUrl(`https://www.instagram.com/${handle}/`));
      fetchLabels.push("אינסטגרם");
    }

    if (facebookUrl?.trim()) {
      fetchTasks.push(fetchUrl(facebookUrl.trim()));
      fetchLabels.push("פייסבוק");
    }

    const results = await Promise.all(fetchTasks);
    const scrapedSections = results
      .map((text, i) => text ? `--- ${fetchLabels[i]} ---\n${text}` : null)
      .filter(Boolean)
      .join("\n\n");

    const hasRealData = scrapedSections.length > 100;

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1200,
      messages: [
        {
          role: "user",
          content: `אתה יועץ שיווק דיגיטלי מומחה. נתח את הנתונים הבאים ומלא פרופיל שיווקי מדויק.

שם העסק: ${clientName}
${hasRealData ? `\nתוכן שנאסף מהאינטרנט:\n${scrapedSections}` : "\n(לא סופק מידע מהאינטרנט — בצע ניחוש מושכל לפי שם העסק)"}

ענה JSON בלבד:
{
  "business_description": "תיאור קצר של העסק לפי המידע האמיתי (2-3 משפטים)",
  "target_audience": "קהל היעד המדויק לפי הנראה באתר/סושיאל",
  "competitors": "2-3 מתחרים ישירים בשוק הישראלי",
  "tone": "הטון שהלקוח משתמש בו בפועל ברשתות (לפי הדוגמאות)",
  "design_notes": "סגנון ויזואלי, צבעים, אווירה שנראים באתר/סושיאל"
}

${hasRealData ? "חשוב: בסס את התשובות על המידע האמיתי שנאסף, לא על הנחות." : ""}
JSON בלבד, ללא הסברים, בעברית.`,
        },
      ],
    });

    const raw = message.content[0].type === "text" ? message.content[0].text : "";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return NextResponse.json({ error: "שגיאה בפענוח" }, { status: 500 });

    const result = JSON.parse(match[0]);
    return NextResponse.json({ ...result, scrapedSources: fetchLabels.filter((_, i) => results[i].length > 100) });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
