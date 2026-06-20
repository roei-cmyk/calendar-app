import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const TODAY = new Date().toLocaleDateString("he-IL", {
  weekday: "long", year: "numeric", month: "long", day: "numeric",
});

const TREND_DEFINITION = `
הגדרת "טרנד" לצורך הסריקה:
- האשטאגים / סאונדים / צ'אלנג'ים שראו עלייה חדה (100%+) ב-24–72 השעות האחרונות
- פורמטים שמקבלים engagement חריג מעל הממוצע של הפלטפורמה
- נושאים שמדוברים עכשיו ויצרו וולום גבוה מהרגיל — לא "מה חם בכלל" אלא מה מתפוצץ ברגע זה
- בישראל: תוסיף גם טרנדים מקומיים (ישראלי-ספציפי) שאין בעולם
- ב-X/Twitter: בעיקר חדשנות AI, מוצרים חדשים, ויראל tech
`;

const PROMPT = `היום ${TODAY}. אתה אנליסט סושיאל מדיה למשרד פרסום ישראלי (KNBL360).

${TREND_DEFINITION}

סרוק עכשיו:
- אינסטגרם (גלובלי + ישראל) — Reels, Stories, האשטאגים
- טיקטוק (גלובלי + ישראל) — סאונדים, צ'אלנג'ים, טרנדים ויראליים
- פייסבוק ישראל — קהילות, שיתופים, נושאים חמים
- X/Twitter (גלובלי) — AI חדשנות, מוצרים חדשים, tech viral

החזר JSON בלבד (ללא שום טקסט לפני או אחרי, ללא markdown):
{
  "date": "${TODAY}",
  "instagram": [
    {"trend": "שם הטרנד הספציפי", "tip": "איך להשתמש בזה עכשיו (1-2 משפטים)"}
  ],
  "tiktok": [
    {"trend": "שם הטרנד", "tip": "איך להשתמש בזה"}
  ],
  "facebook": [
    {"trend": "שם הטרנד", "tip": "איך להשתמש בזה"}
  ],
  "twitter": [
    {"trend": "שם הטרנד / מוצר / נושא", "tip": "למה זה רלוונטי ואיך לרכב עליו"}
  ],
  "ai_ideas": [
    {"title": "רעיון AI Production", "desc": "תיאור קצר — מה מייצרים ובאיזה כלי"}
  ],
  "hot_format": "פורמט התוכן האחד שהכי מתפוצץ עכשיו"
}

3 פריטים לכל פלטפורמה. 2 רעיונות AI. כל טרנד חייב להיות ספציפי — לא "וידאו קצר" אלא שם הטרנד/סאונד/האשטאג הממשי.`;

export async function GET() {
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 2000,
        tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 6 }] as Parameters<typeof anthropic.messages.create>[0]["tools"],
        messages: [{ role: "user", content: PROMPT }],
      });

      let text = "";
      for (const block of response.content) {
        if (block.type === "text") text = block.text;
      }

      text = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
      const data = JSON.parse(text);
      return NextResponse.json(data);
    } catch {
      // Fallback: Haiku without web search (still returns useful knowledge-based trends)
      const r2 = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1500,
        messages: [{
          role: "user",
          content: `היום ${TODAY}. אתה מומחה סושיאל מדיה ישראלי. ${TREND_DEFINITION}
בהתבסס על הידע שלך, תן טרנדים ספציפיים וריאליסטיים לסוף יוני 2026.
החזר JSON בלבד:
{"date":"${TODAY}","instagram":[{"trend":"...","tip":"..."},{"trend":"...","tip":"..."},{"trend":"...","tip":"..."}],"tiktok":[{"trend":"...","tip":"..."},{"trend":"...","tip":"..."},{"trend":"...","tip":"..."}],"facebook":[{"trend":"...","tip":"..."},{"trend":"...","tip":"..."},{"trend":"...","tip":"..."}],"twitter":[{"trend":"...","tip":"..."},{"trend":"...","tip":"..."},{"trend":"...","tip":"..."}],"ai_ideas":[{"title":"...","desc":"..."},{"title":"...","desc":"..."}],"hot_format":"..."}`,
        }],
      });

      const raw = r2.content[0].type === "text" ? r2.content[0].text : "";
      const clean = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
      return NextResponse.json(JSON.parse(clean));
    }
  } catch (err) {
    console.error("Trends API error:", err);
    return NextResponse.json(
      { error: "שגיאה בשרת הטרנדים", details: String(err) },
      { status: 500 }
    );
  }
}
