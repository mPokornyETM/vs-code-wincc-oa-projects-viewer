# Contributing to WinCC OA Projects Extension

Thank you for your interest in contributing to the WinCC OA Projects extension! This document provides guidelines for contributing to help ensure a smooth collaboration process.

## 🤝 **Code of Conduct**

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold professional and respectful communication.

## 🚀 Quick Start for Contributors

### 1. Fork & Clone
1. **Fork the Repository**: Click "Fork" on the GitHub repository page
2. **Clone Your Fork**: 
   ```bash
   git clone https://github.com/YOUR_USERNAME/vs-code-wincc-oa-projects-viewer.git
   cd vs-code-wincc-oa-projects-viewer
   ```
3. **Add Upstream Remote**:
   ```bash
   git remote add upstream https://github.com/mPokornyETM/vs-code-wincc-oa-projects-viewer.git
   ```

### 2. Create Feature Branch from Main
```bash
# Ensure you're on main branch
git checkout main

# Pull latest changes from upstream
git pull upstream main

# Create and switch to your feature branch
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/issue-description

# Or for documentation updates  
git checkout -b docs/update-description
```

### 3. Development Workflow
```bash
# Install dependencies
npm install

# Start development mode (watches for changes)
npm run watch

# In another terminal, test your changes
npm test

# Compile to check for TypeScript errors
npm run compile
```

### 4. Commit and Push
```bash
# Stage your changes
git add .

# Commit with descriptive message
git commit -m "feat: add intelligent project classification"

# Push to your fork
git push origin feature/your-feature-name
```

### 5. Create Pull Request
1. Go to your fork on GitHub
2. Click "Compare & pull request"
3. **Base branch**: `main` (important!)
4. **Head branch**: `feature/your-feature-name`
5. Fill in the PR template with detailed description

## Development Setup

### Prerequisites

- Node.js 18.x or later
- VS Code 1.105.0 or later
- Git

### Installation

```bash
git clone https://github.com/mPokornyETM/vs-code-wincc-oa-projects-viewer.git
cd vs-code-wincc-oa-projects-viewer
npm install
```

### Running the Extension

1. Open the project in VS Code
2. Press `F5` to launch a new Extension Development Host window
3. Test your changes in the new window

## Code Style

- Use TypeScript for all new code
- Follow existing code style and formatting
- Run `npm run lint` to check for style issues
- Add comments for complex logic

## Testing

- Write tests for new functionality
- Ensure all existing tests pass: `npm test`
- Test with actual WinCC OA projects when possible

## 🔒 **Mandatory CI/CD Checks**

All pull requests **must pass** the automated CI/CD pipeline before they can be merged. The following checks are **required**:

### ✅ **Required Status Checks**
1. **`test (18.x)`** - Tests running on Node.js 18.x
2. **`test (20.x)`** - Tests running on Node.js 20.x  
3. **`package`** - Extension packaging validation

### 🚦 **CI/CD Pipeline Steps**
The automated pipeline runs these checks for every PR:

```yaml
- Lint check (npm run lint)
- TypeScript compilation (npm run compile) 
- Test suite execution (npm test)
- Extension packaging (vsce package)
```

### ⚠️ **Branch Protection Rules**
- **Pull requests required** - Direct pushes to main branch are blocked
- **Status checks must pass** - All CI/CD checks must be green ✅
- **Branch must be up-to-date** - Must include latest main branch changes
- **Review required** - At least 1 approving review needed

### 🔧 **Fixing Failed Checks**
If your PR fails CI/CD checks:

1. **Linting Errors**: Run `npm run lint` locally and fix issues
2. **Compilation Errors**: Run `npm run compile` and resolve TypeScript errors
3. **Test Failures**: Run `npm test` locally and fix failing tests
4. **Packaging Issues**: Ensure all dependencies are properly declared

### 📋 **Pre-PR Checklist**
Before submitting your pull request, verify locally:

```bash
# ✅ All checks should pass
npm run lint      # No linting errors
npm run compile   # No TypeScript errors  
npm test          # All tests pass
npm run package   # Extension packages successfully (optional)
```

## WinCC OA Specific Guidelines

- Maintain compatibility with pvssInst.conf file format
- Ensure proper parsing of WinCC OA configuration files
- Test with different WinCC OA versions when possible
- Consider Windows-specific file paths and permissions

## Submitting Changes

1. Create a descriptive branch name (e.g., `feature/project-search`)
2. Make atomic commits with clear messages
3. Update documentation if needed
4. Ensure all tests pass
5. Submit a pull request with:
   - Clear description of changes
   - Reference to related issues
   - Screenshots if applicable

## Reporting Issues

- Use the issue templates provided
- Include VS Code and WinCC OA version information
- Provide steps to reproduce the issue
- Include relevant log output or error messages

## Extension Points

When contributing features that other extensions might need:

- Use the provided extension points (`winccOAProjectActions`, `winccOAProjectView`)
- Document new extension points in the README
- Consider backward compatibility

## License

By contributing, you agree that your contributions will be licensed under the MIT License.