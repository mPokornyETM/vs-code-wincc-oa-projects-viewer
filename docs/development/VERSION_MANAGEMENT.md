# Version Management Guide

This guide explains how to properly manage versions for the WinCC OA Projects extension to avoid mismatches between GitHub releases and VS Code Marketplace.

## 🎯 The Problem

Version mismatches occur when:

- Pre-release versions from `develop` branch interfere with stable releases
- GitHub releases and VS Code Marketplace get out of sync
- Automated version bumping creates inconsistencies

## 🔧 Solution: Centralized Version Management

### **Step 1: Check Current Status**

Before making any changes, always check the current version status:

```bash
npm run version:check
```

This shows:

- Current `package.json` version
- Whether it's a pre-release version
- Git tag history
- Uncommitted changes

### **Step 2: Set Version (Choose One Method)**

#### **Method A: Semantic Increment (Recommended)**

```bash
# For bug fixes
npm run version:patch    # 2.0.0 -> 2.0.1

# For new features
npm run version:minor    # 2.0.0 -> 2.1.0

# For breaking changes
npm run version:major    # 2.0.0 -> 3.0.0
```

#### **Method B: Specific Version**

```bash
node scripts/version.js 2.5.0
```

### **Step 3: Commit Version Change**

```bash
git add package.json
git commit -m "chore: bump version to 2.1.0"
git push
```

### **Step 4: Let Automation Handle Release**

Once you push to `main`:

1. 🤖 GitHub Actions automatically creates release
2. 📦 Packages extension as VSIX
3. 🏪 Publishes to VS Code Marketplace (if `VSCE_PAT` configured)
4. 🏷️ Creates Git tag
5. 📝 Generates changelog

## 🛡️ Version Consistency Protection

The workflows now include automatic checks to ensure:

### **GitHub Release Workflow** (`main` branch):

- ✅ Validates version format (X.Y.Z only)
- ✅ Cleans pre-release identifiers
- ✅ Ensures consistent tagging
- ✅ Publishes exact version to marketplace

### **Pre-Release Workflow** (`develop` branch):

- 🧪 Creates timestamped pre-releases: `2.1.0-alpha.20251105.abc123`
- 🔒 Never interferes with stable versions
- 📋 Marked as "pre-release" on GitHub

## 📋 Best Practices

### **DO:**

✅ Always use `npm run version:check` first
✅ Use semantic versioning (X.Y.Z)
✅ Commit version changes before pushing
✅ Let GitHub Actions handle releases
✅ Test pre-releases from `develop` branch

### **DON'T:**

❌ Manually edit version in workflows
❌ Create releases with pre-release versions
❌ Skip version validation checks
❌ Mix pre-release and stable versions

## 🔄 Complete Workflow Example

```bash
# 1. Check current status
npm run version:check

# 2. Update version (choose appropriate increment)
npm run version:minor    # 2.0.0 -> 2.1.0

# 3. Commit and push
git add package.json
git commit -m "chore: bump version to 2.1.0"
git push origin main

# 4. Wait for automation
# GitHub Actions will:
# - Run tests
# - Create GitHub release v2.1.0
# - Publish to VS Code Marketplace
# - Generate changelog
```

## 🧪 Pre-Release Testing

For testing new features before stable release:

```bash
# 1. Work on develop branch
git checkout develop

# 2. Make your changes
# ... code changes ...

# 3. Push to develop
git push origin develop

# 4. Automatic pre-release created
# Creates: 2.1.0-alpha.20251105.abc123
```

## 🚨 Troubleshooting

### **Version Mismatch Issues:**

```bash
# Check what's different
npm run version:check

# If pre-release version exists, clean it:
node scripts/version.js 2.1.0  # Set clean version
git add package.json
git commit -m "chore: clean version for stable release"
```

### **Marketplace Sync Issues:**

- Verify `VSCE_PAT` secret is configured
- Check workflow logs for publishing errors
- Ensure version follows semantic versioning

### **Git Tag Issues:**

```bash
# Check existing tags
git tag --sort=-version:refname | head -10

# Delete problematic tag if needed
git tag -d v2.1.0
git push origin :refs/tags/v2.1.0
```

## 🎯 Single Source of Truth

**The `package.json` version is the authoritative source.** All other version references (Git tags, GitHub releases, VS Code Marketplace) are derived from this.

This approach ensures:

- 🎯 Consistent versions everywhere
- 🤖 Automated release process
- 🧪 Safe pre-release testing
- 🛡️ Error prevention and validation
