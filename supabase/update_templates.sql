-- Update templates table to add course_name and file_type columns
-- Run this if you already have the database set up

-- Add new columns to templates table
ALTER TABLE public.templates 
ADD COLUMN IF NOT EXISTS course_name TEXT,
ADD COLUMN IF NOT EXISTS file_type TEXT CHECK (file_type IN ('pdf', 'image'));

-- Add index for course_name lookups
CREATE INDEX IF NOT EXISTS idx_templates_course_name 
ON public.templates(company_id, course_name);

-- Update existing templates to set default file_type
UPDATE public.templates 
SET file_type = 'pdf' 
WHERE file_type IS NULL;

-- Complete!

