#!/bin/bash

# Conventional Commit Helper Script
# This script helps you create conventional commits for better changelog generation

echo "🚀 WinCC OA Projects - Conventional Commit Helper"
echo "=============================================="
echo ""

# Define commit types
declare -A commit_types
commit_types[feat]="🚀 feat     - A new feature"
commit_types[fix]="🐛 fix      - A bug fix"
commit_types[docs]="📚 docs     - Documentation only changes"
commit_types[style]="💄 style    - Changes that do not affect the meaning of the code"
commit_types[refactor]="♻️ refactor - A code change that neither fixes a bug nor adds a feature"
commit_types[perf]="⚡ perf     - A code change that improves performance"
commit_types[test]="🧪 test     - Adding missing tests or correcting existing tests"
commit_types[build]="🔧 build    - Changes that affect the build system or external dependencies"
commit_types[ci]="👷 ci       - Changes to CI configuration files and scripts"
commit_types[chore]="🔨 chore    - Other changes that don't modify src or test files"

echo "Available commit types:"
for key in "${!commit_types[@]}"; do
    echo "  ${commit_types[$key]}"
done
echo ""

# Get commit type
read -p "Enter commit type: " type
if [[ ! ${commit_types[$type]} ]]; then
    echo "❌ Invalid commit type. Please use one of the types listed above."
    exit 1
fi

# Get scope (optional)
read -p "Enter scope (optional, e.g., 'ui', 'api', 'docs'): " scope

# Get description
read -p "Enter commit description: " description
if [[ -z "$description" ]]; then
    echo "❌ Description is required."
    exit 1
fi

# Get body (optional)
read -p "Enter commit body (optional, press Enter to skip): " body

# Get footer (optional)
read -p "Enter footer (optional, e.g., 'Fixes #123', press Enter to skip): " footer

# Build commit message
if [[ -n "$scope" ]]; then
    commit_message="$type($scope): $description"
else
    commit_message="$type: $description"
fi

if [[ -n "$body" ]]; then
    commit_message="$commit_message"$'\n\n'"$body"
fi

if [[ -n "$footer" ]]; then
    commit_message="$commit_message"$'\n\n'"$footer"
fi

# Show preview
echo ""
echo "📝 Commit message preview:"
echo "========================="
echo "$commit_message"
echo "========================="
echo ""

# Confirm
read -p "Create this commit? (y/N): " confirm
if [[ $confirm =~ ^[Yy]$ ]]; then
    git add .
    git commit -m "$commit_message"
    echo "✅ Commit created successfully!"
else
    echo "❌ Commit cancelled."
fi