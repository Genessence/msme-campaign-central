#!/bin/bash
# Backend setup script for MSME Campaign Central

echo "🚀 Setting up FastAPI Backend for MSME Campaign Central"

# Create virtual environment
echo "📦 Creating Python virtual environment..."
cd backend
python -m venv venv

# Activate virtual environment (Windows)
echo "🔧 Activating virtual environment..."
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    source venv/Scripts/activate
else
    source venv/bin/activate
fi

# Install dependencies
echo "📥 Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Copy environment file
echo "⚙️ Setting up environment variables..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ Created .env file from template"
    echo "❗ Please edit .env file with your actual values before running the server"
else
    echo "✅ .env file already exists"
fi

echo ""
echo "🎉 Backend setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit backend/.env with your database and API keys"
echo "2. Start the backend server: npm run backend:dev"
echo "3. View API docs at: http://localhost:8000/docs"
echo ""
echo "Backend endpoints:"
echo "• Health check: http://localhost:8000/health"
echo "• API docs: http://localhost:8000/docs"
echo "• ReDoc: http://localhost:8000/redoc"
