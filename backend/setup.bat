@echo off
REM Backend setup script for MSME Campaign Central (Windows)

echo 🚀 Setting up FastAPI Backend for MSME Campaign Central

REM Navigate to backend directory
cd backend

REM Create virtual environment
echo 📦 Creating Python virtual environment...
python -m venv venv

REM Activate virtual environment
echo 🔧 Activating virtual environment...
call venv\Scripts\activate.bat

REM Install dependencies
echo 📥 Installing Python dependencies...
python -m pip install --upgrade pip
pip install -r requirements.txt

REM Copy environment file
echo ⚙️ Setting up environment variables...
if not exist .env (
    copy .env.example .env
    echo ✅ Created .env file from template
    echo ❗ Please edit .env file with your actual values before running the server
) else (
    echo ✅ .env file already exists
)

echo.
echo 🎉 Backend setup complete!
echo.
echo Next steps:
echo 1. Edit backend\.env with your database and API keys
echo 2. Start the backend server: npm run backend:dev
echo 3. View API docs at: http://localhost:8000/docs
echo.
echo Backend endpoints:
echo • Health check: http://localhost:8000/health
echo • API docs: http://localhost:8000/docs
echo • ReDoc: http://localhost:8000/redoc

pause
