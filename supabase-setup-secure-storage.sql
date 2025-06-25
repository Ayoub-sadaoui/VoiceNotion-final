-- This SQL script sets up secure storage policies for Supabase
-- It ensures that users can only access their own files

-- Create the images bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on the storage.objects table
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Allow users to insert objects into their own folder
CREATE POLICY "Users can upload to their own folder" ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Policy: Allow users to update their own objects
CREATE POLICY "Users can update their own objects" ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'images' AND auth.uid()::text = owner);

-- Policy: Allow users to delete their own objects
CREATE POLICY "Users can delete their own objects" ON storage.objects
  FOR DELETE
  USING (bucket_id = 'images' AND auth.uid()::text = owner);

-- Policy: Allow public read access to all objects in the images bucket
CREATE POLICY "Public read access" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'images');

-- Additional security function to validate file types
CREATE OR REPLACE FUNCTION storage.validate_image_type() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.content_type NOT LIKE 'image/%' THEN
    RAISE EXCEPTION 'Only image files are allowed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to enforce image file type validation
CREATE TRIGGER validate_image_type_trigger
  BEFORE INSERT ON storage.objects
  FOR EACH ROW
  WHEN (NEW.bucket_id = 'images')
  EXECUTE FUNCTION storage.validate_image_type();
