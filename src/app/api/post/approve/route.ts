import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
  );

  try {
    const { postId, clientName } = await req.json() as {
      postId: string;
      clientName: string;
    };

    if (!postId) return NextResponse.json({ error: "חסר postId" }, { status: 400 });

    // Fetch post title
    const { data: post, error: fetchErr } = await supabase
      .from("posts")
      .select("title")
      .eq("id", postId)
      .single();

    if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });

    // Update status
    const { error: updateErr } = await supabase
      .from("posts")
      .update({ status: "approved" })
      .eq("id", postId);

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

    // Create notification for admin
    await supabase.from("notifications").insert({
      post_id:      postId,
      post_title:   post?.title ?? "פוסט ללא כותרת",
      comment_body: `✅ ${clientName || "הלקוח"} אישר את הפוסט`,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
