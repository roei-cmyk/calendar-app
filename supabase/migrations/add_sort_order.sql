-- Add manual sort order for admin list view
-- Run this in Supabase SQL Editor

ALTER TABLE posts ADD COLUMN IF NOT EXISTS sort_order integer;

CREATE INDEX IF NOT EXISTS idx_posts_client_sort
  ON posts (client_id, sort_order ASC NULLS LAST);
