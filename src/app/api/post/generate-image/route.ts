import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json() as { prompt: string };
    if (!prompt?.trim()) {
      return NextResponse.json({ error: "חסר תיאור לתמונה" }, { status: 400 });
    }

    // gpt-image-1 understands Hebrew natively — no translation needed
    const englishPrompt = prompt;

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
