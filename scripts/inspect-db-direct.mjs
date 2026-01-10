#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const SUPABASE_URL = 'https://brkyyeropjslfzwnhxcw.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJya3l5ZXJvcGpzbGZ6d25oeGN3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDI1MjcxNiwiZXhwIjoyMDc5ODI4NzE2fQ.hRJhu1jNsA6FYvG3kHLamQFuyIEV77DywNknSCGJHvA';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const inspection = {
  timestamp: new Date().toISOString(),
  database_url: SUPABASE_URL,
  tables: {},
  storage_buckets: {},
  summary: {}
};

console.log('🔍 SUPABASE DATABASE INSPECTION');
console.log('='.repeat(70));
console.log(`Timestamp: ${inspection.timestamp}`);
console.log(`Database: ${SUPABASE_URL}\n`);

// Expected tables based on setup.sql
const EXPECTED_TABLES = [
  'companies',
  'users',
  'templates',
  'import_jobs',
  'certificates',
  'verification_logs'
];

// ============================================
// INSPECT TABLES
// ============================================

console.log('📊 INSPECTING TABLES');
console.log('─'.repeat(70));

for (const tableName of EXPECTED_TABLES) {
  console.log(`\n🔍 Table: ${tableName}`);

  try {
    // Get row count
    const { count, error: countError } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.log(`   ❌ Table does not exist or not accessible`);
      console.log(`   Error: ${countError.message}`);
      inspection.tables[tableName] = {
        exists: false,
        error: countError.message
      };
      continue;
    }

    console.log(`   ✅ Exists`);
    console.log(`   📊 Row count: ${count || 0}`);

    inspection.tables[tableName] = {
      exists: true,
      row_count: count || 0,
      columns: {},
      sample_data: null
    };

    // Get sample row to understand schema
    const { data: sampleData, error: sampleError } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);

    if (!sampleError && sampleData && sampleData.length > 0) {
      const sample = sampleData[0];
      const columns = Object.keys(sample);

      console.log(`   📋 Columns: ${columns.length}`);

      inspection.tables[tableName].total_columns = columns.length;
      inspection.tables[tableName].column_names = columns;
      inspection.tables[tableName].sample_data = sample;

      // Analyze each column
      columns.forEach(colName => {
        const value = sample[colName];
        const valueType = value === null ? 'NULL' : typeof value;
        const isArray = Array.isArray(value);
        const isObject = value !== null && typeof value === 'object' && !isArray;

        inspection.tables[tableName].columns[colName] = {
          inferred_type: isArray ? 'array' : (isObject ? 'jsonb/object' : valueType),
          is_nullable: value === null,
          sample_value: value === null ? null : (
            isObject || isArray ? '[JSON]' : String(value).substring(0, 50)
          )
        };
      });

      // Display columns
      columns.forEach(col => {
        const info = inspection.tables[tableName].columns[col];
        console.log(`      • ${col}: ${info.inferred_type}${info.is_nullable ? ' (nullable)' : ''}`);
      });
    } else if (count > 0) {
      console.log(`   ⚠️  Has ${count} rows but cannot fetch sample (permissions?)`);
    } else {
      console.log(`   📋 Table is empty (no sample data)`);
      inspection.tables[tableName].columns = 'EMPTY_TABLE';
    }

  } catch (err) {
    console.log(`   ❌ Error: ${err.message}`);
    inspection.tables[tableName] = {
      exists: false,
      error: err.message
    };
  }
}

// ============================================
// INSPECT STORAGE
// ============================================

console.log('\n\n📦 INSPECTING STORAGE BUCKETS');
console.log('─'.repeat(70));

