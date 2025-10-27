# WinCC OA Projects Viewer

[![GitHub release](https://img.shields.io/github/release/mPokornyETM/vs-code-wincc-oa-projects-viewer.svg?label=release)](https://github.com/mPokornyETM/vs-code-wincc-oa-projects-viewer/releases/latest)
[![VS Code Marketplace](https://img.shields.io/vscode-marketplace/v/mPokornyETM.wincc-oa-projects.svg)](https://marketplace.visualstudio.com/items?itemName=mPokornyETM.wincc-oa-projects)
[![VS Code Marketplace Installs](https://img.shields.io/vscode-marketplace/i/mPokornyETM.wincc-oa-projects.svg?color=blue)](https://marketplace.visualstudio.com/items?itemName=mPokornyETM.wincc-oa-projects)
[![Build Status](https://github.com/mPokornyETM/vs-code-wincc-oa-projects-viewer/workflows/CI/CD%20Pipeline/badge.svg)](https://github.com/mPokornyETM/vs-code-wincc-oa-projects-viewer/actions)
[![GitHub license](https://img.shields.io/github/license/mPokornyETM/vs-code-wincc-oa-projects-viewer.svg)](https://github.com/mPokornyETM/vs-code-wincc-oa-projects-viewer/blob/main/LICENSE)
[![Maintenance](https://img.shields.io/maintenance/yes/2025.svg)](https://github.com/mPokornyETM/vs-code-wincc-oa-projects-viewer)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/mPokornyETM/vs-code-wincc-oa-projects-viewer/blob/main/CONTRIBUTING.md)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

A comprehensive Visual Studio Code extension for viewing, managing, and organizing [SIMATIC WinCC Open Architecture](https://www.winccoa.com/index.html) projects with intelligent categorization and cross-platform support.

**Keywords:** WinCC OA, scada, hmi, wincc-oa-project-admin, wincc-oa-engineering, wincc-oa-runtime

---

## Supporting the Project

"Open source" does not mean "includes free support"

You can support the contributor and buy him a coffee.
[![coffee](https://www.buymeacoffee.com/assets/img/custom_images/black_img.png)](https://www.buymeacoffee.com/mpokornyetm)
Every second invested in an open-source project is a second you can't invest in your own family / friends / hobby.
That's the reason, why supporting the contributors is so important.

Thx very much for supporting us.

---

## ✨ Key Features

### 🏗️ **Hierarchical Project Organization**
- **Intelligent Categorization**: Projects automatically organized into logical categories
- **Version-Based Grouping**: Sub-projects grouped by WinCC OA version (3.20, 3.21, etc.)
- **Smart Separation**: Distinguishes between WinCC OA delivered and user-registered projects
- **Expandable Tree Structure**: Nested categories with project counts and descriptions

### 🚀 **Project Types Supported**
- **Runnable Projects**: Active WinCC OA projects ready for execution
- **WinCC OA System Versions**: Installed WinCC OA system versions (3.20, 3.21, etc.)
- **WinCC OA Version Sub-Projects**: Components delivered with WinCC OA (BACnet, OPC UA, etc.)
- **User Sub-Projects**: Manually registered custom projects and extensions
- **Unregistered Projects**: Projects found but not properly registered

### 🌍 **Cross-Platform Support**
- **Windows**: Full support for standard Siemens installation paths
- **Unix/Linux**: Support for common Unix installation locations
- **Intelligent Path Detection**: Automatically detects WinCC OA installation directories

### 📊 **Rich Project Information**
- **Visual Status Indicators**: ⭐ Current, 🚀 Runnable, ⚙️ System, 🏷️ Version
- **Detailed Metadata**: Name, location, version, creation date, company info
- **Smart Tooltips**: Context-aware information and project counts
- **Real-time Updates**: Auto-refresh when configuration files change

---

## 🏗️ Project Organization & Tree Structure

The extension organizes projects into a hierarchical tree structure with intelligent categorization:

### 📂 **Root Categories**

```
📁 WinCC OA Projects Viewer
├── 🚀 Runnable Projects (Active WinCC OA projects)
├── ⚙️ WinCC OA System Versions (Installed versions: 3.20, 3.21, etc.)
├── 🏭 WinCC OA Version Sub-Projects (Delivered by WinCC OA installation)
│   ├── 🏷️ Version 3.20
│   │   ├── BACnet_3.20
│   │   ├── OPC_UA_3.20
│   │   └── Modbus_3.20
│   └── 🏷️ Version 3.21
│       ├── BACnet_3.21
│       └── OPC_UA_3.21
├── 👤 User Sub-Projects (Manually registered projects)
│   ├── 🏷️ Version 3.20
│   │   └── MyCustomProject
│   └── 🏷️ Version Unknown
│       └── LegacyProject
└── ⚠️ Not Registered (Unregistered projects)
```

### 🎯 **Category Details**

#### 🚀 **Runnable Projects**
- **Purpose**: Main WinCC OA projects that can be executed
- **Requirements**: Valid `config/config` file with `[general]` section
- **Status**: Not marked as `notRunnable` in pvssInst.conf
- **Features**: Shows version information, current project indicator

#### ⚙️ **WinCC OA System Versions**  
- **Purpose**: Installed WinCC OA system versions
- **Examples**: 3.20, 3.21, 3.22
- **Detection**: Project name matches version pattern
- **Features**: System installation indicator, version-based sorting

#### 🏭 **WinCC OA Version Sub-Projects**
- **Purpose**: Sub-projects delivered with WinCC OA installation
- **Location**: `C:\Siemens\Automation\WinCC_OA\{version}\`
- **Examples**: BACnet_3.20, OPC_UA_3.21, Modbus_3.20
- **Management**: Managed by WinCC OA installation/updates
- **Organization**: Grouped by version with nested structure

#### 👤 **User Sub-Projects**
- **Purpose**: Manually registered sub-projects and custom extensions
- **Location**: Any path outside WinCC OA installation directories
- **Examples**: Custom projects, third-party extensions, user developments
- **Management**: User-managed via API, manual registration, or tools
- **Organization**: Grouped by detected or unknown version

#### ⚠️ **Not Registered**
- **Purpose**: Projects found but not properly registered in pvssInst.conf
- **Issues**: Missing installation directory or invalid configuration
- **Action Required**: Check project registration or configuration

---

## Configuration File Parsing

The extension reads project information from:

- **Main Config**: `C:\ProgramData\Siemens\WinCC_OA\pvssInst.conf`
- **Project Config**: `<InstallationDir>/config/config` (for version information)

### Project Type Classification

**WinCC OA Projects** (runnable) are identified when:

1. The `notRunnable` property is not set to `true` in the main config
2. A `config` file exists in the `<InstallationDir>/config/` directory
3. The config file contains a `[general]` section with a `proj_version` entry

**WinCC OA Extensions** (non-runnable) include:
- Extensions and plugins
- Add-ons and sub-projects
- Project templates
- Component libraries

- **Project View**: Detailed project information view with comprehensive configuration details
- **Auto-refresh**: Automatically refreshes when `pvssInst.conf` file changes
- **Click to View**: Click any project in the tree to view detailed information
- **Multiple Open Options**: Open projects in current window or new VS Code instance
- **Extension Points**: Provides extension points for other WinCC OA extensions to hook into

---

## 🔌 Extension API

The extension provides a comprehensive API for other extensions to interact with WinCC OA projects:

### **Core Functions**

```typescript
// Get all projects
getProjects(): WinCCOAProject[]

// Find project by path
getProjectByPath(path: string): WinCCOAProject | undefined

// Get project version
getProjectVersion(installationDir: string): string | undefined

// Get cross-platform config file path
getPvssInstConfPath(): string

// Refresh project list
refreshProjects(): void
```

### **Category-Specific Functions**

```typescript
// Get projects by category
getRunnableProjects(): WinCCOAProject[]
getWinCCOASystemVersions(): WinCCOAProject[]
getWinCCOADeliveredSubProjects(): WinCCOAProject[]
getUserSubProjects(): WinCCOAProject[]

// Get projects by version
getSubProjectsByVersion(version: string): WinCCOAProject[]

// Get category structure
getProjectCategories(): ProjectCategory[]
```

### **Usage Example**

```typescript
// In your extension
import { extensions } from 'vscode';

const winccOAExt = extensions.getExtension('mPokornyETM.wincc-oa-projects');
if (winccOAExt) {
    const api = winccOAExt.exports.getAPI();
    
    // Get all runnable projects
    const runnableProjects = api.getRunnableProjects();
    
    // Get WinCC OA delivered components
    const deliveredComponents = api.getWinCCOADeliveredSubProjects();
    
    // Get projects for specific version
    const v320Projects = api.getSubProjectsByVersion('3.20');
}
```

---

## 🎮 Commands

- **WinCC OA: Refresh Projects**: Manually refresh the project list
- **WinCC OA: Open Project**: Open a project/extension folder in current VS Code window
- **WinCC OA: Open Project in New Window**: Open a project/extension folder in new VS Code instance
- **WinCC OA: Open in Explorer**: Open project/extension location in Windows Explorer
- **WinCC OA: Show Project Details**: Select and display detailed project/extension information

---

## Usage

1. Install the extension
2. Look for "WinCC OA Projects" in the activity bar (left sidebar)
3. Click to open the "Locale Projects" view
4. Browse your WinCC OA projects with all relevant information displayed
5. Right-click on projects for context menu options

---

## Requirements

- Windows operating system
- WinCC OA installation with properly configured projects
- Access to `C:\ProgramData\Siemens\WinCC_OA\pvssInst.conf`

---

## Development

To set up the development environment:

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch for changes
npm run watch

# Run tests
npm test
```

### 🤖 Automated Dependency Management

This project uses **Dependabot** to automatically manage dependencies:

- **Weekly updates** every Monday at 9:00 AM CET
- **Security updates** get high priority  
- **Automatic releases** for dependency updates
- **Grouped PRs** for related dependencies

See [DEPENDABOT.md](DEPENDABOT.md) for complete configuration details.

### Debugging

Press `F5` to launch a new VS Code window with the extension loaded for testing.

---

## Project Structure

```text
├── src/
│   ├── extension.ts          # Main extension logic
│   └── test/                 # Test files
├── .vscode/                  # VS Code configuration
├── package.json              # Extension manifest
└── README.md                 # This file
```

---

## Version History

See [CHANGELOG.md](CHANGELOG.md) for version history and changes.

---

## License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

**note** This project provide interface to WinCC OA and does not iunclude any license to use WinCC OA for free.



### MIT License Summary

- ✅ **Commercial use** - You can use this software for commercial purposes
- ✅ **Modification** - You can modify the source code
- ✅ **Distribution** - You can distribute the original or modified software
- ✅ **Private use** - You can use the software for private purposes
- ⚠️ **Limitation** - The software is provided "as is" without warranty
- ⚠️ **License notice** - Include the original license notice in distributions

---

## Support

For issues, feature requests, or questions:

1. Check the existing issues on GitHub
2. Create a new issue with detailed information
3. Include sample log files if relevant (remove sensitive data)

---

## Acknowledgments

- Built for the WinCC OA community
- Inspired by the need for better log analysis tools
- Thanks to the VS Code extension development community
- Thanks to the Copilot to write this extension

---

**Note**: This extension is designed specifically for WinCC OA log files. For other log formats, consider using alternative log viewing extensions.

**Note**: The most content of this extension was automatically generated by AI (Copilot && Cloaude Sonnet 4)
