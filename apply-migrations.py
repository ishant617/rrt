#!/usr/bin/env python3
"""
AgriPulse AI - Supabase Migration Runner (Python)
Script: scripts/apply-migrations.py

Applies 001_initial_schema.sql to Supabase Cloud PostgreSQL using pg8000.
Requires only standard python + pg8000.
"""

import os
import sys
from pathlib import Path
from urllib.parse import urlparse, unquote

def load_env():
    env_file = Path(__file__).resolve().parent.parent / '.env'
    if not env_file.exists():
        return False
    with open(env_file, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            if '=' in line:
                k, v = line.split('=', 1)
                k = k.strip()
                v = v.strip().strip('"').strip("'")
                if k not in os.environ:
                    os.environ[k] = v
    return True

def run():
    print("\n\033[1;32m========================================\033[0m")
    print("\033[1;32m  AgriPulse AI - Python Migration Runner\033[0m")
    print("\033[1;32m========================================\033[0m\n")

    has_env = load_env()
    migration_file = Path(__file__).resolve().parent.parent / 'supabase' / 'migrations' / '001_initial_schema.sql'

    if not migration_file.exists():
        print(f"\033[31mError: Migration file not found at: {migration_file}\033[0m")
        sys.exit(1)

    with open(migration_file, 'r', encoding='utf-8') as f:
        sql_content = f.read()

    db_url = os.environ.get('DATABASE_URL') or os.environ.get('SUPABASE_DB_URL')
    
    is_placeholder = lambda val: not val or 'your-project' in val or 'your-db-password' in val

    if not has_env or is_placeholder(db_url):
        print("\033[31mError: No valid DATABASE_URL found in .env\033[0m")
        print("\nTo apply migrations directly to Supabase Cloud PostgreSQL:")
        print("1. Open your Supabase Project Dashboard -> Project Settings -> Database")
        print("2. Copy your Connection String (URI) under 'Connection Pooling' (port 6543) or 'Direct Connection' (port 5432)")
        print("3. Create or update `.env` in the project root:")
        print('   DATABASE_URL="postgresql://postgres.[project-ref]:[YOUR-PASSWORD]@[host]:6543/postgres?sslmode=require"')
        print("4. Re-run this migration command.\n")
        sys.exit(1)

    # Parse connection string
    u = urlparse(db_url)
    username = unquote(u.username or 'postgres')
    password = unquote(u.password or '')
    hostname = u.hostname or 'localhost'
    port = u.port or 5432
    database = u.path.lstrip('/') or 'postgres'

    import pg8000.native

    print(f"\033[36mConnecting to Supabase PostgreSQL at {hostname}:{port} (Database: {database})...\033[0m")
    try:
        ssl_context = True # Enable SSL for Supabase
        con = pg8000.native.Connection(
            user=username,
            password=password,
            host=hostname,
            port=port,
            database=database,
            ssl_context=ssl_context
        )
        print("\033[33mApplying 001_initial_schema.sql (tables, enums, RLS, triggers, seed data)...\033[0m")
        con.run(sql_content)
        print("\033[1;32mâœ“ Migration successfully applied to Supabase PostgreSQL!\033[0m\n")
        con.close()
    except Exception as e:
        print(f"\033[31mMigration failed: {e}\033[0m")
        sys.exit(1)

if __name__ == '__main__':
    run()
