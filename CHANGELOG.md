# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0](https://github.com/mPokornyETM/vs-code-wincc-oa-projects-viewer/compare/v0.1.0...v1.0.0) (2025-10-27)


### 🚀 Features

* add auto-merge workflow for Dependabot PRs ([#7](https://github.com/mPokornyETM/vs-code-wincc-oa-projects-viewer/issues/7)) ([23f60c2](https://github.com/mPokornyETM/vs-code-wincc-oa-projects-viewer/commit/23f60c2412aefd27d4d6751909a6429741f5cb7a))
* integrate GitHub Project for automated issue and PR tracking ([#8](https://github.com/mPokornyETM/vs-code-wincc-oa-projects-viewer/issues/8)) ([99b0dea](https://github.com/mPokornyETM/vs-code-wincc-oa-projects-viewer/commit/99b0dea610cf542fae4b20dfa272674e85dd1cf9))


### 👷 CI/CD

* **deps:** bump actions/checkout from 4 to 5 ([#12](https://github.com/mPokornyETM/vs-code-wincc-oa-projects-viewer/issues/12)) ([bb9ae00](https://github.com/mPokornyETM/vs-code-wincc-oa-projects-viewer/commit/bb9ae00ea136823ac97d1de6490f04a8ce595b23))
* **deps:** bump actions/github-script from 7 to 8 ([#10](https://github.com/mPokornyETM/vs-code-wincc-oa-projects-viewer/issues/10)) ([8d46ecb](https://github.com/mPokornyETM/vs-code-wincc-oa-projects-viewer/commit/8d46ecb07b2a23f991152bb55f038b899e698358))
* **deps:** bump actions/setup-node from 4 to 6 ([#9](https://github.com/mPokornyETM/vs-code-wincc-oa-projects-viewer/issues/9)) ([3091163](https://github.com/mPokornyETM/vs-code-wincc-oa-projects-viewer/commit/309116330e3518f005ce216f5d414d5162c476b5))
* **deps:** bump actions/upload-artifact from 4 to 5 ([#11](https://github.com/mPokornyETM/vs-code-wincc-oa-projects-viewer/issues/11)) ([7dbc410](https://github.com/mPokornyETM/vs-code-wincc-oa-projects-viewer/commit/7dbc410cf057b06b73d1dea156bc40a9255cf467))


### 🐛 Bug Fixes

* add missing checkout step to auto-merge Dependabot workflow ([0a0fc1d](https://github.com/mPokornyETM/vs-code-wincc-oa-projects-viewer/commit/0a0fc1dbf7f1e9dd2468fd799a6647fb5dd8f774))
* resolve TypeScript compilation errors ([#13](https://github.com/mPokornyETM/vs-code-wincc-oa-projects-viewer/issues/13)) ([4204648](https://github.com/mPokornyETM/vs-code-wincc-oa-projects-viewer/commit/42046486a68caf91110e0f86c3450e4527fe3d49))

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