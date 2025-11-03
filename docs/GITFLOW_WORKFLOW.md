# Git Flow Workflow

This repository follows the **Git Flow** branching model as described in [Atlassian's Git Flow Tutorial](https://www.atlassian.com/git/tutorials/comparing-workflows/gitflow-workflow).

## 🌳 Branch Structure

### Main Branches

#### `main` (Production)
- **Purpose**: Contains production-ready code
- **Stability**: Always stable and deployable
- **Protection**: Protected branch with required reviews and CI/CD checks
- **Merges from**: `release/*` and `hotfix/*` branches only
- **Direct commits**: ❌ Not allowed

#### `develop` (Integration)
- **Purpose**: Integration branch for ongoing development
- **Stability**: Generally stable, contains latest development features
- **Merges from**: `feature/*`, `release/*`, and `hotfix/*` branches
- **Direct commits**: ✅ Allowed for small changes only

### Supporting Branches

#### `feature/*` (Feature Development)
- **Purpose**: Develop new features for upcoming releases
- **Naming**: `feature/feature-name` or `feature/ticket-number`
- **Branch from**: `develop`
- **Merge to**: `develop`
- **Lifetime**: Until feature is complete

**Examples:**
```
feature/user-authentication
feature/project-filtering
feature/PROJ-123-api-enhancement
```

#### `release/*` (Release Preparation)
- **Purpose**: Prepare new production releases
- **Naming**: `release/version-number`
- **Branch from**: `develop`
- **Merge to**: `main` and `develop`
- **Activities**: Bug fixes, documentation updates, version bumping

**Examples:**
```
release/1.2.0
release/2.0.0-beta
```

#### `hotfix/*` (Production Fixes)
- **Purpose**: Quick fixes for critical production issues
- **Naming**: `hotfix/version-number` or `hotfix/issue-description`
- **Branch from**: `main`
- **Merge to**: `main` and `develop`
- **Urgency**: High priority, immediate deployment

**Examples:**
```
hotfix/1.1.1
hotfix/critical-security-patch
hotfix/PROJ-456-crash-fix
```

## 🔄 Workflow Process

### 1. Feature Development

```bash
# Start a new feature
git checkout develop
git pull origin develop
git checkout -b feature/my-new-feature

# Work on the feature
git add .
git commit -m "feat: implement new feature"
git push origin feature/my-new-feature

# Create Pull Request: feature/my-new-feature → develop
# After review and approval, merge to develop
```

### 2. Release Process

```bash
# Start a new release
git checkout develop
git pull origin develop
git checkout -b release/1.2.0

# Prepare release (version bump, changelog, etc.)
git add .
git commit -m "chore: prepare release 1.2.0"
git push origin release/1.2.0

# Create Pull Requests:
# 1. release/1.2.0 → main (for production)
# 2. release/1.2.0 → develop (to sync back)
```

### 3. Hotfix Process

```bash
# Start a hotfix
git checkout main
git pull origin main
git checkout -b hotfix/1.1.1

# Fix the critical issue
git add .
git commit -m "fix: resolve critical production bug"
git push origin hotfix/1.1.1

# Create Pull Requests:
# 1. hotfix/1.1.1 → main (immediate fix)
# 2. hotfix/1.1.1 → develop (sync fix back)
```

## 📋 Branch Naming Conventions

### Feature Branches
- `feature/description` - General feature
- `feature/PROJ-123-description` - Feature with ticket number
- `feature/component-enhancement` - Component-specific feature

### Release Branches
- `release/1.2.0` - Standard semantic version
- `release/1.2.0-beta` - Pre-release version
- `release/v2.0.0` - Version with 'v' prefix

### Hotfix Branches
- `hotfix/1.1.1` - Version-based hotfix
- `hotfix/critical-bug-fix` - Description-based hotfix
- `hotfix/PROJ-789-security-patch` - Ticket-based hotfix

## 🔒 Branch Protection Rules

### `main` Branch Protection
- ✅ Require pull request reviews (1+ reviewer)
- ✅ Require status checks to pass
- ✅ Require branches to be up to date
- ✅ Restrict pushes to specific people/teams
- ✅ No force pushes allowed
- ✅ No deletions allowed

### `develop` Branch Protection
- ✅ Require pull request reviews (1+ reviewer)
- ✅ Require status checks to pass
- ✅ Allow force pushes (for rebasing)
- ✅ No deletions allowed

## 🎯 Git Flow Commands

### Using Git Flow Extension (Optional)

Install Git Flow extension:
```bash
# Windows (via Git for Windows)
# Git Flow is included by default

# macOS
brew install git-flow-avh

# Linux (Ubuntu/Debian)
sudo apt-get install git-flow
```

Initialize Git Flow:
```bash
git flow init
```

Git Flow commands:
```bash
# Features
git flow feature start my-feature
git flow feature finish my-feature

# Releases  
git flow release start 1.2.0
git flow release finish 1.2.0

# Hotfixes
git flow hotfix start 1.1.1
git flow hotfix finish 1.1.1
```

### Manual Git Flow (Recommended)

```bash
# Feature workflow
git checkout develop
git checkout -b feature/my-feature
# ... work and commit ...
git checkout develop
git merge --no-ff feature/my-feature
git branch -d feature/my-feature

# Release workflow
git checkout develop
git checkout -b release/1.2.0
# ... prepare release ...
git checkout main
git merge --no-ff release/1.2.0
git tag -a v1.2.0 -m "Release version 1.2.0"
git checkout develop
git merge --no-ff release/1.2.0
git branch -d release/1.2.0

# Hotfix workflow
git checkout main
git checkout -b hotfix/1.1.1
# ... fix issue ...
git checkout main
git merge --no-ff hotfix/1.1.1
git tag -a v1.1.1 -m "Hotfix version 1.1.1"
git checkout develop
git merge --no-ff hotfix/1.1.1
git branch -d hotfix/1.1.1
```

## 📝 Commit Message Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `ci`: CI/CD related changes

**Examples:**
```bash
git commit -m "feat(auth): add user login functionality"
git commit -m "fix: resolve null pointer exception in project loader"
git commit -m "docs: update installation instructions"
git commit -m "chore(release): bump version to 1.2.0"
```

## 🚀 Integration with CI/CD

### Automated Workflows

**On `main` branch:**
- ✅ Full test suite
- ✅ Security scans
- ✅ Build and package
- ✅ Deploy to production
- ✅ Create GitHub release
- ✅ Publish to VS Code Marketplace

**On `develop` branch:**
- ✅ Full test suite
- ✅ Build verification
- ✅ Deploy to staging
- ✅ Integration tests

**On `feature/*` branches:**
- ✅ Lint and compile checks
- ✅ Unit tests
- ✅ Build verification

**On `release/*` branches:**
- ✅ Full test suite
- ✅ Security scans
- ✅ Build and package
- ✅ Deploy to staging
- ✅ Create release candidate

**On `hotfix/*` branches:**
- ✅ Critical path tests
- ✅ Security scans
- ✅ Fast-track deployment

## 📊 Git Flow Benefits

### ✅ Advantages
- **Clear separation** of concerns between branches
- **Parallel development** of features without conflicts
- **Stable main branch** always ready for production
- **Structured release process** with proper testing
- **Emergency hotfix capability** without disrupting development
- **Historical clarity** - easy to track features and releases

### ⚠️ Considerations
- **More complex** than simple workflows
- **Requires discipline** from all team members
- **Branch management overhead** - more branches to maintain
- **Learning curve** for new team members

## 🎯 Best Practices

### Feature Development
1. **Keep features small** - easier to review and merge
2. **Regular rebasing** - keep feature branches up to date with develop
3. **Clean commit history** - squash or rebase before merging
4. **Comprehensive testing** - ensure features work in isolation

### Release Management
1. **Feature freeze** - no new features during release preparation
2. **Version bumping** - follow semantic versioning
3. **Changelog updates** - document all changes
4. **Testing phases** - thorough testing before production

### Hotfix Protocol
1. **Immediate assessment** - verify the issue is critical
2. **Minimal changes** - fix only the critical issue
3. **Fast-track testing** - focused testing on the fix
4. **Dual deployment** - deploy to production and sync to develop

## 🔧 Repository Configuration

This repository is configured with:
- **Branch protection rules** for `main` and `develop`
- **Required status checks** for all merges
- **Automated CI/CD pipelines** for each branch type
- **Release automation** with semantic versioning
- **Dependabot integration** for dependency updates

## 📞 Support and Questions

For questions about the Git Flow process:
1. **Check this documentation** first
2. **Review existing pull requests** for examples
3. **Ask in repository discussions** or issues
4. **Contact repository maintainers** for clarification

---

**Remember**: Git Flow is a discipline. The more consistently the team follows it, the more effective it becomes! 🚀