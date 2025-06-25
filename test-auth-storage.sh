#!/bin/bash

# This script tests the Supabase storage setup by uploading and retrieving a test image

# Exit on error
set -e

echo "Testing Supabase storage setup..."

# Create a simple test image file
echo "Creating test image..."
cat > test-image.txt << EOF
This is a test file to simulate an image.
EOF

# Upload the test file to Supabase storage
echo "Uploading test file to Supabase..."
curl -X POST "${SUPABASE_URL}/storage/v1/object/images/test-image.txt" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" \
  -H "Content-Type: text/plain" \
  --data-binary @test-image.txt

# Get the public URL of the uploaded file
echo "Getting public URL of the uploaded file..."
curl -s -X GET "${SUPABASE_URL}/storage/v1/object/public/images/test-image.txt" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" | jq .

# Download the file to verify it was uploaded correctly
echo "Downloading the file to verify upload..."
curl -s -X GET "${SUPABASE_URL}/storage/v1/object/public/images/test-image.txt" \
  -H "apikey: ${SUPABASE_KEY}" > downloaded-test-image.txt

# Compare the downloaded file with the original
echo "Comparing downloaded file with original..."
diff test-image.txt downloaded-test-image.txt && echo "Files match! Storage setup is working correctly." || echo "Files don't match! Storage setup has issues."

# Clean up
echo "Cleaning up test files..."
rm test-image.txt downloaded-test-image.txt

echo "Storage test complete!"
