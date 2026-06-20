-- Migration: add advanced client fields for richer Gantt generation
-- Run in Supabase SQL Editor

alter table public.clients
  add column if not exists post_format_mix   jsonb,
  add column if not exists brand_hashtags    text,
  add column if not exists do_not_post       text,
  add column if not exists seasonal_events   text,
  add column if not exists writing_examples  text;
