# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0](https://github.com/mPokornyETM/vs-code-wincc-oa-projects-viewer/compare/v1.0.0...v1.1.0) (2025-10-30)


### 🚀 Features

* add GitHub Discussions guide and issue templates for bug reports, documentation, feature requests, and questions ([#16](https://github.com/mPokornyETM/vs-code-wincc-oa-projects-viewer/issues/16)) ([8978975](https://github.com/mPokornyETM/vs-code-wincc-oa-projects-viewer/commit/8978975435f41518641953c434fe361098e45294))
* Implement comprehensive documentation and user guide for WinCC … ([#15](https://github.com/mPokornyETM/vs-code-wincc-oa-projects-viewer/issues/15)) ([e14fd01](https://github.com/mPokornyETM/vs-code-wincc-oa-projects-viewer/commit/e14fd01c2637f53320ef78a2a3c9a4e8866c57af))


### 🐛 Bug Fixes

* resolve GitHub Actions release workflow failures ([bb2d530](https://github.com/mPokornyETM/vs-code-wincc-oa-projects-viewer/commit/bb2d53024c17fc36b26dc2ef18db6faae8cc0032))

## [0.0.2] - 2025-01-27

### 🚀 Features

- Initial release of WinCC OA Projects extension
- Activity bar integration with project tree view
- Project information display (name, location, version, runnable state)
- Project file parsing from Windows registry and config files  
- Project sorting (current > runnable > non-runnable)
- Extension points for other extensions to contribute actions
- Modern API exports for programmatic access

### 📚 Documentation

- Comprehensive README with usage examples
- Extension point documentation and examples
- Development guide for contributors

### 🔧 Build System

- Automated VSIX packaging with PowerShell and Batch scripts
- GitHub Actions CI/CD pipeline
- TypeScript compilation and linting setup