# Contributor Workflow Guide

This guide walks you through the complete process of contributing to the WinCC OA Projects extension.

## 🚀 Step-by-Step Contribution Process

### Prerequisites
- GitHub account
- Git installed on your system
- Node.js 18.x or later
- VS Code 1.105.0 or later

### 📋 Important: CI/CD Requirements
Before contributing, familiarize yourself with our **mandatory CI/CD requirements**:
- 📖 **[Read CI/CD Requirements](CI_CD_REQUIREMENTS.md)** - All PRs must pass automated checks
- ✅ **Required Status Checks**: `test (18.x)`, `test (20.x)`, `package`
- 🔒 **Branch Protection**: PRs required, no direct pushes to main

### 1. Fork the Repository

1. Go to the [main repository](https://github.com/mPokornyETM/vs-code-wincc-oa-projects-viewer)
2. Click the **"Fork"** button in the top-right corner
3. Select your GitHub account as the destination

### 2. Clone Your Fork

```bash
# Clone your forked repository
git clone https://github.com/YOUR_USERNAME/vs-code-wincc-oa-projects-viewer.git

# Navigate to the project directory
cd vs-code-wincc-oa-projects-viewer

# Add the original repository as upstream
git remote add upstream https://github.com/mPokornyETM/vs-code-wincc-oa-projects-viewer.git

# Verify remotes
git remote -v
```

### 3. Set Up Development Environment

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Run tests to ensure everything works
npm test
```

### 4. Create Feature Branch from Main

**Important**: Always create feature branches from the `main` branch, not from other feature branches.

```bash
# Switch to main branch
git checkout main

# Pull the latest changes from upstream
git pull upstream main

# Push updates to your fork's main branch
git push origin main

# Create and switch to a new feature branch
git checkout -b feature/your-feature-name
```

### Branch Naming Conventions

Use descriptive branch names that clearly indicate the purpose:

- **Features**: `feature/project-search`, `feature/hierarchical-categories`
- **Bug fixes**: `fix/config-parsing-error`, `fix/memory-leak`
- **Documentation**: `docs/update-readme`, `docs/api-examples`
- **Refactoring**: `refactor/path-utilities`, `refactor/tree-provider`
- **Performance**: `perf/lazy-loading`, `perf/cache-optimization`
- **Tests**: `test/integration-tests`, `test/unit-coverage`

### 5. Development Workflow

```bash
# Start development mode (watches for changes)
npm run watch

# In another terminal, run tests continuously
npm test -- --watch

# Check for linting issues
npm run lint

# Compile to check for TypeScript errors
npm run compile
```

### 6. Making Changes

#### Code Guidelines
- Follow existing TypeScript coding style
- Add JSDoc comments for public functions
- Update tests for new functionality
- Ensure cross-platform compatibility (Windows/Unix)

#### Testing Your Changes
1. **Manual Testing**: Press `F5` in VS Code to launch Extension Development Host
2. **Unit Tests**: Run `npm test` to execute automated tests
3. **Integration Testing**: Test with real WinCC OA projects if possible

### 7. Commit Your Changes

Use conventional commit messages:

```bash
# Stage your changes
git add .

# Commit with conventional commit format
git commit -m "feat: add hierarchical project categorization"
git commit -m "fix: resolve config file parsing issue"
git commit -m "docs: update API documentation"
git commit -m "test: add integration tests for tree provider"
```

#### Conventional Commit Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or modifying tests
- `chore`: Maintenance tasks

### 8. Keep Your Branch Updated

```bash
# Fetch latest changes from upstream
git fetch upstream

# Switch to main branch
git checkout main

# Merge upstream changes
git merge upstream/main

# Switch back to your feature branch
git checkout feature/your-feature-name

# Rebase your feature branch on updated main
git rebase main
```

### 9. Push and Create Pull Request

```bash
# Push your feature branch to your fork
git push origin feature/your-feature-name

# If you need to force push after rebasing
git push --force-with-lease origin feature/your-feature-name
```

### 10. Create Pull Request on GitHub

1. Go to your fork on GitHub
2. Click **"Compare & pull request"** button
3. **Base repository**: `mPokornyETM/vs-code-wincc-oa-projects-viewer`
4. **Base branch**: `main`
5. **Head repository**: `YOUR_USERNAME/vs-code-wincc-oa-projects-viewer`
6. **Compare branch**: `feature/your-feature-name`
7. Fill in the pull request template
8. Click **"Create pull request"**

## 🔄 After Creating the Pull Request

### Respond to Reviews
- Address reviewer feedback promptly
- Make additional commits to the same branch
- Push changes to update the pull request automatically

### Update Your Pull Request
```bash
# Make additional changes
# ... edit files ...

# Commit the changes
git add .
git commit -m "fix: address review comments"

# Push to update the pull request
git push origin feature/your-feature-name
```

## 🧹 Cleanup After Merge

Once your pull request is merged:

```bash
# Switch to main branch
git checkout main

# Pull the updated main branch
git pull upstream main

# Delete your local feature branch
git branch -d feature/your-feature-name

# Delete the remote feature branch
git push origin --delete feature/your-feature-name

# Update your fork's main branch
git push origin main
```

## 🚨 Common Issues and Solutions

### Sync Fork with Upstream
```bash
# Add upstream if not already added
git remote add upstream https://github.com/mPokornyETM/vs-code-wincc-oa-projects-viewer.git

# Fetch upstream changes
git fetch upstream

# Switch to main
git checkout main

# Merge upstream main
git merge upstream/main

# Push to your fork
git push origin main
```

### Resolve Merge Conflicts
```bash
# If conflicts occur during rebase
git rebase main

# Edit conflicted files
# Remove conflict markers and fix conflicts

# Stage resolved files
git add <resolved-files>

# Continue rebase
git rebase --continue
```

### Reset Branch to Match Upstream
```bash
# If your main branch is messed up
git checkout main
git reset --hard upstream/main
git push --force-with-lease origin main
```

## 📚 Additional Resources

- [GitHub Fork Documentation](https://docs.github.com/en/get-started/quickstart/fork-a-repo)
- [Git Branching Guide](https://git-scm.com/book/en/v2/Git-Branching-Basic-Branching-and-Merging)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [VS Code Extension API](https://code.visualstudio.com/api)

## 💡 Tips for Success

1. **Start Small**: Begin with small, focused changes
2. **Test Thoroughly**: Always test your changes manually and with automated tests  
3. **Follow Conventions**: Use consistent naming and commit message formats
4. **Ask Questions**: Don't hesitate to ask for help in discussions or issues
5. **Stay Updated**: Keep your fork synchronized with upstream regularly
6. **Be Patient**: Code review takes time, and feedback makes the code better

## 🎯 What Makes a Great Contribution

- **Clear Purpose**: The change solves a real problem or adds valuable functionality
- **Well Tested**: Includes appropriate tests and has been manually verified
- **Documented**: Code is commented and documentation is updated
- **Focused**: One feature or fix per pull request
- **Compatible**: Works across different WinCC OA versions and Windows/Unix systems

Happy contributing! 🎉