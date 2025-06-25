# PUBLIC STORAGE ACCESS INSTRUCTIONS

## Overview

These instructions set up **completely public access** to your Supabase "images" storage bucket. This means:

- **Anyone can upload files** without authentication
- **Anyone can read, update or delete any file** in the bucket
- **No security restrictions** are applied to the bucket

## Steps to Enable Public Access

1. **Run the setup script** (requires Supabase CLI):

   ```bash
   ./setup-public-storage.sh
   ```

2. **OR Manually apply the SQL** in the Supabase dashboard:

   - Go to your Supabase dashboard
   - Navigate to SQL Editor
   - Copy and paste the contents of `setup-public-storage.sql`
   - Run the SQL

3. **The storage.js file has been updated** to:
   - Not require authentication
   - Use a "public" folder for all uploads

## Testing

After setup, try uploading files from the Simple Image Upload page without logging in. It should work without authentication.

## Security Warning

⚠️ **CAUTION: This setup removes all security restrictions from your storage bucket.**

This means:

- Anyone can upload any file to your bucket
- Anyone can download any file from your bucket
- Anyone can delete any file from your bucket
- Your storage quota could be quickly filled by malicious uploads
- Inappropriate or illegal content could be uploaded to your bucket

**Only use this configuration for testing or when security is not a concern.**
