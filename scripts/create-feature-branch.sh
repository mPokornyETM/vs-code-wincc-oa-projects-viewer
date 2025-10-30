#!/bin/bash

# WinCC OA Projects Extension - Feature Branch Creator
# This script helps contributors create proper feature branches from main

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }

# Function to check if we're in the right directory
check_repository() {
    if [[ ! -f "package.json" ]] || ! grep -q "wincc-oa-projects" package.json; then
        print_error "Not in WinCC OA Projects extension directory"
        print_info "Please run this script from the root of the extension project"
        exit 1
    fi
}

# Function to check if upstream remote exists
check_upstream() {
    if ! git remote get-url upstream > /dev/null 2>&1; then
        print_warning "Upstream remote not configured"
        print_info "Adding upstream remote..."
        git remote add upstream https://github.com/mPokornyETM/vs-code-wincc-oa-projects-viewer.git
        print_success "Upstream remote added"
    else
        print_success "Upstream remote configured"
    fi
}

# Function to sync with upstream main
sync_main() {
    print_info "Syncing with upstream main..."
    
    # Stash any uncommitted changes
    if ! git diff-index --quiet HEAD --; then
        print_warning "Uncommitted changes detected, stashing..."
        git stash push -m "Temporary stash before sync"
        STASHED=true
    fi
    
    # Switch to main and pull latest changes
    git checkout main
    git fetch upstream
    git merge upstream/main
    git push origin main
    
    print_success "Main branch synchronized with upstream"
    
    # Restore stashed changes if any
    if [[ "${STASHED:-false}" == "true" ]]; then
        print_info "Restoring stashed changes..."
        git stash pop
    fi
}

# Function to create feature branch
create_feature_branch() {
    local branch_name="$1"
    
    # Validate branch name
    if [[ -z "$branch_name" ]]; then
        print_error "Branch name is required"
        echo "Usage: $0 <branch-name>"
        echo ""
        echo "Examples:"
        echo "  $0 feature/project-search"
        echo "  $0 fix/config-parsing"
        echo "  $0 docs/api-examples"
        exit 1
    fi
    
    # Check if branch already exists
    if git show-ref --verify --quiet refs/heads/"$branch_name"; then
        print_error "Branch '$branch_name' already exists locally"
        print_info "Use a different name or delete the existing branch with:"
        print_info "git branch -d $branch_name"
        exit 1
    fi
    
    # Create and switch to new branch
    print_info "Creating feature branch: $branch_name"
    git checkout -b "$branch_name"
    print_success "Feature branch '$branch_name' created from main"
    
    # Show current status
    print_info "Current branch: $(git branch --show-current)"
    print_info "Ready for development!"
}

# Function to show usage instructions
show_usage() {
    echo "WinCC OA Projects Extension - Feature Branch Creator"
    echo ""
    echo "Usage: $0 <branch-name>"
    echo ""
    echo "Branch naming conventions:"
    echo "  feature/your-feature     - New features"
    echo "  fix/issue-description    - Bug fixes"
    echo "  docs/update-description  - Documentation updates"
    echo "  refactor/component-name  - Code refactoring"
    echo "  test/test-description    - Test additions"
    echo ""
    echo "Examples:"
    echo "  $0 feature/hierarchical-categories"
    echo "  $0 fix/memory-leak-issue"
    echo "  $0 docs/update-readme"
    echo ""
}

# Function to show development commands
show_dev_commands() {
    print_info "Development Commands:"
    echo ""
    echo "  npm install          # Install dependencies"
    echo "  npm run watch        # Watch for changes"
    echo "  npm test             # Run tests"
    echo "  npm run compile      # Compile TypeScript"
    echo "  npm run lint         # Check code style"
    echo ""
    print_info "Press F5 in VS Code to launch Extension Development Host"
}

# Main script execution
main() {
    print_info "WinCC OA Projects Extension - Feature Branch Setup"
    echo ""
    
    # Check if help requested
    if [[ "$1" == "--help" ]] || [[ "$1" == "-h" ]]; then
        show_usage
        exit 0
    fi
    
    # Validate environment
    check_repository
    
    # Check if git is available
    if ! command -v git &> /dev/null; then
        print_error "Git is not installed or not in PATH"
        exit 1
    fi
    
    # Configure upstream remote
    check_upstream
    
    # Sync with upstream main
    sync_main
    
    # Create feature branch
    create_feature_branch "$1"
    
    # Show next steps
    echo ""
    print_success "Setup complete! Next steps:"
    show_dev_commands
    
    echo ""
    print_info "When ready to contribute:"
    echo "  1. Make your changes"
    echo "  2. git add ."
    echo "  3. git commit -m 'feat: your change description'"
    echo "  4. git push origin $1"
    echo "  5. Create pull request on GitHub"
}

# Run main function with all arguments
main "$@"