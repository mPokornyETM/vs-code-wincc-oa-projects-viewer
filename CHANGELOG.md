# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### 🚀 Features

- **Project Registration Commands**: Added comprehensive project registration functionality
  - `WinCC OA: Register Runnable Project` command for registering runnable projects
  - `WinCC OA: Register Sub-Project` command for registering sub-projects and extensions
  - **File Explorer Integration**: Context menu support for directory-based registration
  - **Command Palette Support**: Folder selection dialog when invoked from command palette
  - **Intelligent Validation**: Automatic project structure validation and version detection
  - **Duplicate Prevention**: Built-in checks to prevent registering already registered projects
  - **Error Handling**: Comprehensive validation with user-friendly error messages

### 🔧 Improvements

- **Enhanced Menu System**: Extended file explorer context menus with project registration options
- **Smart Project Detection**: Improved logic for distinguishing runnable projects vs sub-projects
- **Configuration Parsing**: Enhanced config file parsing for better version detection
- **User Experience**: Added progress feedback and success notifications for registration operations

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
