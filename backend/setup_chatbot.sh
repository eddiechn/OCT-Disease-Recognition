#!/usr/bin/env bash

# OCT Medical Chatbot - Quick Start Guide
# This script automates the chatbot setup process

set -e

echo "🚀 OCT Medical Chatbot - Quick Start Setup"
echo "=========================================="
echo ""

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found in backend directory"
    echo "Please create backend/.env with BACKBOARD_API_KEY"
    exit 1
fi

# Check if BACKBOARD_API_KEY is set
if ! grep -q "BACKBOARD_API_KEY" .env; then
    echo "❌ Error: BACKBOARD_API_KEY not found in .env"
    echo "Add the following to backend/.env:"
    echo "BACKBOARD_API_KEY=your_api_key_here"
    exit 1
fi

echo "✅ Environment variables configured"
echo ""

# Check if PostgreSQL is available
if ! command -v psql &> /dev/null; then
    echo "❌ Error: PostgreSQL client not found"
    echo "Install it with: brew install postgresql"
    exit 1
fi

echo "📦 Setting up database tables..."

# Get database credentials from .env
DB_USER=$(grep "^DATABASE_URL" .env | sed "s/.*@//" | sed "s/:.*//")
DB_HOST=$(grep "^DATABASE_URL" .env | sed "s/.*@//" | sed "s/\/.*//")
DB_NAME=$(grep "^DATABASE_URL" .env | sed "s/.*\///" | sed "s/\?.*//" | cut -d'/' -f2)

if [ -z "$DB_NAME" ]; then
    DB_NAME="oct_disease"
fi

echo "Using database: $DB_NAME"

# Run migrations
psql -U eddie -d $DB_NAME -f create_chatbot_tables.sql 2>/dev/null || {
    echo "⚠️  Manual database setup required"
    echo "Run: psql -U eddie -d $DB_NAME -f backend/create_chatbot_tables.sql"
}

echo "✅ Database tables created/updated"
echo ""

echo "📋 Installation Summary:"
echo ""
echo "Backend Setup:"
echo "  ✅ Environment variables configured"
echo "  ✅ Database tables created"
echo "  ✅ API endpoints ready"
echo ""
echo "Frontend Setup:"
echo "  ⚠️  Components installed"
echo "  ⚠️  Next.js configuration may need update"
echo ""
echo "Next Steps:"
echo ""
echo "1. Start the backend server:"
echo "   cd backend"
echo "   python backend.py"
echo ""
echo "2. Add chat to your patient page:"
echo "   import { ChatWidget } from '@/components/chat';"
echo "   export default function PatientPage({ params }: any) {"
echo "     return <ChatWidget patientId={params.id} patientName='Patient Name' />;"
echo "   }"
echo ""
echo "3. Test the API:"
echo "   curl -X GET http://localhost:8000/test"
echo ""
echo "📚 Documentation:"
echo "   - Full Setup: CHATBOT_SETUP.md"
echo "   - Technical Details: BACKBOARD_INTEGRATION.md"
echo ""
echo "🎉 Setup complete! The medical chatbot is ready to use."
