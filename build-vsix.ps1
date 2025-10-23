# WinCC OA Projects Extension - Local VSIX Builder
# This script compiles and packages the extension into a VSIX file

param(
    [string]$OutputDir = ".",
    [switch]$Clean = $false,
    [switch]$Verbose = $false
)

# Set error action preference
$ErrorActionPreference = "Stop"

# Colors for output
$Green = "Green"
$Yellow = "Yellow"
$Red = "Red"
$Cyan = "Cyan"

function Write-Step {
    param([string]$Message)
    Write-Host "🔧 $Message" -ForegroundColor $Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor $Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠️ $Message" -ForegroundColor $Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor $Red
}

try {
    Write-Host "🚀 WinCC OA Projects Extension - VSIX Builder" -ForegroundColor $Cyan
    Write-Host "================================================" -ForegroundColor $Cyan
    Write-Host ""

    # Check if we're in the right directory
    if (!(Test-Path "package.json")) {
        throw "package.json not found. Please run this script from the extension root directory."
    }

    # Read package.json to get extension info
    $packageJson = Get-Content "package.json" | ConvertFrom-Json
    $extensionName = $packageJson.name
    $version = $packageJson.version
    $displayName = $packageJson.displayName

    Write-Step "Building extension: $displayName v$version"

    # Clean previous builds if requested
    if ($Clean) {
        Write-Step "Cleaning previous builds..."
        if (Test-Path "out") {
            Remove-Item "out" -Recurse -Force
            Write-Success "Cleaned 'out' directory"
        }
        if (Test-Path "*.vsix") {
            Remove-Item "*.vsix" -Force
            Write-Success "Removed old VSIX files"
        }
    }

    # Check if Node.js is installed
    Write-Step "Checking Node.js installation..."
    try {
        $nodeVersion = node --version
        Write-Success "Node.js version: $nodeVersion"
    } catch {
        throw "Node.js is not installed or not in PATH. Please install Node.js first."
    }

    # Check if npm is available
    Write-Step "Checking npm installation..."
    try {
        $npmVersion = npm --version
        Write-Success "npm version: $npmVersion"
    } catch {
        throw "npm is not available. Please ensure npm is installed with Node.js."
    }

    # Install dependencies
    Write-Step "Installing dependencies..."
    if ($Verbose) {
        npm install
    } else {
        npm install --silent
    }
    Write-Success "Dependencies installed successfully"

    # Compile TypeScript
    Write-Step "Compiling TypeScript..."
    if ($Verbose) {
        npm run compile
    } else {
        npm run compile 2>$null
    }
    Write-Success "TypeScript compilation completed"

    # Check if vsce is installed globally
    Write-Step "Checking vsce installation..."
    try {
        $vsceVersion = vsce --version
        Write-Success "vsce version: $vsceVersion"
    } catch {
        Write-Warning "vsce not found globally. Installing vsce..."
        npm install -g @vscode/vsce
        Write-Success "vsce installed successfully"
    }

    # Package the extension
    Write-Step "Packaging extension..."
    $vsixFileName = "$extensionName-$version.vsix"
    
    if ($Verbose) {
        vsce package --out $OutputDir
    } else {
        vsce package --out $OutputDir 2>$null
    }

    # Verify VSIX file was created
    $vsixPath = Join-Path $OutputDir $vsixFileName
    if (Test-Path $vsixPath) {
        $vsixSize = (Get-Item $vsixPath).Length
        $vsixSizeKB = [math]::Round($vsixSize / 1KB, 2)
        
        Write-Success "VSIX file created successfully!"
        Write-Host ""
        Write-Host "📦 Extension Package Details:" -ForegroundColor $Cyan
        Write-Host "   Name: $displayName" -ForegroundColor White
        Write-Host "   Version: $version" -ForegroundColor White
        Write-Host "   File: $vsixPath" -ForegroundColor White
        Write-Host "   Size: $vsixSizeKB KB" -ForegroundColor White
        Write-Host ""
        
        # Show installation instructions
        Write-Host "🔧 Installation Instructions:" -ForegroundColor $Yellow
        Write-Host "   1. Open VS Code" -ForegroundColor White
        Write-Host "   2. Press Ctrl+Shift+P" -ForegroundColor White
        Write-Host "   3. Type 'Extensions: Install from VSIX'" -ForegroundColor White
        Write-Host "   4. Select the file: $vsixPath" -ForegroundColor White
        Write-Host ""
        
        # Show file location in explorer
        Write-Host "📁 Opening file location..." -ForegroundColor $Cyan
        Start-Process "explorer.exe" -ArgumentList "/select,`"$vsixPath`""
        
    } else {
        throw "VSIX file was not created. Check the build output for errors."
    }

} catch {
    Write-Error "Build failed: $($_.Exception.Message)"
    exit 1
}

Write-Success "Build completed successfully! 🎉"