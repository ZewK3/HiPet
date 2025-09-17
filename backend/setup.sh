#!/bin/bash

# HiPet Cloudflare Setup Script
# This script sets up D1 database and R2 bucket for the HiPet project

echo "🐾 Setting up HiPet Cloudflare infrastructure..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo -e "${RED}❌ Wrangler CLI is not installed. Please install it first:${NC}"
    echo "npm install -g wrangler"
    exit 1
fi

# Check if logged in
if ! wrangler whoami &> /dev/null; then
    echo -e "${YELLOW}⚠️  Please login to Cloudflare first:${NC}"
    echo "wrangler login"
    exit 1
fi

echo -e "${GREEN}✅ Wrangler CLI is ready${NC}"

# Create D1 database
echo -e "\n${YELLOW}📊 Creating D1 database...${NC}"
DB_OUTPUT=$(wrangler d1 create hipet-db 2>&1)
echo "$DB_OUTPUT"

# Extract database ID from output
DB_ID=$(echo "$DB_OUTPUT" | grep "database_id" | cut -d'"' -f4)

if [ -z "$DB_ID" ]; then
    echo -e "${RED}❌ Failed to create D1 database${NC}"
    exit 1
fi

echo -e "${GREEN}✅ D1 database created with ID: $DB_ID${NC}"

# Create R2 bucket
echo -e "\n${YELLOW}📁 Creating R2 bucket...${NC}"
if wrangler r2 bucket create hipet-files; then
    echo -e "${GREEN}✅ R2 bucket 'hipet-files' created successfully${NC}"
else
    echo -e "${RED}❌ Failed to create R2 bucket${NC}"
    exit 1
fi

# Create KV namespace for caching
echo -e "\n${YELLOW}🗃️  Creating KV namespace...${NC}"
KV_OUTPUT=$(wrangler kv:namespace create "CACHE" 2>&1)
echo "$KV_OUTPUT"

KV_ID=$(echo "$KV_OUTPUT" | grep "id" | cut -d'"' -f4)

if [ -z "$KV_ID" ]; then
    echo -e "${RED}❌ Failed to create KV namespace${NC}"
else
    echo -e "${GREEN}✅ KV namespace created with ID: $KV_ID${NC}"
fi

# Create preview KV namespace
KV_PREVIEW_OUTPUT=$(wrangler kv:namespace create "CACHE" --preview 2>&1)
echo "$KV_PREVIEW_OUTPUT"

KV_PREVIEW_ID=$(echo "$KV_PREVIEW_OUTPUT" | grep "preview_id" | cut -d'"' -f4)

# Update wrangler.toml with actual IDs
echo -e "\n${YELLOW}📝 Updating wrangler.toml...${NC}"

# Backup original wrangler.toml
cp wrangler.toml wrangler.toml.backup

# Update wrangler.toml with real database ID
sed -i.bak "s/database_id = \"your-database-id-here\"/database_id = \"$DB_ID\"/" wrangler.toml

if [ ! -z "$KV_ID" ]; then
    sed -i.bak "s/id = \"your-kv-namespace-id\"/id = \"$KV_ID\"/" wrangler.toml
fi

if [ ! -z "$KV_PREVIEW_ID" ]; then
    sed -i.bak "s/preview_id = \"your-preview-kv-namespace-id\"/preview_id = \"$KV_PREVIEW_ID\"/" wrangler.toml
fi

# Remove backup files
rm -f wrangler.toml.bak

echo -e "${GREEN}✅ wrangler.toml updated${NC}"

# Initialize database with schema
echo -e "\n${YELLOW}🏗️  Initializing database schema...${NC}"
if wrangler d1 execute hipet-db --file=schema.sql; then
    echo -e "${GREEN}✅ Database schema initialized${NC}"
else
    echo -e "${RED}❌ Failed to initialize database schema${NC}"
    exit 1
fi

# Set up secrets
echo -e "\n${YELLOW}🔐 Setting up secrets...${NC}"
echo "Please enter a secure JWT secret (leave empty to generate one):"
read JWT_SECRET

if [ -z "$JWT_SECRET" ]; then
    JWT_SECRET=$(openssl rand -base64 32)
    echo "Generated JWT secret: $JWT_SECRET"
fi

echo "$JWT_SECRET" | wrangler secret put JWT_SECRET

# Deploy the worker
echo -e "\n${YELLOW}🚀 Deploying worker...${NC}"
if wrangler publish; then
    echo -e "${GREEN}✅ Worker deployed successfully${NC}"
else
    echo -e "${RED}❌ Failed to deploy worker${NC}"
    exit 1
fi

# Show final information
echo -e "\n${GREEN}🎉 Setup completed successfully!${NC}"
echo -e "\n${YELLOW}📋 Configuration summary:${NC}"
echo "D1 Database ID: $DB_ID"
echo "R2 Bucket: hipet-files"
if [ ! -z "$KV_ID" ]; then
    echo "KV Namespace ID: $KV_ID"
fi
echo ""
echo -e "${YELLOW}🔗 Your worker is available at:${NC}"
wrangler whoami 2>/dev/null | grep "account" | cut -d'"' -f4 | xargs -I {} echo "https://hipet-backend.{}.workers.dev"

echo -e "\n${YELLOW}📝 Next steps:${NC}"
echo "1. Update your frontend API_BASE URL with the worker URL above"
echo "2. Test the API endpoints"
echo "3. Configure a custom domain for R2 bucket (optional)"
echo "4. Set up monitoring and analytics"

echo -e "\n${GREEN}Happy coding! 🐾${NC}"
