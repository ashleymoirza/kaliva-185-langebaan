#!/usr/bin/env bash
# Database initialization script
# Runs on first container startup to create databases and users

set -euo pipefail

# Wait for PostgreSQL to be ready
until pg_isready -U postgres -h localhost; do
    echo "Waiting for PostgreSQL..."
    sleep 2
done

# Create databases and user
psql -U postgres <<-EOSQL
    -- Create user if not exists
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'kaliva') THEN
            CREATE ROLE kaliva WITH LOGIN PASSWORD '${POSTGRES_PASSWORD}';
        END IF;
    END
    \$\$;

    -- Create staging database
    SELECT 'CREATE DATABASE kaliva185_staging OWNER kaliva'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'kaliva185_staging')\gexec

    -- Create production database
    SELECT 'CREATE DATABASE kaliva185_prod OWNER kaliva'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'kaliva185_prod')\gexec

    -- Grant privileges
    GRANT ALL PRIVILEGES ON DATABASE kaliva185_staging TO kaliva;
    GRANT ALL PRIVILEGES ON DATABASE kaliva185_prod TO kaliva;

    -- Enable extensions
    \c kaliva185_staging
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";

    \c kaliva185_prod
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";
EOSQL

echo "Database initialization complete"