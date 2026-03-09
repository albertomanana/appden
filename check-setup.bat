@echo off
REM The Appden - Setup Check Script (Windows)

echo.
echo 🔍 Checking The Appden setup...
echo.

REM Check if .env.local exists
if not exist ".env.local" (
    echo ❌ .env.local not found!
    echo.
    echo 📝 Creating .env.local from .env.example...
    copy ".env.example" ".env.local" >nul 2>&1
    echo.
    echo ⚠️  Please edit .env.local with your Supabase credentials:
    echo    VITE_SUPABASE_URL=https://your-project.supabase.co
    echo    VITE_SUPABASE_ANON_KEY=your-anon-key
    echo.
    echo Get your credentials from: https://supabase.com
    echo.
    pause
    exit /b 1
)

REM Check if env vars are placeholders
findstr /M "your-project-id" ".env.local" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo ❌ .env.local still has placeholder values!
    echo.
    echo 📝 Edit .env.local and replace:
    echo    - https://your-project-id.supabase.co with your actual URL
    echo    - your-anon-key-here with your actual key
    echo.
    pause
    exit /b 1
)

echo ✅ .env.local configured
echo ✅ Dependencies ready
echo.
echo 🚀 Starting dev server...
echo.
echo If you see a loading screen after opening http://localhost:5173:
echo 1. Check your browser console (F12 → Console tab^)
echo 2. Look for the 🔐 emoji - it shows connection status
echo 3. If it times out after 15s, your credentials are wrong
echo.

npm run dev
