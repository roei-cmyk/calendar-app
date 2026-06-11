export type UserRole = "admin" | "client";

export type PostStatus =
  | "draft"
  | "pending"
  | "approved"
  | "scheduled"
  | "published";

export interface Client {
  id: string;
  name: string;
  slug: string;
  color: string;
  created_at: string;
}

export interface Profile {
  id: string;
  full_name: string | null;
  role: UserRole;
  client_id: string | null;
  created_at: string;
}

export interface Post {
  id: string;
  client_id: string;
  title: string;
  body: string | null;
  platform: string | null;
  media_url: string | null;
  status: PostStatus;
  scheduled_date: string; // YYYY-MM-DD
  scheduled_time: string | null; // HH:mm:ss
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // populated by fetchPosts via an embedded aggregate; not a DB column
  comment_count?: number;
}

export interface Comment {
  id: string;
  post_id: string;
  author_id: string | null;
  body: string;
  created_at: string;
}

export type CalendarView = "day" | "week" | "month";

export const POST_STATUS_LABELS: Record<PostStatus, string> = {
  draft: "טיוטה",
  pending: "ממתין לאישור",
  approved: "מאושר",
  scheduled: "מתוזמן",
  published: "פורסם",
};
