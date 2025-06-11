-- Add icon column to notes table
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS icon text DEFAULT '📄';
