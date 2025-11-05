# Changelog

All notable changes to the "WinCC OA Projects" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.2.0] - 2025-11-05

### Added

#### Modular Architecture
- Complete TypeScript reorganization into modular architecture (#33)
- One type per file with exact naming convention
- Organized types in domain subdirectories (`/types/project/`, `/types/ui/`, `/types/status/`, `/types/history/`, `/types/version/`)
- Fixed 38+ TypeScript compilation errors

#### Health Assessment System
- Comprehensive WinCC OA Project Health Assessment system (#29)
- Real-time project health status monitoring
- Manager state monitoring
- Performance metrics tracking

#### Version Management
- Centralized version management CLI (`scripts/version.js`)
- Package.json as single source of truth
- Semantic versioning support (patch/minor/major)
- Version validation and status checking
- Colored terminal output

#### DevOps & Automation
- Git Flow branch protection setup for `main` and `develop` branches
- Automated pre-release creation on `develop` branch pushes
- GitHub Actions bot bypass configuration for workflows
- Tag-only pre-release approach (no commits to develop)
- Alpha/Beta/RC detection from branch names
- Timestamped pre-release versions

#### Documentation
- Comprehensive GitHub Actions workflows documentation
- Git Flow branching strategy documentation
- Version management system documentation
- Type system organization documentation

### Changed

- Enhanced version information display
- Improved project metadata visualization
- Better version tracking across projects
- Refactored internal module structure for better maintainability

### Fixed

#### Security (3 High-Severity Vulnerabilities)
- Incomplete string escaping (backslash handling in file paths)
- ReDoS (Regular Expression Denial of Service) vulnerability in regex patterns
- Improved input validation across the extension

#### Workflow Improvements
- Branch protection conflicts in pre-release workflow
- Pre-release workflow reliability
- Module import issues

#### Type System
- 38+ TypeScript compilation errors
- Module import path issues
- Type definitions and interfaces

### Code Quality

- ESLint configuration for TypeScript
- Prettier code formatting
- Markdown linting with markdownlint
- Pre-commit hooks for automated style fixes
- Improved test coverage

### Dependencies

#### Added
- `dompurify`: ^3.3.0
- `jsdom`: ^27.1.0
- `marked`: ^16.4.1
- `c8`: ^10.1.3 (dev)

#### Updated
- `typescript`: ^5.9.3
- `eslint`: ^9.39.0

### Breaking Changes

- **Type System Reorganization**: Types are now in individual files with domain-specific subdirectories
  - Import paths have changed (e.g., `import { ProjectConfig } from './types/project/ProjectConfig'`)
- **Module Structure**: Complete refactoring of internal module structure

### Migration Guide

For users upgrading from 2.0.x:
- No user-facing changes - all improvements are internal
- Extension will automatically work with the new version
- No configuration changes required

For developers:
- Update import paths for types to use new modular structure
- Follow new type organization convention (one type per file)
- Use centralized version management system (`npm run version:*`)
- Follow Git Flow branching strategy

## [2.0.1] - 2025-11-03

### Fixed
- Minor bug fixes and improvements

## [2.0.0] - Earlier Release

### Added
- Initial major version release
- Project health assessment features
- Enhanced project management capabilities

## [1.2.0] - Previous Release

### Added
- Various features and improvements

## [1.1.1] - Previous Release

### Fixed
- Bug fixes and stability improvements

## [1.1.0] - Previous Release

### Added
- Feature additions

## [1.0.0] - Previous Release

### Added
- Initial stable release

## [0.1.0] - Initial Release

### Added
- Initial extension features
- WinCC OA project tree view
- Basic project management

---

[2.2.0]: https://github.com/mPokornyETM/vs-code-wincc-oa-projects-viewer/compare/v2.0.1...v2.2.0
[2.0.1]: https://github.com/mPokornyETM/vs-code-wincc-oa-projects-viewer/compare/v2.0.0...v2.0.1
[2.0.0]: https://github.com/mPokornyETM/vs-code-wincc-oa-projects-viewer/releases/tag/v2.0.0
