# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0](https://github.com/mPokornyETM/vs-code-wincc-oa-projects-viewer/compare/v1.1.0...v2.0.0) (2025-11-03)


### 🚀 Features

* Add comprehensive documentation support with tabbed interface and official WinCC OA integration ([#17](https://github.com/mPokornyETM/vs-code-wincc-oa-projects-viewer/issues/17)) ([036c6b0](https://github.com/mPokornyETM/vs-code-wincc-oa-projects-viewer/commit/036c6b021b72e928542e4cca5bc9a57ef15b5632))
* Implement project registration commands for WinCC OA extension ([#19](https://github.com/mPokornyETM/vs-code-wincc-oa-projects-viewer/issues/19)) ([61e76be](https://github.com/mPokornyETM/vs-code-wincc-oa-projects-viewer/commit/61e76be0522a8f7d3166ff341c28fc0db8bcb761))

## [1.1.0] - 2025-11-03

### 🚀 Features

- **Project Registration Commands**: Added comprehensive project registration functionality
  - `WinCC OA: Register Runnable Project` command for registering runnable projects
  - `WinCC OA: Register Sub-Project` command for registering sub-projects and extensions
  - `WinCC OA: Register All Unregistered Projects` command for bulk registration
  - **File Explorer Integration**: Context menu support for directory-based registration
  - **Command Palette Support**: Folder selection dialog when invoked from command palette
  - **Intelligent Validation**: Automatic project structure validation and version detection
  - **Duplicate Prevention**: Built-in checks to prevent registering already registered projects
  - **Error Handling**: Comprehensive validation with user-friendly error messages

- **Project Unregistration**: Added project removal functionality
  - `WinCC OA: Unregister Project` command for safe project removal
  - **Context Menu Integration**: Right-click to unregister projects
  - **Safety Confirmations**: Confirmation dialogs to prevent accidental removal
  - **Configuration Management**: Safe removal from WinCC OA configuration files

- **Smart Filtering System**: Added real-time project filtering
  - **Real-time Search**: Filter projects as you type with instant results
  - **Cross-Category Search**: Search across all project categories simultaneously
  - **Filter UI**: Dedicated filter input with clear functionality
  - **Case-Insensitive**: Search works regardless of letter case
  - **Category Preservation**: Maintains hierarchical structure while filtering

- **Unregistered Projects Discovery**: Added automatic detection of unregistered projects
  - **Auto-Discovery**: Scans common WinCC OA project locations
  - **Smart Detection**: Identifies valid project structures
  - **Visual Indicators**: Clear identification of projects needing registration
  - **Bulk Registration**: Register all unregistered projects with single command

### 🔧 Improvements

- **Enhanced Menu System**: Extended context menus with registration and unregistration options
- **Smart Project Detection**: Improved logic for distinguishing runnable projects vs sub-projects
- **Configuration Parsing**: Enhanced config file parsing for better version detection
- **User Experience**: Added progress feedback and success notifications for all operations
- **Performance Optimizations**: Improved project loading and categorization performance
- **Enhanced Version Support**: Comprehensive support for WinCC OA versions 3.17-3.20 with intelligent detection, prepared for upcoming 3.21

### 🧪 Testing

- **Comprehensive Test Suite**: Added 40+ test cases covering registration commands
- **Path Validation Tests**: Cross-platform path handling and normalization testing
- **Error Scenario Coverage**: Tests for invalid paths, duplicate projects, and edge cases
- **Version Detection Tests**: Validation of config file parsing and version extraction
- **Menu Integration Tests**: Command registration and availability verification

### 📚 Documentation

- **Updated README**: Enhanced documentation with detailed registration command information
- **Feature Documentation**: Comprehensive guide for new registration functionality
- **Developer Guide**: Updated contribution guidelines with test coverage requirements
- **Visual Documentation**: Added comprehensive screenshots for all new features:
  - Project filtering interface (`proj-tree-filter.png`)
  - Unregistered projects discovery (`proj-tree-unregistered-projects-.png`)
  - Project registration workflows (`proj-tree-register-runnable-project.png`, `proj-tree-register-all.png`)
  - Project unregistration process (`proj-tree-item-unregister-project.png`, `command-unregister-project.png`)
  - Project documentation view (`project-view-documentation.png`)
- **User Guide Updates**: Enhanced user guide with new feature explanations and troubleshooting

## [0.0.2] - 2025-01-27

### 🚀 Initial Features

- Initial release of WinCC OA Projects extension
- Activity bar integration with project tree view
- Project information display (name, location, version, runnable state)
- Project file parsing from Windows registry and config files  
- Project sorting (current > runnable > non-runnable)
- Extension points for other extensions to contribute actions
- Modern API exports for programmatic access

### 📚 Initial Documentation

- Comprehensive README with usage examples
- Extension point documentation and examples
- Development guide for contributors

### 🔧 Build System

- Automated VSIX packaging with PowerShell and Batch scripts
- GitHub Actions CI/CD pipeline
- TypeScript compilation and linting setup
