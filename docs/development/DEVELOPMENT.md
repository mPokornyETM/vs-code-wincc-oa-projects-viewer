# Development Guide - Automated Releases

This document explains how to work with the automated changelog and release system for the WinCC OA Projects VS Code extension.

## 🚀 Overview

The project uses **pull request labels** and **standard-version** for:

- ✅ Automatic version bumping (semantic versioning)
- ✅ Automatic changelog generation
- ✅ Automatic GitHub releases with VSIX files
- ✅ Automatic VS Code Marketplace publishing
- 🏷️ **Label-based release control** - Version determined by PR labels

## 🏷️ Label-Based Release System

The release version is now determined by **pull request labels** instead of just commit messages. This provides more control and clarity over releases.

### Quick Guide

1. **Create PR** - Automatic labels are added based on branch name and content
2. **Review Labels** - Adjust labels if needed before merging
3. **Merge to Main** - Release is automatically created with correct version

### Label Types & Release Impact

| Label             | Version Bump              | Use For               |
| ----------------- | ------------------------- | --------------------- |
| `breaking-change` | **Major** (1.0.0 → 2.0.0) | API breaking changes  |
| `enhancement`     | **Minor** (1.0.0 → 1.1.0) | New features          |
| `bug`             | **Patch** (1.0.0 → 1.0.1) | Bug fixes             |
| `documentation`   | **Patch** (1.0.0 → 1.0.1) | Documentation updates |

**Full documentation**: See [LABEL_RELEASES.md](LABEL_RELEASES.md)

## 📋 Commit Convention (Still Recommended)

Use conventional commit format for better changelog generation:

```bash
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Commit Types

| Type       | Description              | Version Impact | Changelog Section           |
| ---------- | ------------------------ | -------------- | --------------------------- |
| `feat`     | A new feature            | Minor bump     | 🚀 Features                 |
| `fix`      | A bug fix                | Patch bump     | 🐛 Bug Fixes                |
| `docs`     | Documentation changes    | Patch bump     | 📚 Documentation            |
| `style`    | Code style changes       | Patch bump     | 💄 Code Style               |
| `refactor` | Code refactoring         | Patch bump     | ♻️ Code Refactoring         |
| `perf`     | Performance improvements | Patch bump     | ⚡ Performance Improvements |
| `test`     | Adding/updating tests    | Patch bump     | 🧪 Tests                    |
| `build`    | Build system changes     | Patch bump     | 🔧 Build System             |
| `ci`       | CI/CD changes            | Patch bump     | 👷 CI/CD                    |
| `chore`    | Maintenance tasks        | Patch bump     | 🔨 Maintenance              |

### Breaking Changes

For major version bumps, include `BREAKING CHANGE:` in the footer:

```
feat: new API for project management

BREAKING CHANGE: The getProjects() method now returns a Promise<WinCCOAProject[]> instead of WinCCOAProject[]
```

### Examples

```bash
# Feature addition (minor version bump)
feat(ui): add project tree icons

# Bug fix (patch version bump)
fix(parser): handle missing config files correctly

# Documentation update (patch version bump)
docs: update README with extension point examples

# Breaking change (major version bump)
feat(api): redesign project API

BREAKING CHANGE: All API methods are now async and return promises
```

## 🛠️ Helper Scripts

### PowerShell Helper (Recommended for Windows)

Use the interactive commit helper:

```powershell
.\scripts\commit.ps1
```

**Features:**

- Interactive prompts for all commit parts
- Validation of commit types
- Preview before committing
- Git status checking
- Dry-run mode

**Parameters:**

```powershell
# Direct mode
.\scripts\commit.ps1 -Type feat -Scope ui -Description "Add new icons"

# Dry run (preview only)
.\scripts\commit.ps1 -DryRun
```

### Batch Helper (Windows)

```cmd
.\scripts\commit.bat
```

### Manual Release Commands

```bash
# Automatic release (based on commits)
npm run release