try {
  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();

  if (bucketsError) {
    console.log(`❌ Cannot access storage buckets: ${bucketsError.message}`);
    inspection.storage_buckets.error = bucketsError.message;
  } else {
    console.log(`\nFound ${buckets.length} bucket(s):\n`);

    for (const bucket of buckets) {
      console.log(`📁 Bucket: ${bucket.name}`);
      console.log(`   ID: ${bucket.id}`);
      console.log(`   Public: ${bucket.public}`);
      console.log(`   Size Limit: ${bucket.file_size_limit ? (bucket.file_size_limit / 1024 / 1024).toFixed(2) + ' MB' : 'Unlimited'}`);
      console.log(`   MIME Types: ${bucket.allowed_mime_types?.join(', ') || 'Any'}`);

      inspection.storage_buckets[bucket.name] = {
        id: bucket.id,
        public: bucket.public,
        file_size_limit: bucket.file_size_limit,
        allowed_mime_types: bucket.allowed_mime_types,
        folders: []
      };

      // List top-level folders/files
      try {
        const { data: objects, error: listError } = await supabase.storage
          .from(bucket.name)
          .list('', {
            limit: 100,
            sortBy: { column: 'name', order: 'asc' }
          });

        if (!listError && objects) {
          const folders = objects.filter(obj => obj.id === null || obj.metadata === null);
          const files = objects.filter(obj => obj.id !== null);

          console.log(`   📂 Top-level items: ${objects.length}`);
          console.log(`      Folders: ${folders.length}`);
          console.log(`      Files: ${files.length}`);

          if (folders.length > 0) {
            console.log(`   📂 Folders found:`);
            folders.slice(0, 10).forEach(f => {
              console.log(`      • ${f.name}/`);
              inspection.storage_buckets[bucket.name].folders.push(f.name);
            });
          }

          if (files.length > 0) {
            console.log(`   📄 Sample files:`);
            files.slice(0, 5).forEach(f => {
              console.log(`      • ${f.name} (${(f.metadata?.size / 1024).toFixed(2)} KB)`);
            });
          }

          inspection.storage_buckets[bucket.name].object_count = objects.length;
        }
      } catch (err) {
        console.log(`   ⚠️  Cannot list objects: ${err.message}`);
      }

      console.log('');
    }
  }
} catch (err) {
  console.log(`❌ Storage inspection error: ${err.message}`);
  inspection.storage_buckets.error = err.message;
}

// ============================================
// SUMMARY
// ============================================

console.log('\n📊 INSPECTION SUMMARY');
console.log('='.repeat(70));

const existingTables = Object.keys(inspection.tables).filter(t => inspection.tables[t].exists);
const totalRows = existingTables.reduce((sum, t) => sum + (inspection.tables[t].row_count || 0), 0);

inspection.summary = {
  tables_expected: EXPECTED_TABLES.length,
  tables_found: existingTables.length,
  tables_missing: EXPECTED_TABLES.filter(t => !inspection.tables[t]?.exists),
  total_rows: totalRows,
  storage_buckets: Object.keys(inspection.storage_buckets).length,
  has_data: totalRows > 0
};

console.log(`\n   Tables:`);
console.log(`      Expected: ${inspection.summary.tables_expected}`);
console.log(`      Found: ${inspection.summary.tables_found}`);
if (inspection.summary.tables_missing.length > 0) {
  console.log(`      Missing: ${inspection.summary.tables_missing.join(', ')}`);
}

console.log(`\n   Data:`);
console.log(`      Total rows across all tables: ${totalRows}`);
console.log(`      Has production data: ${totalRows > 0 ? 'YES ⚠️' : 'NO ✅'}`);

existingTables.forEach(table => {
  const count = inspection.tables[table].row_count;
  if (count > 0) {
    console.log(`         • ${table}: ${count} rows`);
  }
});

console.log(`\n   Storage:`);
console.log(`      Buckets: ${inspection.summary.storage_buckets}`);
Object.keys(inspection.storage_buckets).forEach(bucket => {
  const info = inspection.storage_buckets[bucket];
  if (info.object_count !== undefined) {
    console.log(`         • ${bucket}: ${info.object_count} objects, ${info.folders.length} folders`);
  }
});

// ============================================
// SAVE RESULTS
// ============================================

const outputPath = './database-inspection-complete.json';
fs.writeFileSync(outputPath, JSON.stringify(inspection, null, 2));

console.log(`\n✅ Complete inspection saved to: ${outputPath}`);
console.log('\n');

process.exit(0);
