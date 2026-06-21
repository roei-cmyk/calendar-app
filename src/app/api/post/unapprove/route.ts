import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
  );

  try {
    const { postId, clientName, comment } = await req.json() as {
      postId: string;
      clientName: string;
      comment: string;
    };

    if (!postId) return NextResponse.json({ error: "חסר postId" }, { status: 400 });

    const { data: post } = await supabase
      .from("posts")
      .select("title")
      .eq("id", postId)
      .single();

    // Set status back to pending
    await supabase.from("posts").update({ status: "pending" }).eq("id", postId);

    // Add comment
    await supabase.from("comments").insert({
      post_id: postId,
      body: `❌ ${clientName} לא אישר: ${comment}`,
    });

    // Notify admin
    await supabase.from("notifications").insert({
      post_id: postId,
      post_title: post?.title ?? "פוסט ללא כותרת",
      comment_body: `❌ ${clientName} לא אישר: ${comment}`,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
