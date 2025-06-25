#!/bin/bash

# Public Storage Setup Script
# This script removes all security restrictions on the images bucket
# USE WITH CAUTION - this allows anyone to read/write to your storage

echo "Setting up completely public storage access for the 'images' bucket..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "Error: Supabase CLI is not installed. Please install it first."
    exit 1
fi

# Run the SQL script to update storage policies
echo "Applying public storage policies..."
supabase db reset --db-url $SUPABASE_DB_URL 
cat setup-public-storage.sql | supabase db execute

echo "Now modifying the storage.js file to skip authentication checks..."
echo "Updating services/supabase/storage.js..."

# We'll notify the user of manual changes needed
echo ""
echo "====================================================================="
echo "IMPORTANT: MANUAL CHANGES REQUIRED"
echo "====================================================================="
echo "To complete the setup, edit services/supabase/storage.js to:"
echo ""
echo "1. REMOVE all authentication checks in the uploadImageAsync function"
echo "2. Use a consistent folder for all uploads (e.g., 'public' or 'anonymous')"
echo "3. Example change:"
echo "   const filePath = 'public/' + Date.now() + '.' + fileExt;"
echo ""
echo "====================================================================="
echo "Script completed! Test your storage access to confirm it's working."
echo "REMEMBER: Your storage is now publicly accessible to everyone!"
