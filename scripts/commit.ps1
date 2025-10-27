#Requires -Version 5.1

<#
.SYNOPSIS
    Conventional Commit Helper for WinCC OA Projects
    
.DESCRIPTION
    This script helps create conventional commits that will be properly parsed
    by standard-version for automatic changelog generation and semantic versioning.
    
.PARAMETER Type
    The type of commit (feat, fix, docs, etc.)
    
.PARAMETER Scope
    Optional scope of the commit (ui, api, docs, etc.)
    
.PARAMETER Description
    Brief description of the change
    
.PARAMETER Body
    Optional detailed description of the change
    
.PARAMETER Footer
    Optional footer (breaking changes, issue references, etc.)
    
.PARAMETER DryRun
    Show what would be committed without actually committing
    
.EXAMPLE
    .\commit.ps1
    Interactive mode - prompts for all fields
    
.EXAMPLE
    .\commit.ps1 -Type feat -Scope ui -Description "Add new project tree icons"
    Direct mode with parameters
#>

[CmdletBinding()]
param(
    [Parameter()]
    [ValidateSet('feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'build', 'ci', 'chore')]
    [string]$Type,
    
    [Parameter()]
    [string]$Scope,
    
    [Parameter()]
    [string]$Description,
    
    [Parameter()]
    [string]$Body,
    
    [Parameter()]
    [string]$Footer,
    
    [Parameter()]
    [switch]$DryRun
)

# Define commit types with descriptions and emojis
$commitTypes = @{
    'feat'     = @{ emoji = '🚀'; description = 'A new feature' }
    'fix'      = @{ emoji = '🐛'; description = 'A bug fix' }
    'docs'     = @{ emoji = '📚'; description = 'Documentation only changes' }
    'style'    = @{ emoji = '💄'; description = 'Changes that do not affect the meaning of the code' }
    'refactor' = @{ emoji = '♻️'; description = 'A code change that neither fixes a bug nor adds a feature' }
    'perf'     = @{ emoji = '⚡'; description = 'A code change that improves performance' }
    'test'     = @{ emoji = '🧪'; description = 'Adding missing tests or correcting existing tests' }
    'build'    = @{ emoji = '🔧'; description = 'Changes that affect the build system or external dependencies' }
    'ci'       = @{ emoji = '👷'; description = 'Changes to CI configuration files and scripts' }
    'chore'    = @{ emoji = '🔨'; description = 'Other changes that don''t modify src or test files' }
}

function Write-Header {
    Write-Host "`n🚀 WinCC OA Projects - Conventional Commit Helper" -ForegroundColor Cyan
    Write-Host "==============================================" -ForegroundColor Cyan
    Write-Host ""
}

function Show-CommitTypes {
    Write-Host "Available commit types:" -ForegroundColor Yellow
    foreach ($key in $commitTypes.Keys | Sort-Object) {
        $type = $commitTypes[$key]
        Write-Host "  $($type.emoji) $key".PadRight(12) -NoNewline -ForegroundColor Green
        Write-Host "- $($type.description)" -ForegroundColor Gray
    }
    Write-Host ""
}

function Get-UserInput {
    param(
        [string]$Prompt,
        [string]$Default = "",
        [bool]$Required = $false,
        [string[]]$ValidValues = @()
    )
    
    do {
        if ($Default) {
            $input = Read-Host "$Prompt [$Default]"
            if (-not $input) { $input = $Default }
        } else {
            $input = Read-Host $Prompt
        }
        
        if ($Required -and -not $input) {
            Write-Host "❌ This field is required." -ForegroundColor Red
            continue
        }
        
        if ($ValidValues.Count -gt 0 -and $input -and $input -notin $ValidValues) {
            Write-Host "❌ Invalid value. Must be one of: $($ValidValues -join ', ')" -ForegroundColor Red
            continue
        }
        
        break
    } while ($true)
    
    return $input
}

function Build-CommitMessage {
    param(
        [string]$Type,
        [string]$Scope,
        [string]$Description,
        [string]$Body,
        [string]$Footer
    )
    
    $message = if ($Scope) { "$Type($Scope): $Description" } else { "$Type: $Description" }
    
    if ($Body) {
        $message += "`n`n$Body"
    }
    
    if ($Footer) {
        $message += "`n`n$Footer"
    }
    
    return $message
}

function Show-CommitPreview {
    param([string]$Message)
    
    Write-Host "`n📝 Commit message preview:" -ForegroundColor Yellow
    Write-Host "=========================" -ForegroundColor Yellow
    Write-Host $Message -ForegroundColor White
    Write-Host "=========================" -ForegroundColor Yellow
    Write-Host ""
}

function Test-GitRepository {
    try {
        git rev-parse --git-dir 2>$null | Out-Null
        return $true
    } catch {
        return $false
    }
}

function Get-GitStatus {
    $status = git status --porcelain 2>$null
    return $status
}

# Main execution
try {
    Write-Header
    
    # Check if we're in a git repository
    if (-not (Test-GitRepository)) {
        Write-Host "❌ Not a git repository. Please run this script from within the project directory." -ForegroundColor Red
        exit 1
    }
    
    # Check if there are changes to commit
    $gitStatus = Get-GitStatus
    if (-not $gitStatus) {
        Write-Host "ℹ️ No changes detected. Make sure you have modified files to commit." -ForegroundColor Yellow
        Write-Host ""
        git status
        
        $continue = Get-UserInput -Prompt "Continue anyway? (y/N)" -Default "N"
        if ($continue -notin @('y', 'Y', 'yes', 'Yes')) {
            Write-Host "❌ Commit cancelled." -ForegroundColor Red
            exit 0
        }
    }
    
    # Interactive mode if parameters not provided
    if (-not $Type) {
        Show-CommitTypes
        $Type = Get-UserInput -Prompt "Enter commit type" -Required $true -ValidValues @($commitTypes.Keys)
    }
    
    if (-not $Scope) {
        $Scope = Get-UserInput -Prompt "Enter scope (optional, e.g., 'ui', 'api', 'extension')"
    }
    
    if (-not $Description) {
        $Description = Get-UserInput -Prompt "Enter commit description" -Required $true
    }
    
    if (-not $Body) {
        $Body = Get-UserInput -Prompt "Enter commit body (optional, detailed description)"
    }
    
    if (-not $Footer) {
        Write-Host "Footer examples: 'Fixes #123', 'BREAKING CHANGE: API changed', 'Closes #456'" -ForegroundColor Gray
        $Footer = Get-UserInput -Prompt "Enter footer (optional)"
    }
    
    # Build commit message
    $commitMessage = Build-CommitMessage -Type $Type -Scope $Scope -Description $Description -Body $Body -Footer $Footer
    
    # Show preview
    Show-CommitPreview -Message $commitMessage
    
    # Dry run check
    if ($DryRun) {
        Write-Host "🔍 Dry run mode - no commit will be created." -ForegroundColor Yellow
        exit 0
    }
    
    # Confirm commit
    $confirm = Get-UserInput -Prompt "Create this commit? (Y/n)" -Default "Y"
    
    if ($confirm -in @('y', 'Y', 'yes', 'Yes', '')) {
        # Stage all changes
        Write-Host "📦 Staging all changes..." -ForegroundColor Blue
        git add .
        
        # Create commit
        Write-Host "💾 Creating commit..." -ForegroundColor Blue
        git commit -m $commitMessage
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Commit created successfully!" -ForegroundColor Green
            
            # Show the created commit
            Write-Host "`n📊 Commit details:" -ForegroundColor Yellow
            git log -1 --oneline
            
            # Suggest next steps
            Write-Host "`n💡 Next steps:" -ForegroundColor Cyan
            Write-Host "  • Push changes: git push" -ForegroundColor Gray
            Write-Host "  • Create release: npm run release" -ForegroundColor Gray
            Write-Host "  • View changelog: cat CHANGELOG.md" -ForegroundColor Gray
        } else {
            Write-Host "❌ Failed to create commit." -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "❌ Commit cancelled." -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ An error occurred: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}