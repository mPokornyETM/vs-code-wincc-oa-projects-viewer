# WinCC OA Projects Extension - User Guide

## Overview

The WinCC OA Projects extension provides a comprehensive view of all your WinCC OA (Open Architecture) projects directly within VS Code. It automatically discovers projects from your system configuration and organizes them into a hierarchical tree structure for easy navigation and management.

## Supported WinCC OA Versions

The extension supports a wide range of WinCC OA versions with intelligent version detection and categorization:

### ✅ **Fully Supported Versions**
- **WinCC OA 3.20** - Latest stable version with full feature support
- **WinCC OA 3.19** - Stable version with complete compatibility
- **WinCC OA 3.18** - Legacy support with core functionality
- **WinCC OA 3.17** - Legacy support with core functionality

### 🚀 **Upcoming Versions**
- **WinCC OA 3.21** - Coming soon! Prepared for future compatibility

### 🔍 **Version Detection**
The extension automatically detects WinCC OA versions from multiple sources:
- **Project Configuration**: Reads version from `config/config` files
- **Installation Paths**: Extracts version from directory structure (e.g., `/3.20/`, `/3.19/`)
- **Project Names**: Detects version patterns in project names (e.g., `Project_v3.20`, `Demo_3.19`)
- **Registry Entries**: Windows registry version information
- **System Installation**: Detects installed WinCC OA system versions

### 📋 **Version-Specific Features**
- **Version Categorization**: Projects automatically grouped by detected version
- **Compatibility Checks**: Version-aware project validation
- **System Integration**: Seamless integration with WinCC OA version management
- **Legacy Support**: Backwards compatibility with older project formats

### ⚠️ **Version Compatibility Notes**
- **Mixed Versions**: Extension handles multiple WinCC OA versions simultaneously
- **Unknown Versions**: Projects without detectable versions placed in "Version Unknown" category
- **Future Versions**: Basic support for newer versions through intelligent detection
- **Custom Installations**: Supports non-standard installation paths and configurations

## Features

### 📁 Project Discovery

- Automatically scans Windows registry and configuration files
- Discovers all registered WinCC OA projects on your system
- Cross-platform support (Windows and Unix-based systems)

### 🗂️ Hierarchical Organization

Projects are automatically organized into the following categories:

#### 1. **Current Project**

The currently active WinCC OA project (if any)

#### 2. **Runnable Projects**

Projects that are configured and ready to run

- Local projects you've created or imported
- Properly configured project directories

#### 3. **WinCC OA System Versions**

System installations organized by version

- Example: `WinCC OA 3.20`, `WinCC OA 3.21`
- Shows installed system components

#### 4. **WinCC OA Sub-Projects**

Sub-projects delivered with WinCC OA installations

- Organized by version (e.g., `3.20`, `3.21`)
- Includes system examples and templates
- Distinguished from user-created projects

#### 5. **User Sub-Projects**

User-created or manually registered sub-projects

- Organized by version when available
- Your custom project components

#### 6. **Not Registered**

Projects found in directories but not properly registered

- May need manual configuration
- Potential orphaned projects

## Getting Started

### Installation
1. Install the extension from the VS Code Marketplace
2. The extension will automatically activate when VS Code starts

### First Use
1. Open the **Activity Bar** on the left side of VS Code
2. Look for the **WinCC OA Projects** icon (📁)
3. Click to open the projects view
4. The extension will automatically scan for projects

## Using the Extension

### Project Tree View

The main interface is a tree view showing all your projects organized by category:

```
WinCC OA Projects
├── 📍 Current Project
│   └── MyActiveProject
├── 🏃 Runnable Projects (3)
│   ├── Project1
│   ├── Project2
│   └── Project3
├── 🖥️ WinCC OA System Versions
│   ├── WinCC OA 3.20
│   └── WinCC OA 3.21
├── 📦 WinCC OA Sub-Projects
│   ├── 3.20 (5 projects)
│   │   ├── ExampleProject
│   │   └── TemplateProject
│   └── 3.21 (3 projects)
├── 👤 User Sub-Projects
│   └── 3.20 (2 projects)
└── ⚠️ Not Registered (4 projects)
    ├── UnregisteredProject1
    ├── UnregisteredProject2
    ├── UnregisteredProject3
    └── UnregisteredProject4
```

