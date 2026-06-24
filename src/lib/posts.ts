import { createClient } from "@/lib/supabase/client";
import type { Comment, Post } from "@/lib/types";

const supabase = createClient();

export async function fetchPosts(params: {
  from: string; // inclusive YYYY-MM-DD
  to: string; // inclusive YYYY-MM-DD
  clientId?: string | null; // optional filter (admins viewing one client)
}): Promise<Post[]> {
  let query = supabase
    .from("posts")
    .select("*, comments(count)")
    .gte("scheduled_date", params.from)
    .lte("scheduled_date", params.to)
    .order("scheduled_date", { ascending: true })
    .order("scheduled_time", { ascending: true, nullsFirst: true });

  if (params.clientId) {
    query = query.eq("client_id", params.clientId);
  }

  const { data, error } = await query;
  if (error) throw error;

  // Flatten the embedded { comments: [{ count }] } aggregate into comment_count.
  return (data ?? []).map((row) => {
    const { comments, ...post } = row as Post & {
      comments?: { count: number }[];
    };
    return { ...post, comment_count: comments?.[0]?.count ?? 0 } as Post;
  });
}

export type PostInput = Pick<
  Post,
  "client_id" | "title" | "body" | "platform" | "media_url" | "status" | "scheduled_date" | "scheduled_time"
>;

export async function createPost(input: PostInput, createdBy: string): Promise<Post> {
  const { data, error } = await supabase
    .from("posts")
    .insert({ ...input, created_by: createdBy })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updatePost(id: string, input: Partial<PostInput>): Promise<Post> {
  const { data, error } = await supabase
    .from("posts")
    .update(input)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deletePost(id: string): Promise<void> {
  const { error } = await supabase.from("posts").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchComments(postId: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function fetchPostsForListView(clientId: string): Promise<Post[]> {
  const { data, error } = await supabase
    .from("posts")
    .select("*, comments(count)")
    .eq("client_id", clientId)
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("scheduled_date", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => {
    const { comments, ...post } = row as Post & { comments?: { count: number }[] };
    return { ...post, comment_count: comments?.[0]?.count ?? 0 } as Post;
  });
}

export async function updateSortOrders(updates: { id: string; sort_order: number }[]): Promise<void> {
  await Promise.all(
    updates.map(({ id, sort_order }) =>
      supabase.from("posts").update({ sort_order }).eq("id", id)
    )
  );
}

export async function addComment(
  postId: string,
  authorId: string,
  body: string,
): Promise<Comment> {
  const { data, error } = await supabase
    .from("comments")
    .insert({ post_id: postId, author_id: authorId, body })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}
