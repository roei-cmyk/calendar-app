import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 30;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json() as { prompt: string };
    if (!prompt?.trim()) {
      return NextResponse.json({ error: "חסר תיאור לתמונה" }, { status: 400 });
    }

    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      messages: [{
        role: "user",
        content: `You are an expert at writing prompts for AI image generators (Flux model).

Convert this image request into a detailed English prompt. IMPORTANT: choose the RIGHT visual style based on the content:

- Budget/finance/numbers/charts/data → "flat design infographic, clean vector illustration, colorful icons, white background, professional business graphic"
- Food/bakery/products → "professional food photography, appetizing, warm lighting, styled composition"
- Animals/nature → "wildlife photography, natural lighting, detailed, vivid colors"
- People/families/lifestyle → "lifestyle photography, natural light, candid, warm tones"
- Buildings/cities/real estate → "architectural photography, golden hour, wide angle, sharp details"
- Events/celebrations → "vibrant event photography, festive atmosphere, dynamic composition"
- Art/culture/museums → "artistic editorial photography, dramatic lighting, sophisticated"

Rules:
- NO text, NO logos, NO watermarks in the image
- NO children or minors in the image
- Be specific and visual
- Return ONLY the English prompt, nothing else

Request: ${prompt}`,
      }],
    });

    const englishPrompt = msg.content[0].type === "text" ? msg.content[0].text.trim() : prompt;

    const encoded = encodeURIComponent(englishPrompt);
    const seed = Math.floor(Math.random() * 999999);
    const url = `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=1024&seed=${seed}&nologo=true&enhance=true&model=flux-pro`;

    return NextResponse.json({ url, englishPrompt });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
