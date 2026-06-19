import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
  );

  try {
    const { postId, authorId, body } = await req.json() as {
      postId: string;
      authorId: string;
      body: string;
    };

    if (!postId || !authorId || !body?.trim()) {
      return NextResponse.json({ error: "חסרים פרטים" }, { status: 400 });
    }

    const { data: comment, error } = await supabase
      .from("comments")
      .insert({ post_id: postId, author_id: authorId, body: body.trim() })
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Create notification for admin directly (no trigger dependency)
    const { data: post } = await supabase
      .from("posts")
      .select("title")
      .eq("id", postId)
      .single();

    await supabase.from("notifications").insert({
      post_id: postId,
      post_title: post?.title ?? "פוסט ללא כותרת",
      comment_body: body.trim(),
    });

    return NextResponse.json({ comment });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
