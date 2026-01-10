#!/usr/bin/env node

/**
 * Add missing 'fields' column to templates table
 * Also adds 'width' and 'height' columns if they don't exist
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

async function fixTemplatesTable() {
  console.log('🔧 Fixing templates table schema...\n');

  const fixes = [
    {
      name: 'Add fields column',
      sql: `ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS fields JSONB NOT NULL DEFAULT '[]'::jsonb;`
    },
    {
      name: 'Add width column',
      sql: `ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS width INTEGER;`
    },
    {
      name: 'Add height column',
      sql: `ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS height INTEGER;`
    }
  ];

  for (const fix of fixes) {
    try {
      console.log(`📝 ${fix.name}...`);
      const { data, error } = await supabase.rpc('exec_sql', { sql_query: fix.sql });
      
      if (error) {
        // Try alternative method using direct SQL
        const { error: directError } = await supabase.from('templates').select('*').limit(0);
        if (directError && directError.message.includes('fields')) {
          console.error(`   ❌ Failed: ${error.message}`);
          console.log(`   ℹ️  You need to run this SQL manually in Supabase SQL Editor:`);
          console.log(`   ${fix.sql}\n`);
        } else {
          console.log(`   ✅ Column might already exist or was added`);
        }
      } else {
        console.log(`   ✅ Success`);
      }
    } catch (err) {
      console.log(`   ⚠️  ${err.message}`);
      console.log(`   ℹ️  Run this SQL manually in Supabase SQL Editor:`);
      console.log(`   ${fix.sql}\n`);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('📋 Manual SQL to run in Supabase SQL Editor:\n');
  console.log('-- Add missing columns to templates table');
  fixes.forEach(fix => {
    console.log(fix.sql);
  });
  console.log('\n✨ After running the SQL, try uploading a template again!');
}

fixTemplatesTable();
