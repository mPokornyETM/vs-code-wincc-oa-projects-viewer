# WinCC OA Projects

[![GitHub release](https://img.shields.io/github/release/mPokornyETM/vs-code-wincc-oa-projects-viewer.svg?label=release)](https://github.com/mPokornyETM/vs-code-wincc-oa-projects-viewer/releases/latest)
[![VS Code Marketplace](https://img.shields.io/vscode-marketplace/v/mPokornyETM.wincc-oa-projects.svg)](https://marketplace.visualstudio.com/items?itemName=mPokornyETM.wincc-oa-projects)
[![VS Code Marketplace Installs](https://img.shields.io/vscode-marketplace/i/mPokornyETM.wincc-oa-projects.svg?color=blue)](https://marketplace.visualstudio.com/items?itemName=mPokornyETM.wincc-oa-projects)
[![Build Status](https://github.com/mPokornyETM/vs-code-wincc-oa-projects-viewer/workflows/CI/CD%20Pipeline/badge.svg)](https://github.com/mPokornyETM/vs-code-wincc-oa-projects-viewer/actions)
[![GitHub license](https://img.shields.io/github/license/mPokornyETM/vs-code-wincc-oa-projects-viewer.svg)](https://github.com/mPokornyETM/vs-code-wincc-oa-projects-viewer/blob/main/LICENSE)
[![Maintenance](https://img.shields.io/maintenance/yes/2025.svg)](https://github.com/mPokornyETM/vs-code-wincc-oa-projects-viewer)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/mPokornyETM/vs-code-wincc-oa-projects-viewer/blob/main/CONTRIBUTING.md)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

A Visual Studio Code extension for viewing and analyzing [SIMATIC WinCC Open Architecture](https://www.winccoa.com/index.html) projects.

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

## Features

- **Activity Bar Integration**: Adds a "WinCC OA Projects" item to the VS Code activity bar
- **Project Tree View**: Shows all registered WinCC OA projects in a tree view called "Locale Projects"
- **Project Information Display**: For each project, displays:
  - **Name**: The project name (last part of the installation directory)
  - **Visual Labels**: ⭐ Current, 📝 Version, ✅ Runnable status
  - **Location**: The full installation directory path  
  - **Created At**: Installation date
  - **Current Status**: Reads `currentProject` property from pvssInst.conf
  - **Version**: WinCC OA version for runnable projects (extracted from config file)
  - **Company**: Optional company information

---

## Project Organization

Projects are automatically sorted in the following order:

1. **Current Projects** (marked with ⭐): Projects currently active/open
2. **WinCC OA Projects** (🚀): Main runnable projects with valid config files
3. **WinCC OA Extensions** (🧩): Extensions, plugins, add-ons, and sub-projects

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

## Commands

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
