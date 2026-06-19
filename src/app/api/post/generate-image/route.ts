import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json() as { prompt: string };
    if (!prompt?.trim()) {
      return NextResponse.json({ error: "חסר תיאור לתמונה" }, { status: 400 });
    }

    const encoded = encodeURIComponent(prompt);
    const seed = Math.floor(Math.random() * 1000000);
    const url = `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=1024&seed=${seed}&nologo=true&enhance=true&model=flux`;

    // Fetch the actual image to verify it works
    const res = await fetch(url, { signal: AbortSignal.timeout(45000) });
    if (!res.ok) {
      return NextResponse.json({ error: "שגיאה ביצירת התמונה" }, { status: 500 });
    }

    return NextResponse.json({ url });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
