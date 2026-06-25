-- Add start_date to tasks for Gantt bars
-- Update status to include in_progress
-- Run in Supabase SQL Editor

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS start_date date;

ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check
  CHECK (status IN ('pending', 'in_progress', 'done'));

NOTIFY pgrst, 'reload schema';
