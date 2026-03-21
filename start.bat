@echo off
echo Starting Internet of Agents...

IF NOT EXIST "node_modules\" (
    echo node_modules not found. Installing dependencies...
    cmd /c npm install
)

echo Cleaning up old processes...
FOR /F "tokens=5" %%P IN ('netstat -a -n -o ^| findstr :3001') DO TaskKill.exe /F /PID %%P >nul 2>&1
FOR /F "tokens=5" %%P IN ('netstat -a -n -o ^| findstr :5173') DO TaskKill.exe /F /PID %%P >nul 2>&1
FOR /F "tokens=5" %%P IN ('netstat -a -n -o ^| findstr :8545') DO TaskKill.exe /F /PID %%P >nul 2>&1

echo Starting local blockchain...
start "Blockchain Node" cmd /k "npm run node --workspace=contracts"

echo Waiting for blockchain to initialize...
timeout /t 5 /nobreak >nul

echo Deploying smart contracts...
cmd /c "npm run deploy:local --workspace=contracts"

echo Starting backend and frontend...
start "Backend" cmd /k "npm run dev --workspace=backend"
start "Frontend" cmd /k "npm run dev --workspace=frontend"

