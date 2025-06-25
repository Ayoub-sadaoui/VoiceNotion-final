#!/bin/bash

# This script sets up a secure storage bucket in Supabase for storing images
# It applies RLS (Row Level Security) policies to ensure only authenticated users
# can access their own uploaded files

# Exit on error
set -e

echo "Setting up Supabase storage bucket for images..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "Error: Supabase CLI is not installed or not in your PATH"
    echo "Please install it by running: npm install -g supabase"
    exit 1
fi

# Check if project is linked
if ! supabase status 2>/dev/null | grep -q "project_id"; then
    echo "Error: Your Supabase project is not linked to a remote project"
    echo "Please link it first by running: supabase link --project-ref YOUR_PROJECT_ID"
    echo ""
    echo "========================================================"
    echo "MANUAL SETUP INSTRUCTIONS:"
    echo "========================================================"
    echo "1. Go to your Supabase dashboard: https://app.supabase.com/project/_/storage/buckets"
    echo "2. Create a new bucket named 'images' and check 'Enable public bucket'"
    echo "3. Go to the 'SQL Editor' tab and run the following SQL commands:"
    echo ""
    echo "-- Allow authenticated users to upload files to their own folder"
    echo "CREATE POLICY allow_uploads_to_own_folder"
    echo "ON storage.objects"
    echo "FOR INSERT"
    echo "USING (bucket_id = 'images' AND auth.uid()::text = split_part(name, '/', 1))"
    echo "WITH CHECK (bucket_id = 'images' AND auth.uid()::text = split_part(name, '/', 1));"
    echo ""
    echo "-- Allow authenticated users to update their own files"
    echo "CREATE POLICY allow_updates_to_own_files"
    echo "ON storage.objects"
    echo "FOR UPDATE"
    echo "USING (bucket_id = 'images' AND auth.uid()::text = split_part(name, '/', 1));"
    echo ""
    echo "-- Allow authenticated users to delete their own files"
    echo "CREATE POLICY allow_deletes_of_own_files"
    echo "ON storage.objects"
    echo "FOR DELETE"
    echo "USING (bucket_id = 'images' AND auth.uid()::text = split_part(name, '/', 1));"
    echo ""
    echo "-- Allow public read access to all files"
    echo "CREATE POLICY allow_public_read"
    echo "ON storage.objects"
    echo "FOR SELECT"
    echo "USING (bucket_id = 'images');"
    echo "========================================================"
    exit 1
fi

# Create the images bucket if it doesn't exist
echo "Creating 'images' bucket..."
supabase storage create bucket images || echo "Bucket 'images' already exists"

# Update the bucket to be public
echo "Making bucket public..."
supabase storage update bucket images --public

# Apply RLS policies for the images bucket
echo "Applying security policies..."

# Create SQL file for policies
cat > ./supabase_storage_policies.sql << EOF
-- Allow authenticated users to upload files to their own folder
CREATE POLICY IF NOT EXISTS allow_uploads_to_own_folder
ON storage.objects
FOR INSERT
USING (bucket_id = 'images' AND auth.uid()::text = split_part(name, '/', 1))
WITH CHECK (bucket_id = 'images' AND auth.uid()::text = split_part(name, '/', 1));

-- Allow authenticated users to update their own files
CREATE POLICY IF NOT EXISTS allow_updates_to_own_files
ON storage.objects
FOR UPDATE
USING (bucket_id = 'images' AND auth.uid()::text = split_part(name, '/', 1));

-- Allow authenticated users to delete their own files
CREATE POLICY IF NOT EXISTS allow_deletes_of_own_files
ON storage.objects
FOR DELETE
USING (bucket_id = 'images' AND auth.uid()::text = split_part(name, '/', 1));

-- Allow public read access to all files
CREATE POLICY IF NOT EXISTS allow_public_read
ON storage.objects
FOR SELECT
USING (bucket_id = 'images');
EOF

# Apply policies using supabase db execute
echo "Applying policies via SQL..."
supabase db execute --file ./supabase_storage_policies.sql || {
    echo "Error applying policies with supabase db execute."
    echo ""
    echo "========================================================"
    echo "Please apply the policies manually by copying the SQL from supabase_storage_policies.sql"
    echo "and executing it in the Supabase SQL Editor."
    echo "========================================================"
}

echo "Storage setup complete!"
echo ""
echo "IMPORTANT: Make sure your file upload code uses paths in the format 'userId/filename.ext'"
echo "For example: '${auth.uid()}/profile.jpg'"
echo ""
echo "To test the storage setup, use the test-auth-storage.jsx page in your app."
