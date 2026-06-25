-- Task manager table
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS tasks (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text        NOT NULL,
  client_id   uuid        REFERENCES clients(id) ON DELETE SET NULL,
  due_date    date,
  recurrence  text        NOT NULL DEFAULT 'none'
                CHECK (recurrence IN ('none', 'daily', 'weekly', 'monthly')),
  status      text        NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'done')),
  created_by  uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access on tasks"
  ON tasks FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks (due_date ASC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_tasks_status   ON tasks (status);
