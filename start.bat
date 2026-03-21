@echo off
echo Starting Internet of Agents...

:: Check if node_modules exists, if not, install dependencies first
IF NOT EXIST "node_modules\" (
    echo node_modules not found. Installing dependencies...
    cmd /c npm install
)

echo Attempting to start the application...
:: Try to run the project
cmd /c npm run dev

:: If the above command fails (e.g. errorlevel != 0), try completely reinstalling
IF %ERRORLEVEL% NEQ 0 (
    echo.
    echo Application crashed or failed to start. It might be due to missing dependencies.
    echo Running a clean 'npm install' to fix dependencies...
    cmd /c npm install
    
    echo Retrying application start...
    cmd /c npm run dev
)

pause
