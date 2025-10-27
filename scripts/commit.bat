@echo off
setlocal enabledelayedexpansion

echo 🚀 WinCC OA Projects - Conventional Commit Helper
echo ==============================================
echo.

echo Available commit types:
echo   🚀 feat     - A new feature
echo   🐛 fix      - A bug fix
echo   📚 docs     - Documentation only changes
echo   💄 style    - Changes that do not affect the meaning of the code
echo   ♻️ refactor - A code change that neither fixes a bug nor adds a feature
echo   ⚡ perf     - A code change that improves performance
echo   🧪 test     - Adding missing tests or correcting existing tests
echo   🔧 build    - Changes that affect the build system or external dependencies
echo   👷 ci       - Changes to CI configuration files and scripts
echo   🔨 chore    - Other changes that don't modify src or test files
echo.

REM Get commit type
set /p type="Enter commit type: "
if "%type%"=="" (
    echo ❌ Commit type is required.
    pause
    exit /b 1
)

REM Get scope (optional)
set /p scope="Enter scope (optional, e.g., 'ui', 'api', 'docs'): "

REM Get description
set /p description="Enter commit description: "
if "%description%"=="" (
    echo ❌ Description is required.
    pause
    exit /b 1
)

REM Get body (optional)
set /p body="Enter commit body (optional, press Enter to skip): "

REM Get footer (optional)
set /p footer="Enter footer (optional, e.g., 'Fixes #123', press Enter to skip): "

REM Build commit message
if not "%scope%"=="" (
    set commit_message=%type%(%scope%): %description%
) else (
    set commit_message=%type%: %description%
)

REM Show preview
echo.
echo 📝 Commit message preview:
echo =========================
echo %commit_message%
if not "%body%"=="" echo %body%
if not "%footer%"=="" echo %footer%
echo =========================
echo.

REM Confirm
set /p confirm="Create this commit? (y/N): "
if /i "%confirm%"=="y" (
    git add .
    git commit -m "%commit_message%"
    echo ✅ Commit created successfully!
) else (
    echo ❌ Commit cancelled.
)

pause