# Force specific version bump
npm run release:patch   # 0.1.0 → 0.1.1
npm run release:minor   # 0.1.0 → 0.2.0
npm run release:major   # 0.1.0 → 1.0.0
```

## 🔄 Automated Workflows

### CI/CD Pipeline (`ci-cd.yml`)

**Triggers:** Push to `develop`, `feature/*` branches, PRs to `main`/`develop`

**Jobs:**

1. **Test** - Runs on Windows with Node.js 18.x and 20.x
    - Linting
    - TypeScript compilation
    - Unit tests
2. **Package** - Creates VSIX file as artifact

### Release Pipeline (`release.yml`)

**Triggers:**

- Push to `main`/`master` branch (automatic release)
- Manual workflow dispatch (choose version bump type)

**Jobs:**

1. **Test** - Same as CI/CD pipeline
2. **Release** - Creates version, changelog, and GitHub release
    - Bumps version using standard-version
    - Updates CHANGELOG.md
    - Creates git tag
    - Pushes changes
    - Creates GitHub release with VSIX
3. **Publish** - Publishes to VS Code Marketplace (if configured)

## 📝 Changelog Management

### Automatic Generation

The changelog is automatically generated from conventional commits:

```markdown
# Changelog

## [1.2.0](https://github.com/.../compare/v1.1.0...v1.2.0) (2025-01-27)

### 🚀 Features

- **ui**: add project tree icons ([abc1234](https://github.com/.../commit/abc1234))
- **api**: new project filtering options ([def5678](https://github.com/.../commit/def5678))

### 🐛 Bug Fixes

- **parser**: handle missing config files correctly ([ghi9012](https://github.com/.../commit/ghi9012))
```

### Manual Editing

You can manually edit `CHANGELOG.md` after generation if needed, but avoid modifying the structure.

## 🏷️ Version Management

### Semantic Versioning

The project follows [SemVer](https://semver.org/):

- **MAJOR** (1.0.0 → 2.0.0): Breaking changes
- **MINOR** (1.0.0 → 1.1.0): New features (backward compatible)
- **PATCH** (1.0.0 → 1.0.1): Bug fixes (backward compatible)

### Automatic Bumping

Version bumping is automatic based on commit types:

- `feat` → Minor bump
- `fix`, `docs`, `style`, etc. → Patch bump
- `BREAKING CHANGE` → Major bump

## 📦 Release Process

### Automatic Release (Recommended)

1. **Development:**

    ```bash
    # Make changes
    git checkout -b feature/new-feature
    # ... make changes ...
    .\scripts\commit.ps1  # Use helper for conventional commits
    git push origin feature/new-feature
    ```

2. **Pull Request:**
    - Create PR to `main` branch
    - CI/CD runs automatically
    - Review and merge

3. **Automatic Release:**
    - Push to `main` triggers release workflow
    - Version bumped automatically
    - Changelog updated
    - GitHub release created with VSIX
    - Marketplace publication (if configured)

### Manual Release

```bash
# Create release manually
npm run release

# Push the release
git push --follow-tags origin main
```

### Manual Workflow Dispatch

1. Go to GitHub Actions → Release workflow
2. Click "Run workflow"
3. Choose version bump type (patch/minor/major)
4. Run workflow

## 🔧 Configuration

### VS Code Marketplace Publishing

Add your Personal Access Token as a repository secret:

1. Create PAT at: https://dev.azure.com/
2. Add as repository secret: `VSCE_PAT`
3. Automatic publishing will work on releases

### Workflow Customization

Modify `.github/workflows/release.yml` to customize:

- Release triggers
- Changelog format
- Release notes template
- Marketplace publishing behavior

## 🎯 Best Practices

### Commit Messages

✅ **Good:**

```
feat(ui): add drag and drop support for projects
fix(parser): handle empty configuration files
docs: update installation instructions
```

❌ **Bad:**

```
added new feature
bug fix
update docs
```

### Branch Strategy

- `main`/`master` - Production releases
- `develop` - Development integration
- `feature/*` - New features
- `fix/*` - Bug fixes

### Release Strategy

- **Patch releases** - Weekly for bug fixes
- **Minor releases** - Monthly for new features
- **Major releases** - Quarterly for breaking changes

### Pre-release Testing

1. Test feature branches thoroughly
2. Use PR reviews for code quality
3. Let CI/CD validate all changes
4. Test VSIX files before marketplace publication

## 🚨 Troubleshooting

### Release Failed

1. Check workflow logs in GitHub Actions
2. Verify commit message format
3. Ensure no merge conflicts
4. Check repository permissions

### Marketplace Publishing Failed

1. Verify `VSCE_PAT` secret is set
2. Check token permissions
3. Ensure package.json is valid
4. Verify extension manifest

### Changelog Issues

1. Ensure conventional commit format
2. Check if commits are properly formatted
3. Manually edit CHANGELOG.md if needed
4. Re-run `npm run release` to regenerate

### Version Conflicts

```bash
# Reset to last release and try again
git reset --hard v1.2.0
git clean -fd
npm run release
```

## 📊 Monitoring

### GitHub Actions

Monitor all workflows at: `https://github.com/mPokornyETM/vs-code-wincc-oa-projects-viewer/actions`

### Releases

Track releases at: `https://github.com/mPokornyETM/vs-code-wincc-oa-projects-viewer/releases`

### Marketplace

Monitor marketplace at: `https://marketplace.visualstudio.com/items?itemName=mPokornyETM.wincc-oa-projects`

---

## 🎉 Summary

This automated system provides:

- 🤖 Zero-manual-work releases
- 📝 Consistent changelog generation
- 🏷️ Proper semantic versioning
- 📦 Automatic distribution
- 🔄 CI/CD integration

Just follow conventional commits, and everything else happens automatically! 🚀
