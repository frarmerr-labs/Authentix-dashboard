#!/usr/bin/env node

/**
 * Clean up duplicate storage buckets
 * Removes the newly created buckets since we should use the existing 'minecertificate' bucket
 */

const fs = require('fs');
const path = require('path');

// Read .env.local file
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

// Parse environment variables
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(supabaseUrl, supabaseKey);

const bucketsToDelete = ['templates', 'certificates', 'imports', 'assets'];

async function cleanupBuckets() {
  console.log('🧹 Cleaning up duplicate buckets...\n');

  for (const bucketId of bucketsToDelete) {
    try {
      const { data, error } = await supabase.storage.deleteBucket(bucketId);
      
      if (error) {
        if (error.message.includes('not found')) {
          console.log(`⚠️  '${bucketId}' - already deleted or doesn't exist`);
        } else {
          console.error(`❌ Failed to delete '${bucketId}': ${error.message}`);
        }
      } else {
        console.log(`✅ Deleted '${bucketId}'`);
      }
    } catch (err) {
      console.error(`❌ Error deleting '${bucketId}':`, err.message);
    }
  }

  console.log('\n✨ Cleanup complete!');
  console.log('   Using existing "minecertificate" bucket with folder structure.');
}

cleanupBuckets();