### Project View with Documentation Support

When you select a project from the tree view, a detailed project view opens showing comprehensive information including project configuration and documentation:

![Project View Documentation](images/project-view-documentation.png)

The project view includes:
- **📚 Project Documentation** - Tabbed interface for README, LICENSE, SECURITY files
- **⚙️ Project Configuration** - Organized tabs for different config files (config, config.level, config.http, etc.)
- **📖 Official WinCC OA Documentation Links** - Direct links to official documentation for each configuration file
- **📋 Mandatory Documentation Validation** - Shows "Sorry, the information is missing" for required files not found
- **🔗 Interactive Links** - Clickable links to official WinCC OA documentation for newcomers

### Context Menu Actions

Right-click on any project to access these actions:

- **Open Project** - Open the project in current VS Code window
- **Open in New Window** - Open the project in a new VS Code window  
- **Open in Explorer** - Open the project directory in file explorer
- **Show Project View** - Focus on the project in the tree view
- **Unregister Project** - Remove the project from WinCC OA configuration (with confirmation)

### Toolbar Actions

- **🔄 Refresh** - Manually refresh the project list
- **🔍 Filter** - Open project filter for real-time search
- **⚙️ Settings** - Open extension settings

### Smart Filtering

The extension provides powerful real-time filtering capabilities:

#### Using the Filter
1. Click the **🔍 Filter** icon in the toolbar
2. Type your search term in the filter input
3. See projects filtered in real-time across all categories
4. Click the **✖** button or clear the input to show all projects

#### Filter Features
- **Real-time Results**: Projects are filtered as you type
- **Cross-category Search**: Searches all project types simultaneously  
- **Case-insensitive**: Search works regardless of capitalization
- **Partial Matching**: Find projects with partial name matches
- **Hierarchy Preserved**: Maintains category structure during filtering

### Project Registration

The extension can discover and register new projects:

#### Unregistered Projects
- Automatically scans for projects not registered with WinCC OA
- Shows discovered projects in the "⚠️ Not Registered" category
- Provides visual indicators for projects needing attention

#### Registration Methods
1. **Individual Registration**:
   - Right-click on directories in file explorer
   - Select "Register Runnable Project" or "Register Sub-Project"
   - Choose appropriate registration type based on project structure

2. **Bulk Registration**:
   - Right-click on "⚠️ Not Registered" category
   - Select "Register All Unregistered Projects"  
   - Registers all discovered projects automatically

#### Registration Validation
- **Structure Checks**: Validates project directory structure
- **Version Detection**: Automatically extracts WinCC OA version
- **Duplicate Prevention**: Prevents re-registering existing projects
- **Error Reporting**: Clear feedback on registration issues

## Project Information

Each project displays:
- **📁 Project Name** - The project's display name
- **📍 Status Indicators**:
  - ⚡ Current project (active)
  - ✅ Runnable project
  - ⚠️ Not registered
  - 🏗️ Sub-project
- **📊 Version** - WinCC OA version (when available)
- **📂 Path** - Installation directory

## Configuration

### Automatic Detection
The extension automatically detects projects from:
- Windows Registry (`HKEY_LOCAL_MACHINE\SOFTWARE\ETM\PVSS II`)
- Configuration files (`pvssInst.conf`)

### Manual Configuration
If projects aren't detected automatically:
1. Check that projects are properly registered with WinCC OA
2. Verify configuration file locations:
   - Windows: `C:\ProgramData\Siemens\WinCC_OA\pvssInst.conf`
   - Unix: `/etc/opt/pvss/pvssInst.conf`

## Troubleshooting

### No Projects Shown
1. **Check Installation**: Ensure WinCC OA is properly installed
2. **Verify Permissions**: VS Code needs read access to configuration files
3. **Manual Refresh**: Click the refresh button (🔄) in the toolbar
4. **Check Logs**: Open VS Code Developer Tools for error messages

### Missing Projects
1. **Registration**: Ensure projects are registered with WinCC OA
2. **Path Issues**: Verify project directories exist and are accessible
3. **Configuration**: Check `pvssInst.conf` file for project entries

### Performance Issues
1. **Large Project Lists**: The extension handles hundreds of projects efficiently
2. **Network Drives**: Projects on network drives may load slower
3. **Refresh Rate**: Automatic refresh occurs when configuration changes

