# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0](https://github.com/mPokornyETM/vs-code-wincc-oa-projects-viewer/compare/v0.0.1...v0.1.0) (2025-10-27)


### ⚠ BREAKING CHANGES

* Release process now creates PRs for version updates instead of direct pushes

* fix: resolve JavaScript syntax error in PR labeling workflow

- Remove duplicate context declaration causing SyntaxError
- Context object is already available in GitHub Actions environment
- No need to destructure from @actions/github require statement

Fixes: SyntaxError: Identifier 'context' has already been declared

* fix: correct GitHub API parameter names in PR labeling workflow

- Change pull_request_number to pull_number for pulls.listCommits API
- Change pull_request_number to pull_number for pulls.listFiles API
- These APIs expect pull_number not pull_request_number parameter

Fixes: RequestError [HttpError]: Not Found (404) on API calls
* Release process now creates PRs for version updates instead of direct pushes

### 🚀 Features

* add Dependabot automation for dependency management ([da5bb18](https://github.com/mPokornyETM/vs-code-wincc-oa-projects-viewer/commit/da5bb18610782659cb71ee6834c19a4538e59092))


### 🔨 Maintenance

* add automation complete file ([4272644](https://github.com/mPokornyETM/vs-code-wincc-oa-projects-viewer/commit/42726440bc18dcb4e4bfa5f9354fb4bddc2a5bd4))


### 🐛 Bug Fixes

* update release workflow to work with branch protection rules ([21f794e](https://github.com/mPokornyETM/vs-code-wincc-oa-projects-viewer/commit/21f794e6c9dfc6bad6ff40d4e73f2c3bdd960409))
* update release workflow to work with branch protection rules ([#4](https://github.com/mPokornyETM/vs-code-wincc-oa-projects-viewer/issues/4)) ([7b4eabf](https://github.com/mPokornyETM/vs-code-wincc-oa-projects-viewer/commit/7b4eabf845a10f67245016d42c8d8dbb7e96a7ed))

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