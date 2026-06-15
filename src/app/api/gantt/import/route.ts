import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
  );
  try {
    const apiKey = req.headers.get("x-planner-key");
    if (!apiKey) {
      return NextResponse.json({ error: "Missing API key" }, { status: 401 });
    }

    // Find client by API key
    const { data: client, error: clientErr } = await supabase
      .from("clients")
      .select("id, name")
      .eq("api_key", apiKey)
      .single();

    if (clientErr || !client) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    const body = await req.json();
    const { posts, replace_month } = body as {
      posts: Array<{
        title: string;
        body?: string;
        platform?: string;
        scheduled_date: string; // YYYY-MM-DD
        scheduled_time?: string; // HH:MM
        status?: string;
      }>;
      replace_month?: string; // YYYY-MM — if set, deletes existing drafts for that month first
    };

    if (!Array.isArray(posts) || posts.length === 0) {
      return NextResponse.json({ error: "No posts provided" }, { status: 400 });
    }

    // Optionally clear existing draft posts for the month
    if (replace_month) {
      const from = `${replace_month}-01`;
      const to = `${replace_month}-31`;
      await supabase
        .from("posts")
        .delete()
        .eq("client_id", client.id)
        .eq("status", "draft")
        .gte("scheduled_date", from)
        .lte("scheduled_date", to);
    }

    // Find a valid admin profile to assign as creator
    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "admin")
      .limit(1)
      .single();

    const createdBy = adminProfile?.id ?? null;

    // Insert posts
    const rows = posts.map((p) => ({
      client_id: client.id,
      title: p.title,
      body: p.body ?? null,
      platform: p.platform ?? null,
      scheduled_date: p.scheduled_date,
      scheduled_time: p.scheduled_time ?? null,
      status: (p.status as string) ?? "draft",
      created_by: createdBy,
    }));

    const { data: inserted, error: insertErr } = await supabase
      .from("posts")
      .insert(rows)
      .select("id");

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      client: client.name,
      inserted: inserted?.length ?? 0,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
