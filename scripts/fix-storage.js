#!/usr/bin/env node

/**
 * Supabase Storage Diagnostic & Fix Script
 * Simple version - reads .env.local directly
 * 
 * Usage: node scripts/fix-storage.js
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

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Missing Supabase credentials in .env.local');
  process.exit(1);
}

// Import Supabase client
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(supabaseUrl, supabaseKey);

const requiredBuckets = [
  {
    id: 'templates',
    name: 'templates',
    public: true,
    fileSizeLimit: 10485760,
    allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png']
  },
  {
    id: 'certificates',
    name: 'certificates',
    public: true,
    fileSizeLimit: 10485760,
    allowedMimeTypes: ['application/pdf']
  },
  {
    id: 'imports',
    name: 'imports',
    public: false,
    fileSizeLimit: 10485760,
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
    fileSizeLimit: 5242880,
    allowedMimeTypes: ['image/png', 'image/jpeg']
  }
];

async function checkAndFixStorage() {
  console.log('🔍 Checking Supabase storage...\n');

  try {
    // List existing buckets
    const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('❌ Error listing buckets:', listError.message);
      return;
    }

    console.log('📦 Existing buckets:');
    if (existingBuckets && existingBuckets.length > 0) {
      existingBuckets.forEach(bucket => {
        console.log(`   ✓ ${bucket.id} (${bucket.public ? 'public' : 'private'})`);
      });
    } else {
      console.log('   (none found)');
    }

    console.log('\n🔧 Checking required buckets...\n');

    const existingIds = new Set(existingBuckets?.map(b => b.id) || []);
    let created = 0;
    let skipped = 0;
    let failed = 0;

    for (const bucket of requiredBuckets) {
      if (existingIds.has(bucket.id)) {
        console.log(`✅ '${bucket.id}' - already exists`);
        skipped++;
        continue;
      }

      // Create missing bucket
      console.log(`🔨 Creating '${bucket.id}'...`);
      const { data, error } = await supabase.storage.createBucket(bucket.id, {
        public: bucket.public,
        fileSizeLimit: bucket.fileSizeLimit,
        allowedMimeTypes: bucket.allowedMimeTypes
      });

      if (error) {
        console.error(`   ❌ Failed: ${error.message}`);
        failed++;
      } else {
        console.log(`   ✅ Created successfully`);
        created++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log(`📊 Summary: ${created} created, ${skipped} already existed, ${failed} failed`);
    
    if (created > 0) {
      console.log('\n✨ Storage buckets created!');
      console.log('   Try uploading a template now.');
    } else if (failed > 0) {
      console.log('\n⚠️  Some buckets failed to create.');
      console.log('   This might be a permissions issue.');
      console.log('   Check if SUPABASE_SERVICE_ROLE_KEY is set in .env.local');
    } else {
      console.log('\n✨ All required buckets already exist!');
    }

  } catch (err) {
    console.error('❌ Fatal error:', err.message);
    console.error(err);
    process.exit(1);
  }
}

checkAndFixStorage();
