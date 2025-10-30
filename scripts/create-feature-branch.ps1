# WinCC OA Projects Extension - Feature Branch Creator (PowerShell)
# This script helps contributors create proper feature branches from main

param(
    [Parameter(Mandatory=$false)]
    [string]$BranchName,
    
    [Parameter(Mandatory=$false)]
    [switch]$Help
)

# Colors for output
$Colors = @{
    Red = "Red"
    Green = "Green" 
    Yellow = "Yellow"
    Blue = "Cyan"
    White = "White"
}

# Functions for colored output
function Write-Info { 
    param([string]$Message)
    Write-Host "ℹ️  $Message" -ForegroundColor $Colors.Blue
}

function Write-Success { 
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor $Colors.Green
}

function Write-Warning { 
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor $Colors.Yellow
}

function Write-Error { 
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor $Colors.Red
}

# Function to check if we're in the right directory
function Test-Repository {
    if (-not (Test-Path "package.json")) {
        Write-Error "Not in WinCC OA Projects extension directory"
        Write-Info "Please run this script from the root of the extension project"
        exit 1
    }
    
    $packageContent = Get-Content "package.json" -Raw
    if ($packageContent -notmatch "wincc-oa-projects") {
        Write-Error "Not in WinCC OA Projects extension directory"
        Write-Info "Please run this script from the root of the extension project"  
        exit 1
    }
}

# Function to check if upstream remote exists
function Test-Upstream {
    $upstreamUrl = ""
    try {
        $upstreamUrl = git remote get-url upstream 2>$null
    }
    catch {
        # Remote doesn't exist
    }
    
    if ([string]::IsNullOrEmpty($upstreamUrl)) {
        Write-Warning "Upstream remote not configured"
        Write-Info "Adding upstream remote..."
        git remote add upstream https://github.com/mPokornyETM/vs-code-wincc-oa-projects-viewer.git
        Write-Success "Upstream remote added"
    }
    else {
        Write-Success "Upstream remote configured"
    }
}

# Function to sync with upstream main
function Sync-Main {
    Write-Info "Syncing with upstream main..."
    
    # Check for uncommitted changes
    $gitStatus = git status --porcelain
    $stashed = $false
    
    if ($gitStatus) {
        Write-Warning "Uncommitted changes detected, stashing..."
        git stash push -m "Temporary stash before sync"
        $stashed = $true
    }
    
    # Switch to main and pull latest changes
    git checkout main
    git fetch upstream
    git merge upstream/main
    git push origin main
    
    Write-Success "Main branch synchronized with upstream"
    
    # Restore stashed changes if any
    if ($stashed) {
        Write-Info "Restoring stashed changes..."
        git stash pop
    }
}

# Function to create feature branch
function New-FeatureBranch {
    param([string]$BranchName)
    
    # Validate branch name
    if ([string]::IsNullOrEmpty($BranchName)) {
        Write-Error "Branch name is required"
        Write-Host ""
        Write-Host "Usage: .\create-feature-branch.ps1 <branch-name>"
        Write-Host ""
        Write-Host "Examples:"
        Write-Host "  .\create-feature-branch.ps1 feature/project-search"
        Write-Host "  .\create-feature-branch.ps1 fix/config-parsing"
        Write-Host "  .\create-feature-branch.ps1 docs/api-examples"
        exit 1
    }
    
    # Check if branch already exists
    $branchExists = git show-ref --verify --quiet refs/heads/$BranchName
    if ($LASTEXITCODE -eq 0) {
        Write-Error "Branch '$BranchName' already exists locally"
        Write-Info "Use a different name or delete the existing branch with:"
        Write-Info "git branch -d $BranchName"
        exit 1
    }
    
    # Create and switch to new branch
    Write-Info "Creating feature branch: $BranchName"
    git checkout -b $BranchName
    Write-Success "Feature branch '$BranchName' created from main"
    
    # Show current status
    $currentBranch = git branch --show-current
    Write-Info "Current branch: $currentBranch"
    Write-Info "Ready for development!"
}

# Function to show usage instructions
function Show-Usage {
    Write-Host "WinCC OA Projects Extension - Feature Branch Creator" -ForegroundColor $Colors.Blue
    Write-Host ""
    Write-Host "Usage: .\create-feature-branch.ps1 <branch-name>"
    Write-Host ""
    Write-Host "Branch naming conventions:"
    Write-Host "  feature/your-feature     - New features"
    Write-Host "  fix/issue-description    - Bug fixes"
    Write-Host "  docs/update-description  - Documentation updates"
    Write-Host "  refactor/component-name  - Code refactoring"
    Write-Host "  test/test-description    - Test additions"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  .\create-feature-branch.ps1 feature/hierarchical-categories"
    Write-Host "  .\create-feature-branch.ps1 fix/memory-leak-issue"
    Write-Host "  .\create-feature-branch.ps1 docs/update-readme"
    Write-Host ""
}

# Function to show development commands
function Show-DevCommands {
    Write-Info "Development Commands:"
    Write-Host ""
    Write-Host "  npm install          # Install dependencies"
    Write-Host "  npm run watch        # Watch for changes"
    Write-Host "  npm test             # Run tests"
    Write-Host "  npm run compile      # Compile TypeScript"
    Write-Host "  npm run lint         # Check code style"
    Write-Host ""
    Write-Info "Press F5 in VS Code to launch Extension Development Host"
}

# Main script execution
function Main {
    Write-Info "WinCC OA Projects Extension - Feature Branch Setup"
    Write-Host ""
    
    # Check if help requested
    if ($Help) {
        Show-Usage
        exit 0
    }
    
    # Validate environment
    Test-Repository
    
    # Check if git is available
    $gitVersion = ""
    try {
        $gitVersion = git --version
    }
    catch {
        Write-Error "Git is not installed or not in PATH"
        exit 1
    }
    
    # Configure upstream remote
    Test-Upstream
    
    # Sync with upstream main
    Sync-Main
    
    # Create feature branch
    New-FeatureBranch -BranchName $BranchName
    
    # Show next steps
    Write-Host ""
    Write-Success "Setup complete! Next steps:"
    Show-DevCommands
    
    Write-Host ""
    Write-Info "When ready to contribute:"
    Write-Host "  1. Make your changes"
    Write-Host "  2. git add ."
    Write-Host "  3. git commit -m 'feat: your change description'"
    Write-Host "  4. git push origin $BranchName"
    Write-Host "  5. Create pull request on GitHub"
}

# Run main function
Main