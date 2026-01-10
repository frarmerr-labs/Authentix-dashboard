#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
const SUPABASE_URL = 'https://brkyyeropjslfzwnhxcw.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJya3l5ZXJvcGpzbGZ6d25oeGN3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDI1MjcxNiwiZXhwIjoyMDc5ODI4NzE2fQ.hRJhu1jNsA6FYvG3kHLamQFuyIEV77DywNknSCGJHvA';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const inspection = {
  timestamp: new Date().toISOString(),
  tables: {},
  storage: {},
  data_volume: {},
  errors: []
};

console.log('🔍 Starting Supabase Database Inspection...\n');

// Helper function to run SQL query
async function runQuery(name, sql) {
  try {
    console.log(`Running: ${name}...`);
    const { data, error } = await supabase.rpc('exec_sql', { query: sql });

    if (error) {
      // Try direct query if RPC fails
      const { data: directData, error: directError } = await supabase
        .from('_query')
        .select('*')
        .limit(0);

      if (directError) {
        throw error;
      }
    }

    console.log(`✅ ${name}: ${data?.length || 0} results\n`);
    return data;
  } catch (err) {
    console.error(`❌ ${name} failed:`, err.message);
    inspection.errors.push({ query: name, error: err.message });
    return null;
  }
}

// Alternative: Use PostgreSQL client directly
async function queryDB(sql) {
  const { data, error } = await supabase.rpc('exec_sql', { query: sql });
  if (error) throw error;
  return data;
}

// ============================================
// SECTION 1: Tables and Columns
// ============================================

console.log('📊 SECTION 1: Inspecting Tables & Columns\n');

try {
  // Get all tables
  const { data: tables, error: tablesError } = await supabase
    .rpc('exec_sql', {
      query: `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;`
    })
    .catch(async () => {
      // Fallback: try using information_schema
      return await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public');
    });

  if (tablesError) {
    console.log('Cannot use RPC, trying direct table inspection...\n');

    // List of expected tables based on setup.sql
    const expectedTables = ['companies', 'users', 'templates', 'import_jobs', 'certificates', 'verification_logs'];

    for (const tableName of expectedTables) {
      console.log(`Checking table: ${tableName}`);

      try {
        // Try to query the table to confirm it exists
        const { data, error, count } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });

        if (!error) {
          inspection.tables[tableName] = {
            exists: true,
            row_count: count || 0
          };
          console.log(`  ✅ ${tableName}: ${count} rows`);

          // Get sample row to infer schema
          const { data: sample } = await supabase
            .from(tableName)
            .select('*')
            .limit(1);

          if (sample && sample.length > 0) {
            inspection.tables[tableName].columns = Object.keys(sample[0]);
            inspection.tables[tableName].sample = sample[0];
          }
        } else {
          console.log(`  ❌ ${tableName}: ${error.message}`);
        }
      } catch (err) {
        console.log(`  ⚠️  ${tableName}: ${err.message}`);
      }
    }
  }
} catch (err) {
  console.error('Error inspecting tables:', err.message);
  inspection.errors.push({ section: 'tables', error: err.message });
}

// ============================================
// SECTION 2: Storage Buckets
// ============================================

console.log('\n📦 SECTION 2: Inspecting Storage Buckets\n');

try {
  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();

  if (!bucketsError && buckets) {
    console.log(`Found ${buckets.length} storage buckets:\n`);

    for (const bucket of buckets) {
      console.log(`  📁 ${bucket.name}`);
      console.log(`     Public: ${bucket.public}`);
      console.log(`     Size Limit: ${bucket.file_size_limit ? (bucket.file_size_limit / 1024 / 1024).toFixed(2) + ' MB' : 'N/A'}`);

      inspection.storage[bucket.name] = {
        id: bucket.id,
        public: bucket.public,
        file_size_limit: bucket.file_size_limit,
        allowed_mime_types: bucket.allowed_mime_types
      };

      // List files in bucket
      try {
        const { data: files, error: filesError } = await supabase.storage
          .from(bucket.name)
          .list('', { limit: 10 });

        if (!filesError && files) {
          inspection.storage[bucket.name].sample_files_count = files.length;
          inspection.storage[bucket.name].sample_files = files.slice(0, 5).map(f => f.name);
          console.log(`     Files: ${files.length} (showing first 5)`);
          files.slice(0, 5).forEach(f => console.log(`       - ${f.name}`));
        }
      } catch (err) {
        console.log(`     ⚠️  Cannot list files: ${err.message}`);
      }

      console.log('');
    }
  } else {
    console.log('❌ Cannot access storage buckets:', bucketsError?.message);
    inspection.errors.push({ section: 'storage', error: bucketsError?.message });
  }
} catch (err) {
  console.error('Error inspecting storage:', err.message);
  inspection.errors.push({ section: 'storage', error: err.message });
}

// ============================================
// SECTION 3: Data Volume & Samples
// ============================================

console.log('\n📈 SECTION 3: Data Volume Analysis\n');

const tableNames = Object.keys(inspection.tables).filter(t => inspection.tables[t].exists);

for (const tableName of tableNames) {
  try {
    const { count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    inspection.data_volume[tableName] = count || 0;
    console.log(`  ${tableName}: ${count || 0} rows`);
  } catch (err) {
    console.log(`  ${tableName}: Error - ${err.message}`);
  }
}

// ============================================
// SECTION 4: Detailed Column Inspection
// ============================================

console.log('\n\n🔬 SECTION 4: Detailed Column Analysis\n');

for (const tableName of tableNames) {
  if (!inspection.tables[tableName]?.sample) continue;

  console.log(`\n📋 Table: ${tableName}`);
  console.log('─'.repeat(60));

  const sample = inspection.tables[tableName].sample;
  const columns = Object.keys(sample);

  console.log(`Total Columns: ${columns.length}\n`);

  columns.forEach(col => {
    const value = sample[col];
    const type = typeof value;
    const isNull = value === null;

    console.log(`  ${col}:`);
    console.log(`    Type: ${isNull ? 'NULL' : type}`);
    console.log(`    Sample: ${isNull ? 'NULL' : (typeof value === 'object' ? JSON.stringify(value).substring(0, 100) : value)}`);
  });
}

// ============================================
// Save Results
// ============================================

const outputPath = path.join(process.cwd(), 'database-inspection-results.json');
fs.writeFileSync(outputPath, JSON.stringify(inspection, null, 2));

console.log('\n\n✅ Inspection Complete!');
console.log(`\n📄 Results saved to: ${outputPath}`);
console.log(`\n📊 Summary:`);
console.log(`   Tables found: ${Object.keys(inspection.tables).length}`);
console.log(`   Storage buckets: ${Object.keys(inspection.storage).length}`);
console.log(`   Errors: ${inspection.errors.length}`);

if (inspection.errors.length > 0) {
  console.log('\n⚠️  Errors encountered:');
  inspection.errors.forEach((err, i) => {
    console.log(`   ${i + 1}. ${err.query || err.section}: ${err.error}`);
  });
}

console.log('\n');
process.exit(0);
