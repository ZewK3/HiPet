@echo off
REM HiPet Cloudflare Setup Script for Windows
REM This script sets up D1 database and R2 bucket for the HiPet project

echo 🐾 Setting up HiPet Cloudflare infrastructure...

REM Check if wrangler is installed
wrangler --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Wrangler CLI is not installed. Please install it first:
    echo npm install -g wrangler
    pause
    exit /b 1
)

REM Check if logged in
wrangler whoami >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  Please login to Cloudflare first:
    echo wrangler login
    pause
    exit /b 1
)

echo ✅ Wrangler CLI is ready

REM Create D1 database
echo.
echo 📊 Creating D1 database...
wrangler d1 create hipet-db > temp_db_output.txt 2>&1
type temp_db_output.txt

REM Note: Windows batch is limited in text processing
REM You'll need to manually update the database_id in wrangler.toml
echo.
echo ⚠️  Please copy the database_id from above and update wrangler.toml manually

REM Create R2 bucket
echo.
echo 📁 Creating R2 bucket...
wrangler r2 bucket create hipet-files
if %errorlevel% equ 0 (
    echo ✅ R2 bucket 'hipet-files' created successfully
) else (
    echo ❌ Failed to create R2 bucket
    pause
    exit /b 1
)

REM Create KV namespace
echo.
echo 🗃️  Creating KV namespace...
wrangler kv:namespace create "CACHE" > temp_kv_output.txt 2>&1
type temp_kv_output.txt

wrangler kv:namespace create "CACHE" --preview > temp_kv_preview_output.txt 2>&1
type temp_kv_preview_output.txt

echo ⚠️  Please copy the KV namespace IDs from above and update wrangler.toml manually

REM Initialize database schema
echo.
echo 🏗️  Initializing database schema...
wrangler d1 execute hipet-db --file=schema.sql
if %errorlevel% equ 0 (
    echo ✅ Database schema initialized
) else (
    echo ❌ Failed to initialize database schema
    pause
    exit /b 1
)

REM Set up JWT secret
echo.
echo 🔐 Setting up JWT secret...
set /p JWT_SECRET=Please enter a secure JWT secret (or press Enter to use default): 
if "%JWT_SECRET%"=="" set JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

echo %JWT_SECRET% | wrangler secret put JWT_SECRET

REM Deploy worker
echo.
echo 🚀 Deploying worker...
wrangler publish
if %errorlevel% equ 0 (
    echo ✅ Worker deployed successfully
) else (
    echo ❌ Failed to deploy worker
    pause
    exit /b 1
)

REM Cleanup temp files
del temp_db_output.txt 2>nul
del temp_kv_output.txt 2>nul
del temp_kv_preview_output.txt 2>nul

echo.
echo 🎉 Setup completed successfully!
echo.
echo 📋 Configuration summary:
echo - D1 Database: hipet-db (check output above for ID)
echo - R2 Bucket: hipet-files
echo - KV Namespace: CACHE (check output above for ID)
echo.
echo 📝 Next steps:
echo 1. Manually update database_id and KV namespace IDs in wrangler.toml
echo 2. Update your frontend API_BASE URL with the worker URL
echo 3. Test the API endpoints
echo 4. Configure a custom domain for R2 bucket (optional)
echo.
echo Happy coding! 🐾

pause
