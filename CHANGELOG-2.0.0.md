# Release 2.0.0 - Major Architecture Overhaul

## 🎉 Major Features

### Modular Architecture Refactoring (#33)
- **Complete TypeScript Reorganization**: Refactored entire codebase into modular architecture
  - One type per file with exact naming convention
  - Organized types in domain subdirectories (`/types/project/`, `/types/ui/`, `/types/status/`, `/types/history/`, `/types/version/`)
  - Improved maintainability and code organization
  - Fixed 38+ TypeScript compilation errors

### WinCC OA Project Health Assessment System (#29)
- **Comprehensive Health Monitoring**: Added new health assessment feature for WinCC OA projects
  - Real-time project health status
  - Manager state monitoring
  - Performance metrics tracking

### Detailed Version Information
- Enhanced version information display
- Improved project metadata visualization
- Better version tracking across projects

## 🔒 Security Improvements

### CodeQL Security Fixes
- **Fixed 3 High-Severity Vulnerabilities**:
  1. Incomplete string escaping (backslash handling in file paths)
  2. ReDoS (Regular Expression Denial of Service) vulnerability in regex patterns
  3. Improved input validation across the extension

## 🚀 DevOps & Automation

### GitHub Actions Enhancements
- **Git Flow Branch Protection**: Automated branch protection setup for `main` and `develop` branches
  - Configured bypass for GitHub Actions bot to enable automated workflows
  - Pull request requirements for code review
  - Status check requirements before merging

### Pre-Release Automation
- **Automated Pre-Releases**: Automatic pre-release creation on `develop` branch pushes
  - Tag-only approach (no commits to develop to avoid branch protection conflicts)
  - Alpha/Beta/RC detection from branch names
  - Timestamped pre-release versions
  - Automatic GitHub release creation with changelog

### Version Management System
- **Centralized Version Control**: Created comprehensive version management CLI
  - `package.json` as single source of truth
  - `scripts/version.js` for version operations
  - Semantic versioning support (patch/minor/major)
  - Version validation and status checking
  - Colored terminal output for better UX

## 📁 Project Structure

### New File Organization
```
src/
├── types/
│   ├── project/
│   │   ├── ProjectConfig.ts
│   │   ├── CurrentProjectInfo.ts
│   │   └── PmonProjectRunningStatus.ts
│   ├── ui/
│   │   ├── WinCCOAProject.ts
│   │   ├── ProjectCategory.ts
│   │   └── TreeItem.ts
│   ├── status/
│   │   ├── WinCCOAManager.ts
│   │   ├── WinCCOAProjectState.ts
│   │   ├── WinCCOAProjectStatus.ts
│   │   └── WinCCOAProjectHealth.ts
│   ├── history/
│   └── version/
└── ...
```

### New Workflow Files
```
.github/workflows/
├── setup-branch-protection.yml
├── pre-release.yml
└── ...
```

### New Scripts
```
scripts/
└── version.js (Version management CLI)
```

## 🔧 Code Quality

### Linting & Formatting
- ESLint configuration for TypeScript
- Prettier code formatting
- Markdown linting with markdownlint
- Pre-commit hooks for automated style fixes

### Testing
- Improved test coverage
- Better error handling
- Enhanced validation

## 📝 Documentation

- Added comprehensive GitHub Actions workflows documentation
- Created Git Flow branching strategy documentation
- Version management system documentation
- Type system organization documentation

## 🐛 Bug Fixes

### Workflow Improvements
- Fixed branch protection conflicts in pre-release workflow
- Improved pre-release workflow reliability
- Resolved security issues identified by CodeQL

### Type System Fixes
- Resolved 38+ TypeScript compilation errors
- Fixed module import issues
- Improved type definitions and interfaces

## 🔄 Breaking Changes

- **Type System Reorganization**: Types are now in individual files with domain-specific subdirectories
  - Import paths have changed (e.g., `import { ProjectConfig } from './types/project/ProjectConfig'`)
- **Module Structure**: Complete refactoring of internal module structure

## 📦 Dependencies

### New Dependencies
- `dompurify`: ^3.3.0
- `jsdom`: ^27.1.0
- `marked`: ^16.4.1

### Dev Dependencies Updates
- Updated TypeScript to ^5.9.3
- Updated ESLint to ^9.39.0
- Added c8 for code coverage
- Multiple security and quality tooling updates

## 🎯 Migration Guide

For users upgrading from 1.x:
1. No user-facing changes - all improvements are internal
2. Extension will automatically work with the new version
3. No configuration changes required

For developers:
1. Update import paths for types to use new modular structure
2. Follow new type organization convention (one type per file)
3. Use centralized version management system (`npm run version:*`)
4. Follow Git Flow branching strategy

---

**Full Changelog**: https://github.com/mPokornyETM/vs-code-wincc-oa-projects-viewer/compare/v1.x...v2.0.0
