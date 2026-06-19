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

    // Claude translates + improves the prompt into professional English for image generation
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      messages: [{
        role: "user",
        content: `Convert this image request into a detailed, professional English prompt for an AI image generator (Flux).
The prompt must be specific, visual, and photorealistic. Include lighting, style, composition details.
DO NOT include any text, logos, or watermarks in the description.
Return ONLY the English prompt, nothing else.

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
