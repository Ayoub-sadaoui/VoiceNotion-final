#!/bin/bash

# This script sets up a storage bucket in Supabase using the REST API
# It requires SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables

# Exit on error
set -e

# Check if required environment variables are set
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_KEY" ]; then
  echo "Error: SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables must be set."
  echo "These can be found in your Supabase dashboard under Project Settings > API."
  echo ""
  echo "Usage:"
  echo "SUPABASE_URL=https://your-project-ref.supabase.co SUPABASE_SERVICE_KEY=your-service-key ./setup-storage-api.sh"
  exit 1
fi

echo "Setting up Supabase storage bucket for images..."

# Create the images bucket
echo "Creating 'images' bucket..."
curl -X POST \
  "${SUPABASE_URL}/storage/v1/buckets" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"id": "images", "name": "images", "public": true}' \
  || echo "Bucket may already exist, continuing..."

echo "Setting bucket policies..."

# Policy for uploads to own folder
curl -X POST \
  "${SUPABASE_URL}/storage/v1/policies" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "allow_uploads_to_own_folder",
    "definition": {
      "bucket_id": "images",
      "operation": "INSERT",
      "expression": "(auth.uid()::text = storage.foldername(name)[1])"
    }
  }' \
  || echo "Policy may already exist, continuing..."

# Policy for updating own files
curl -X POST \
  "${SUPABASE_URL}/storage/v1/policies" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "allow_updates_to_own_files",
    "definition": {
      "bucket_id": "images",
      "operation": "UPDATE",
      "expression": "(auth.uid()::text = owner)"
    }
  }' \
  || echo "Policy may already exist, continuing..."

# Policy for deleting own files
curl -X POST \
  "${SUPABASE_URL}/storage/v1/policies" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "allow_deletes_of_own_files",
    "definition": {
      "bucket_id": "images",
      "operation": "DELETE",
      "expression": "(auth.uid()::text = owner)"
    }
  }' \
  || echo "Policy may already exist, continuing..."

# Policy for public read access
curl -X POST \
  "${SUPABASE_URL}/storage/v1/policies" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "allow_public_read",
    "definition": {
      "bucket_id": "images",
      "operation": "SELECT",
      "expression": "true"
    }
  }' \
  || echo "Policy may already exist, continuing..."

echo "Storage setup complete!"
echo ""
echo "You can now test the storage functionality by:"
echo "1. Going to your app's test page at /test-auth-storage"
echo "2. Signing in, selecting and uploading an image"
echo "3. Verifying the image appears in your Supabase Storage dashboard"
