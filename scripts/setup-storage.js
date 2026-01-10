#!/usr/bin/env node

/**
 * Supabase Storage Bucket Setup Script
 * 
 * This script automatically creates the required storage buckets and policies
 * for the MineCertificate application.
 * 
 * Usage: node scripts/setup-storage.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing Supabase credentials in .env.local');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const buckets = [
  {
    id: 'templates',
    name: 'templates',
    public: true,
    fileSizeLimit: 10485760, // 10MB
    allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png']
  },
  {
    id: 'certificates',
    name: 'certificates',
    public: true,
    fileSizeLimit: 10485760, // 10MB
    allowedMimeTypes: ['application/pdf']
  },
  {
    id: 'imports',
    name: 'imports',
    public: false,
    fileSizeLimit: 10485760, // 10MB
    allowedMimeTypes: [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv'
    ]
  },
  {
    id: 'assets',
    name: 'assets',
    public: true,
    fileSizeLimit: 5242880, // 5MB
    allowedMimeTypes: ['image/png', 'image/jpeg']
  }
];

async function createBuckets() {
  console.log('🚀 Starting storage bucket setup...\n');

  for (const bucket of buckets) {
    try {
      // Check if bucket already exists
      const { data: existingBuckets } = await supabase.storage.listBuckets();
      const bucketExists = existingBuckets?.some(b => b.id === bucket.id);

      if (bucketExists) {
        console.log(`✅ Bucket '${bucket.id}' already exists`);
        continue;
      }

      // Create bucket
      const { data, error } = await supabase.storage.createBucket(bucket.id, {
        public: bucket.public,
        fileSizeLimit: bucket.fileSizeLimit,
        allowedMimeTypes: bucket.allowedMimeTypes
      });

      if (error) {
        console.error(`❌ Failed to create bucket '${bucket.id}':`, error.message);
      } else {
        console.log(`✅ Created bucket '${bucket.id}' (${bucket.public ? 'public' : 'private'})`);
      }
    } catch (err) {
      console.error(`❌ Error creating bucket '${bucket.id}':`, err.message);
    }
  }

  console.log('\n✨ Storage bucket setup complete!');
  console.log('\n📝 Note: Storage policies need to be set up via SQL.');
  console.log('   Run the SQL from supabase/storage-setup.sql in your Supabase dashboard.');
  console.log('   (This script creates buckets only, policies require SQL execution)\n');
}

createBuckets().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
