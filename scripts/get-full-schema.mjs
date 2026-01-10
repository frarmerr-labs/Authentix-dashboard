#!/usr/bin/env node

import pkg from 'pg';
const { Client } = pkg;

// Parse Supabase URL to get connection details
const supabaseUrl = 'https://brkyyeropjslfzwnhxcw.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJya3l5ZXJvcGpzbGZ6d25oeGN3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDI1MjcxNiwiZXhwIjoyMDc5ODI4NzE2fQ.hRJhu1jNsA6FYvG3kHLamQFuyIEV77DywNknSCGJHvA';

const projectRef = 'brkyyeropjslfzwnhxcw';
const connectionString = `postgresql://postgres.${projectRef}:${serviceKey.split('.')[2]}@aws-0-ap-south-1.pooler.supabase.com:6543/postgres`;

console.log('🔍 Fetching Full Schema from PostgreSQL...\n');

// Let me use a different approach - direct HTTP API call to Supabase
import https from 'https';

function querySupabase(sql) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query: sql });

    const options = {
      hostname: 'brkyyeropjslfzwnhxcw.supabase.co',
      port: 443,
      path: '/rest/v1/rpc/exec_sql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          resolve(result);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Simpler approach: just generate the schema queries
console.log('📋 RUN THESE QUERIES IN SUPABASE SQL EDITOR:\n');
console.log('='.repeat(70));

const queries = {
  'All Tables and Columns': `
SELECT
    c.table_name,
    c.column_name,
    c.data_type,
    c.character_maximum_length,
    c.is_nullable,
    c.column_default,
    c.ordinal_position
FROM information_schema.columns c
WHERE c.table_schema = 'public'
AND c.table_name IN ('companies', 'users', 'templates', 'import_jobs', 'certificates', 'verification_logs')
ORDER BY c.table_name, c.ordinal_position;
`,

  'Foreign Keys': `
SELECT
    tc.table_name AS from_table,
    kcu.column_name AS from_column,
    ccu.table_name AS to_table,
    ccu.column_name AS to_column,
    rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
    ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints rc
    ON tc.constraint_name = rc.constraint_name
WHERE tc.table_schema = 'public'
AND tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name;
`,

  'Check Constraints (Enums)': `
SELECT
    tc.table_name,
    tc.constraint_name,
    cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc
    ON tc.constraint_name = cc.constraint_name
WHERE tc.table_schema = 'public'
ORDER BY tc.table_name;
`,

  'Indexes': `
SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
`,

  'RLS Policies': `
SELECT
    tablename,
    policyname,
    permissive,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
`
};

for (const [name, sql] of Object.entries(queries)) {
  console.log(`\n-- ${name}`);
  console.log(sql.trim());
  console.log('');
}

console.log('\n✅ Copy and run these queries in Supabase SQL Editor');
console.log('Then paste the results back to me.\n');

process.exit(0);
