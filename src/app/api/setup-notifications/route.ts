import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// One-time setup route — creates notifications table + trigger
// DELETE THIS FILE after running once
export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
  );

  // Create table
  const { error: tableErr } = await supabase.from("notifications").select("id").limit(1);
  if (!tableErr) {
    return NextResponse.json({ message: "notifications table already exists" });
  }

  // Table doesn't exist — instruct user to run SQL manually
  const sql = `
-- Run this in Supabase SQL Editor:

CREATE TABLE IF NOT EXISTS notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
  post_title text,
  comment_body text,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins_all" ON notifications FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE OR REPLACE FUNCTION notify_on_client_comment()
RETURNS TRIGGER AS $$
DECLARE v_role text; v_title text;
BEGIN
  SELECT role INTO v_role FROM profiles WHERE id = NEW.author_id;
  IF v_role = 'client' THEN
    SELECT title INTO v_title FROM posts WHERE id = NEW.post_id;
    INSERT INTO notifications (post_id, post_title, comment_body)
    VALUES (NEW.post_id, v_title, NEW.body);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_client_comment_notify ON comments;
CREATE TRIGGER trg_client_comment_notify
  AFTER INSERT ON comments
  FOR EACH ROW EXECUTE FUNCTION notify_on_client_comment();
  `;

  return NextResponse.json({ sql, message: "Run the SQL above in Supabase SQL Editor" });
}
