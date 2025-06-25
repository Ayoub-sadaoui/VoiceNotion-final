-- Create a function to set up storage policies for a bucket
-- This function will be called via RPC from the client
CREATE OR REPLACE FUNCTION setup_storage_policies_for_bucket(bucket_name TEXT)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Ensure only authenticated users can call this function
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Allow authenticated users to upload files to their own folder
  EXECUTE FORMAT('
    CREATE POLICY IF NOT EXISTS allow_uploads_to_own_folder
    ON storage.objects
    FOR INSERT
    WITH CHECK (bucket_id = %L AND auth.uid()::text = split_part(name, ''/'', 1))
  ', bucket_name);

  -- Allow authenticated users to update their own files
  EXECUTE FORMAT('
    CREATE POLICY IF NOT EXISTS allow_updates_to_own_files
    ON storage.objects
    FOR UPDATE
    USING (bucket_id = %L AND auth.uid()::text = split_part(name, ''/'', 1))
  ', bucket_name);

  -- Allow authenticated users to delete their own files
  EXECUTE FORMAT('
    CREATE POLICY IF NOT EXISTS allow_deletes_of_own_files
    ON storage.objects
    FOR DELETE
    USING (bucket_id = %L AND auth.uid()::text = split_part(name, ''/'', 1))
  ', bucket_name);

  -- Allow public read access for all files
  EXECUTE FORMAT('
    CREATE POLICY IF NOT EXISTS allow_public_read
    ON storage.objects
    FOR SELECT
    USING (bucket_id = %L)
  ', bucket_name);

  RETURN TRUE;
END;
$$;
