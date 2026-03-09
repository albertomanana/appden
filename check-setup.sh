#!/bin/bash

echo "🔍 Checking The Appden setup..."
echo ""

# Check .env.local
if [ ! -f ".env.local" ]; then
    echo "❌ .env.local not found!"
    echo ""
    echo "📝 Creating .env.local from .env.example..."
    cp .env.example .env.local
    echo ""
    echo "⚠️  Please edit .env.local with your Supabase credentials:"
    echo "   VITE_SUPABASE_URL=https://your-project.supabase.co"
    echo "   VITE_SUPABASE_ANON_KEY=your-anon-key"
    echo ""
    echo "Get your credentials from: https://supabase.com"
    exit 1
fi

# Check if env vars are set
if grep -q "your-project-id" .env.local; then
    echo "❌ .env.local still has placeholder values!"
    echo ""
    echo "📝 Edit .env.local and replace:"
    echo "   - https://your-project-id.supabase.co with your actual URL"
    echo "   - your-anon-key-here with your actual key"
    echo ""
    exit 1
fi

echo "✅ .env.local configured"
echo "✅ Dependencies installed"
echo ""
echo "🚀 Starting dev server..."
echo ""
echo "If you see a loading screen after opening http://localhost:5173:"
echo "1. Check your browser console (F12 → Console tab)"
echo "2. Look for the 🔐 emoji - it shows connection status"
echo "3. If it times out after 15s, your credentials are wrong"
echo ""
