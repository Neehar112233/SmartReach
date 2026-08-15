@echo off
echo =======================================================
echo          Starting SmartReach AI Platform
echo =======================================================

echo [1/2] Starting FastAPI Backend on http://localhost:8000...
start cmd /k "cd backend && call venv\Scripts\activate && uvicorn app.main:app --reload --port 8000"

echo [2/2] Starting React Frontend on http://localhost:5173...
start cmd /k "cd frontend && npm run dev"

echo.
echo All services launched!
echo Web Application: http://localhost:5173
echo API Swagger Docs: http://localhost:8000/api/docs
echo =======================================================
