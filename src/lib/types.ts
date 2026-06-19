export type UserRole = "admin" | "client";

export type PostStatus =
  | "draft"
  | "pending"
  | "approved"
  | "scheduled"
  | "published";

export interface ContentPillar {
  name: string;       // e.g. "טיפים מקצועיים"
  percentage: number; // 0-100
}

export type SocialChannel = "instagram" | "facebook" | "linkedin" | "tiktok" | "twitter";

export interface ChannelConfig {
  platform: SocialChannel;
  posts_per_week: number;
}

export interface Client {
  id: string;
  name: string;
  slug: string;
  color: string;
  created_at: string;
  business_description: string | null;
  target_audience: string | null;
  competitors: string | null;
  tone: string | null;
  design_notes: string | null;
  content_pillars: ContentPillar[] | null;
  social_channels: ChannelConfig[] | null;
  website_url: string | null;
  instagram_handle: string | null;
  facebook_url: string | null;
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
