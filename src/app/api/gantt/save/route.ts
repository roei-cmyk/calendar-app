import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 60;

function buildImageUrl(prompt: string): string {
  const encoded = encodeURIComponent(prompt);
  const seed = Math.floor(Math.random() * 1000000);
  return `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=1024&seed=${seed}&nologo=true&enhance=true&model=flux-pro`;
}

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
  );

  const { clientId, month, posts } = await req.json() as {
    clientId: string;
    month: string;
    posts: Array<{
      title: string;
      body?: string;
      platform?: string;
      post_type?: string;
      scheduled_date: string;
      scheduled_time?: string;
      image_prompt?: string;
    }>;
  };

  if (!clientId || !month || !Array.isArray(posts) || !posts.length) {
    return NextResponse.json({ error: "חסרים פרטים" }, { status: 400 });
  }

  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "admin")
    .limit(1)
    .single();

  const [year, mon] = month.split("-").map(Number);
  const daysInMonth = new Date(year, mon, 0).getDate();
  const from = `${month}-01`;
  const to = `${month}-${String(daysInMonth).padStart(2, "0")}`;

  await supabase
    .from("posts")
    .delete()
    .eq("client_id", clientId)
    .eq("status", "draft")
    .gte("scheduled_date", from)
    .lte("scheduled_date", to);

  const rows = posts.map(p => ({
    client_id: clientId,
    title: p.title,
    body: p.body ?? null,
    platform: p.platform ?? null,
    scheduled_date: p.scheduled_date,
    scheduled_time: p.scheduled_time ?? null,
    media_url: p.image_prompt ? buildImageUrl(p.image_prompt) : null,
    status: "draft" as const,
    created_by: adminProfile?.id ?? null,
  }));

  const { data: inserted, error } = await supabase
    .from("posts")
    .insert(rows)
    .select("id");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, inserted: inserted?.length ?? 0 });
}
