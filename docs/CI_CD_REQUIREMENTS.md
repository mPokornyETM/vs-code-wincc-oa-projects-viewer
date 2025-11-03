# CI/CD Requirements

This document outlines the mandatory CI/CD requirements for all pull requests to the WinCC OA Projects extension.

## 🔒 Mandatory Status Checks

All pull requests **MUST** pass the following automated checks before they can be merged:

### ✅ Required Checks

| Check Name | Node Version | Description |
|------------|--------------|-------------|
| `test (18.x)` | Node.js 18.x | Full test suite on LTS version |
| `test (20.x)` | Node.js 20.x | Full test suite on current version |
| `package` | Node.js 20.x | Extension packaging validation |

### 📋 What Each Check Does

#### Test Jobs (`test (18.x)`, `test (20.x)`)
```yaml
- Install dependencies (npm ci)
- Run linting (npm run lint)
- Compile TypeScript (npm run compile)  
- Execute test suite (npm test)
```

#### Package Job (`package`)
```yaml
- Install dependencies (npm ci)
- Build VSIX package (vsce package)
- Upload artifact for validation
```

## 🚦 Branch Protection Rules

The following branch protection rules are enforced:

- ✅ **Pull requests required** - No direct pushes to main
- ✅ **Status checks required** - All CI/CD checks must pass
- ✅ **Branch must be up-to-date** - Must include latest main changes  
- ✅ **Review required** - At least 1 approving review
- ✅ **No force pushes** - Prevents history rewriting
- ✅ **No branch deletion** - Protects main branch

## 🔧 Local Verification

Before submitting a PR, run these commands locally to ensure CI/CD will pass:

```bash
# Install dependencies
npm ci

# Run all checks that CI/CD will run
npm run lint      # ✅ No linting errors
npm run compile   # ✅ No TypeScript errors
npm test          # ✅ All 166 tests pass
```

### Optional: Package Test
```bash
# Install vsce globally (one time)
npm install -g @vscode/vsce

# Test packaging (optional but recommended)
vsce package
```

## ❌ Common Failure Scenarios

### Lint Failures
```bash
# Fix automatically where possible
npm run lint -- --fix

# Manual fixes may be needed for complex issues
npm run lint
```

### Compilation Errors
```bash
# Check TypeScript errors
npm run compile

# Fix errors in source code
# Re-run until clean compilation
```

### Test Failures  
```bash
# Run tests with detailed output
npm test

# Run specific test file
npm test -- --grep "test name pattern"

# Debug failing tests
npm test -- --reporter spec
```

### Package Failures
```bash
# Check for missing files or dependencies
vsce package --out test.vsix

# Verify package contents
code --install-extension test.vsix
```

## 🚀 Auto-Merge Support

Dependabot PRs are configured for auto-merge when:
- All status checks pass ✅
- Labeled with `dependencies` 
- Security updates get priority treatment

## 📞 Getting Help

If CI/CD checks are failing and you need assistance:

1. **Check the logs** in the GitHub Actions tab
2. **Run locally** to reproduce the issue  
3. **Review recent changes** that might have broken tests
4. **Ask for help** in the PR comments or issues

## 🎯 Success Criteria

Your PR is ready for review when:

- ✅ All local commands pass (`lint`, `compile`, `test`)
- ✅ All CI/CD status checks are green
- ✅ Branch is up-to-date with main
- ✅ Code follows project conventions
- ✅ Tests cover new functionality
- ✅ Documentation is updated as needed

---

**Remember**: These checks ensure code quality and prevent regressions. They help maintain the extension's reliability for all users! 🎉