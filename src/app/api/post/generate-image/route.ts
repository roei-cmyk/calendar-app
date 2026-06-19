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
        content: `You are an expert at writing prompts for DALL-E 3.

Convert this image request into a detailed English prompt. Choose the RIGHT visual style:
- Budget/finance/numbers/charts → "flat design infographic, clean vector illustration, colorful icons, white background, professional business graphic"
- Food/bakery/pastry → "professional food photography, appetizing, warm lighting, styled"
- Animals/nature/zoo → "wildlife photography, natural lighting, vivid colors"
- Families/people/lifestyle → "lifestyle photography, natural light, warm tones, adults only"
- Real estate/city/buildings → "architectural photography, golden hour, wide angle"
- Events/holidays/celebrations → "vibrant festive photography, dynamic composition"
- Art/culture/museums → "editorial photography, dramatic lighting, sophisticated"

Rules:
- NO text or words in the image
- NO logos or watermarks
- NO children or minors
- Be specific and visual
- Return ONLY the English prompt

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
