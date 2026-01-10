-- Fix templates table schema
-- Run this in Supabase SQL Editor

-- Add missing columns to templates table
ALTER TABLE public.templates 
ADD COLUMN IF NOT EXISTS fields JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.templates 
ADD COLUMN IF NOT EXISTS width INTEGER;

ALTER TABLE public.templates 
ADD COLUMN IF NOT EXISTS height INTEGER;

-- Verify the columns were added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'templates'
ORDER BY ordinal_position;
