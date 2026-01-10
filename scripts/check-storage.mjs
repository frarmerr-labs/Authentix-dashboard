#!/usr/bin/env node

/**
 * Supabase Storage Diagnostic & Fix Script
 * 
 * This script checks existing storage buckets and creates missing ones.
 * Uses Next.js built-in env loading (no dotenv needed).
 * 
 * Usage: node scripts/check-storage.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { loadEnvConfig } from '@next/env';

// Load environment variables
const projectDir = process.cwd();
loadEnvConfig(projectDir);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Missing Supabase credentials');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)');
  process.exit(1);
}

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
      } else {
        console.log(`   ✅ Created successfully`);
        created++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log(`📊 Summary: ${created} created, ${skipped} already existed`);
    
    if (created > 0) {
      console.log('\n✨ Storage buckets are now ready!');
      console.log('   You can now upload templates.');
    } else {
      console.log('\n✨ All required buckets already exist!');
      console.log('   If you\'re still getting errors, check:');
      console.log('   1. Storage policies (run supabase/storage-setup.sql)');
      console.log('   2. User has a company_id in the users table');
    }

  } catch (err) {
    console.error('❌ Fatal error:', err.message);
    process.exit(1);
  }
}

checkAndFixStorage();
