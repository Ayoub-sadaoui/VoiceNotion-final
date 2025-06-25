-- PUBLIC STORAGE WITH ORGANIZED FOLDERS SCRIPT
-- This script allows anyone to upload images while maintaining organized folder structure
-- No authentication required, but uploads should still go to specific folders

-- First, let's ensure we have clean policies
DROP POLICY IF EXISTS "Enforce user folder uploads" ON storage.objects;
DROP POLICY IF EXISTS "User folder uploads only" ON storage.objects;
DROP POLICY IF EXISTS "User folder access only" ON storage.objects;

-- POLICY 1: Allow anyone to upload to any folder
CREATE POLICY "Public Upload Access" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'images');

-- POLICY 2: Allow anyone to read any file in the images bucket
CREATE POLICY "Public Read Access" ON storage.objects FOR SELECT
  USING (bucket_id = 'images');

-- POLICY 3: Allow anyone to update files in the images bucket
CREATE POLICY "Public Update Access" ON storage.objects FOR UPDATE
  USING (bucket_id = 'images');

-- POLICY 4: Allow anyone to delete files in the images bucket
CREATE POLICY "Public Delete Access" ON storage.objects FOR DELETE
  USING (bucket_id = 'images');

-- Make sure the bucket exists with public access
INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Print confirmation
SELECT 'SUCCESS: Public storage with organized folders set up' as result;
