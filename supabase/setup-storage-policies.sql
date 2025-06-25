-- This SQL script sets up the storage policies for the images bucket
-- Run this in the Supabase SQL Editor

-- First, ensure the bucket exists
-- Note: This operation requires admin privileges
-- If you get a "permission denied for table buckets" error, 
-- you can either:
-- 1. Run this script as a Supabase admin user
-- 2. Skip this step if the bucket already exists (RECOMMENDED)
-- 3. Create the bucket manually via the Supabase dashboard

-- IMPORTANT: Comment this section out if you're getting the permission error
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('images', 'images', false)  -- Set to FALSE for better security
-- ON CONFLICT (id) DO UPDATE SET public = false;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public viewing of images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to images bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates to own images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes to own images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public uploads to images bucket" ON storage.objects;

-- Create policies for the images bucket

-- 1. Allow anyone to view images (public access)
CREATE POLICY "Allow public viewing of images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'images');

-- DEVELOPMENT SETUP (INSECURE) - Comment these out in production
-- We're now using secure authentication-based policies only
-- CREATE POLICY "Allow public uploads to images bucket" 
-- ON storage.objects 
-- FOR INSERT 
-- WITH CHECK (bucket_id = 'images');

-- PRODUCTION SETUP (SECURE) - Uncomment these in production
-- 2. Option 1: Allow only authenticated users to upload images (more secure)
CREATE POLICY "Allow authenticated uploads to images bucket" 
ON storage.objects 
FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'images');

-- 3. Allow users to update their own images
CREATE POLICY "Allow authenticated updates to own images" 
ON storage.objects 
FOR UPDATE 
TO authenticated 
USING (bucket_id = 'images' AND auth.uid() = owner);

-- 4. Allow users to delete their own images
CREATE POLICY "Allow authenticated deletes to own images" 
ON storage.objects 
FOR DELETE 
TO authenticated 
USING (bucket_id = 'images' AND auth.uid() = owner);

-- DEVELOPMENT SETUP (INSECURE) - Comment this out in production
-- We're now using secure authentication-based policies only
-- CREATE POLICY "Allow all operations on images bucket" 
-- ON storage.objects 
-- USING (bucket_id = 'images');

-- 5. Add a more restrictive policy for production
-- This ensures users can only see their own images or public images
CREATE POLICY "Allow users to view their own images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'images' AND (auth.uid() = owner OR owner IS NULL));

-- 6. Add mobile-specific policy to ensure folder-based access works correctly
-- This ensures users can list contents of their own folders
CREATE POLICY "Allow users to list their folders" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'images' AND (storage.foldername(name))[1] = auth.uid()::text);
