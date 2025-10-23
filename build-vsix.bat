@echo off
echo 🚀 WinCC OA Projects Extension - VSIX Builder
echo ================================================

REM Check if we're in the right directory
if not exist "package.json" (
    echo ❌ package.json not found. Please run this script from the extension root directory.
    pause
    exit /b 1
)

echo 🔧 Installing dependencies...
call npm install --silent

echo 🔧 Compiling TypeScript...
call npm run compile

echo 🔧 Installing vsce if needed...
call npm install -g @vscode/vsce

echo 🔧 Packaging extension...
call vsce package

echo ✅ VSIX file created successfully!
echo.
echo 📦 To install:
echo    1. Open VS Code
echo    2. Press Ctrl+Shift+P
echo    3. Type "Extensions: Install from VSIX"
echo    4. Select the .vsix file in this directory
echo.

REM Open file explorer to show the VSIX file
explorer .

pause