#!/usr/bin/env node
/**
 * ==============================================================================
 * AgriPulse AI - Supabase Migration Runner (Node.js)
 * Script: scripts/apply-migrations.js
 *
 * Applies 001_initial_schema.sql to Supabase Cloud PostgreSQL.
 * Features:
 *   - Built-in zero-dependency .env parser (no dotenv dependency required)
 *   - Supports DATABASE_URL (via 'pg' if available)
 *   - Supports Supabase Cloud SQL execution API via SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 * ==============================================================================
 */

const fs = require('fs');
const path = require('path');

// ANSI Terminal Colors
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

// Zero-dependency .env loader
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) {
    return false;
  }
  const content = fs.readFileSync(envPath, 'utf8');
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eqIdx = line.indexOf('=');
    if (eqIdx !== -1) {
      const key = line.slice(0, eqIdx).trim();
      let val = line.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
  return true;
}

async function runPgMigration(connectionString, sqlContent, migrationFile) {
  let pg;
  try {
    pg = require('pg');
  } catch (err) {
    throw new Error(
      "The 'pg' package is required for direct Node.js PostgreSQL connections. You can also run 'python scripts/apply-migrations.py'."
    );
  }

  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  console.log(`${colors.cyan}Connecting to Supabase Cloud PostgreSQL via Connection String...${colors.reset}`);
  await client.connect();

  try {
    console.log(`${colors.yellow}Executing transaction for ${migrationFile}...${colors.reset}`);
    await client.query('BEGIN');
    await client.query(sqlContent);
    await client.query('COMMIT');
    console.log(`${colors.green}âœ“ Migration successfully applied to Supabase!${colors.reset}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

async function runSupabaseSqlApi(supabaseUrl, serviceRoleKey, sqlContent) {
  // Extract project ref
  const projectRefMatch = supabaseUrl.match(/https?:\/\/([a-z0-9-]+)\.supabase\.co/i);
  const projectRef = projectRefMatch ? projectRefMatch[1] : null;

  console.log(`${colors.cyan}Attempting execution via Supabase API...${colors.reset}`);
  
  // Endpoint 1: Supabase Management SQL query endpoint
  const queryEndpoints = [
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    `${supabaseUrl}/pg/query`,
    `${supabaseUrl}/rest/v1/rpc/exec_sql`
  ];

  let applied = false;
  let lastError = null;

  for (const endpoint of queryEndpoints) {
    if (!endpoint || (endpoint.includes('undefined'))) continue;
    try {
      console.log(`${colors.dim}Probing SQL endpoint: ${endpoint}...${colors.reset}`);
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({ query: sqlContent }),
      });

      if (res.ok) {
        console.log(`${colors.green}âœ“ Migration successfully executed via Supabase API!${colors.reset}`);
        applied = true;
        break;
      } else {
        const text = await res.text();
        lastError = `HTTP ${res.status}: ${text}`;
      }
    } catch (e) {
      lastError = e.message;
    }
  }

  if (!applied) {
    throw new Error(
      `Could not apply SQL directly via REST API (${lastError}).\n` +
      `Supabase requires direct PostgreSQL access (DATABASE_URL) for raw DDL execution.\n` +
      `Please provide DATABASE_URL in .env from Supabase Dashboard -> Project Settings -> Database -> Connection URI.`
    );
  }
}

async function main() {
  console.log(`\n${colors.bold}${colors.green}========================================${colors.reset}`);
  console.log(`${colors.bold}${colors.green}  AgriPulse AI - Supabase Migration Runner${colors.reset}`);
  console.log(`${colors.bold}${colors.green}========================================${colors.reset}\n`);

  const envFound = loadEnv();
  const migrationFilePath = path.join(__dirname, '..', 'supabase', 'migrations', '001_initial_schema.sql');

  if (!fs.existsSync(migrationFilePath)) {
    console.error(`${colors.red}Error: Migration file not found at:${colors.reset} ${migrationFilePath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(migrationFilePath, 'utf8');

  const databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const isPlaceholder = (val) => !val || val.includes('your-project') || val.includes('your-db-password') || val.includes('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');

  if (!envFound) {
    console.error(`${colors.red}Error: No .env file found in project root!${colors.reset}`);
    console.error(`\nPlease create a .env file (you can copy .env.example) and add your Supabase credentials:`);
    console.error(`  1. ${colors.cyan}DATABASE_URL${colors.reset} (Direct or connection pooler URI from Supabase Dashboard -> Settings -> Database)`);
    console.error(`     OR`);
    console.error(`  2. ${colors.cyan}SUPABASE_URL${colors.reset} and ${colors.cyan}SUPABASE_SERVICE_ROLE_KEY${colors.reset}\n`);
    process.exit(1);
  }

  if (databaseUrl && !isPlaceholder(databaseUrl)) {
    try {
      await runPgMigration(databaseUrl, sql, path.basename(migrationFilePath));
      process.exit(0);
    } catch (err) {
      console.error(`${colors.red}Error running via DATABASE_URL:${colors.reset}`, err.message);
      process.exit(1);
    }
  } else if (supabaseUrl && serviceRoleKey && !isPlaceholder(supabaseUrl) && !isPlaceholder(serviceRoleKey)) {
    try {
      await runSupabaseSqlApi(supabaseUrl, serviceRoleKey, sql);
      process.exit(0);
    } catch (err) {
      console.error(`\n${colors.yellow}Notice:${colors.reset} ${err.message}\n`);
      process.exit(1);
    }
  } else {
    console.error(`${colors.red}Error: Missing or placeholder Supabase credentials in .env!${colors.reset}`);
    console.error(`\nPlease configure your real Supabase project credentials in .env:`);
    console.error(`- DATABASE_URL=postgresql://postgres.[project-ref]:[password]@[host]:6543/postgres?sslmode=require`);
    console.error(`- SUPABASE_URL=https://[project-ref].supabase.co`);
    console.error(`- SUPABASE_SERVICE_ROLE_KEY=your_service_role_key\n`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(`${colors.red}Fatal Error:${colors.reset}`, err);
  process.exit(1);
});