### Registration Issues
1. **Registration Fails**: Check project directory structure and permissions
2. **Duplicate Projects**: Use duplicate prevention - extension prevents re-registration
3. **Invalid Project Structure**: Ensure runnable projects have `config/config` file
4. **Unregistered Projects Not Found**: Check common project locations and permissions

### Filter Issues  
1. **Filter Not Working**: Ensure filter input is active and properly typed
2. **No Results**: Check spelling and try partial matches
3. **Clear Filter**: Use the clear button (✖) or delete all text in filter input

### Version Detection Issues
1. **Version Not Detected**: 
   - Check project name contains version pattern (e.g., "_3.20", "_v3.19")
   - Verify installation path includes version directory
   - Ensure `config/config` file contains version information
2. **Wrong Version Detected**: 
   - Check for multiple version indicators in project path/name
   - Verify WinCC OA installation directory structure
   - Review project configuration files for version conflicts
3. **Mixed Version Projects**: 
   - Extension handles multiple versions automatically
   - Each project categorized by its detected version
   - No action required - this is normal behavior
4. **Unsupported Version**: 
   - Projects with unrecognized versions placed in "Version Unknown"
   - Basic functionality still available
   - Consider updating to supported WinCC OA version

## API for Developers

The extension provides a comprehensive API for other extensions:

```typescript
// Get the extension API
const winccExtension = vscode.extensions.getExtension('mPokornyETM.wincc-oa-projects');
const api = winccExtension.exports.getAPI();

// Available functions
api.getProjects();                    // All projects
api.getRunnableProjects();            // Only runnable projects  
api.getWinCCOASystemVersions();       // System versions
api.getWinCCOADeliveredSubProjects(); // WinCC OA sub-projects
api.getUserSubProjects();             // User sub-projects
api.getUnregisteredProjects();        // Unregistered projects
api.refreshProjects();                // Refresh project list
api.registerProject(path, type);      // Register a project programmatically
api.unregisterProject(project);       // Unregister a project programmatically
api.filterProjects(searchTerm);       // Filter projects by search term
```

## Advanced Features

### Version Detection and Compatibility
The extension provides comprehensive version detection and compatibility management:

#### **Multi-Source Version Detection**
- **Project Names**: Pattern matching (e.g., "MyProject_3.20", "Demo_v3.19")
- **Installation Paths**: Directory structure analysis (`/WinCC_OA/3.20/projects/`)
- **Configuration Files**: Version parsing from `config/config` files
- **Registry Data**: Windows registry version information extraction
- **System Detection**: Automatic discovery of installed WinCC OA versions

#### **Version Compatibility Matrix**
| WinCC OA Version | Support Level | Features Available | Notes |
|------------------|---------------|-------------------|-------|
| 3.21 | 🚀 Future | All features | Coming soon! Prepared for compatibility |
| 3.20 | ✅ Full | All features | Latest stable version, fully tested |
| 3.19 | ✅ Full | All features | Stable version, complete support |
| 3.18 | ⚠️ Legacy | Core features | Legacy support, essential functions |
| 3.17 | ⚠️ Legacy | Basic features | Minimal support for maintenance |
| Unknown | 🔄 Auto-detect | Variable | Attempts automatic feature detection |

#### **Version-Specific Behaviors**
- **Project Validation**: Version-aware structure validation
- **Feature Availability**: Automatic feature enabling/disabling based on version
- **Compatibility Warnings**: Notifications for potential version conflicts
- **Migration Support**: Guidance for upgrading between versions

### Path Classification
Intelligent classification determines project types:
- **System Projects**: Located in WinCC OA installation directories
- **User Projects**: Located in custom directories
- **Sub-Projects**: Nested within other projects

### Cross-Platform Support
- Windows: Registry and `ProgramData` locations
- Linux/Unix: Standard `/etc/opt/pvss` locations
- Automatic path detection based on operating system

## Support

### Getting Help
1. **Documentation**: Check the README.md file
2. **Issues**: Report bugs on the project repository
3. **Discussions**: Join community discussions

### Contributing
The extension is open source. Contributions welcome:
1. Fork the repository
2. Create a feature branch
3. Submit a pull request

## Version History

See `CHANGELOG.md` for detailed version history and updates.

## License

This extension is licensed under the MIT License. See `LICENSE` file for details.