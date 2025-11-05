# WinCC OA Projects Extension - Development Guide

## Overview

This document provides comprehensive information for developers working on the WinCC OA Projects VS Code extension. The extension provides hierarchical project management for WinCC OA (Open Architecture) systems.

## Architecture

### Core Components

#### 1. **WinCCOAProjectProvider** (Tree Data Provider)

The main class that implements `vscode.TreeDataProvider<TreeItem>` and manages the hierarchical project structure.

**Key Methods:**

- `getChildren(element?: TreeItem)` - Returns child items for tree navigation
- `getTreeItem(element: TreeItem)` - Converts elements to VS Code tree items
- `refresh()` - Refreshes the tree view and fires change events
- `createCategories()` - Creates the hierarchical category structure

**Hierarchical Structure:**

```
📍 Current Project
🏃 Runnable Projects
🖥️ WinCC OA System Versions
📦 WinCC OA Sub-Projects
   └── Version 3.20 (5 projects)
   └── Version 3.21 (3 projects)
👤 User Sub-Projects
   └── Version 3.20 (2 projects)
   └── Version Unknown (1 project)
⚠️ Not Registered
```

#### 2. **ProjectCategory** (Tree Category Container)

Represents category nodes in the tree structure that can contain projects or sub-categories.

**Constructor Parameters:**

- `label: string` - Display name for the category
- `projects: WinCCOAProject[]` - Projects contained in this category
- `categoryType` - Type identifier for the category
- `version?: string` - Optional version for version-based categories
- `categoryDescription?: string` - Optional description for tooltips

#### 3. **WinCCOAProject** (Project Tree Item)

Extends `vscode.TreeItem` to represent individual WinCC OA projects in the tree.

**Key Properties:**

- `config: ProjectConfig` - Project configuration from registry/files
- `installationDir: string` - Physical project directory path
- `isRunnable: boolean` - Whether project can be executed
- `isCurrent: boolean` - Whether this is the active project
- `isWinCCOASystem: boolean` - Whether this is a system component
- `version?: string` - Detected WinCC OA version

### Configuration Sources

#### Windows Registry

- **Location**: `HKEY_LOCAL_MACHINE\SOFTWARE\ETM\PVSS II`
- **Content**: Project registration information from WinCC OA installations

#### Configuration Files

- **Windows**: `C:\ProgramData\Siemens\WinCC_OA\pvssInst.conf`
- **Unix**: `/etc/opt/pvss/pvssInst.conf`
- **Format**: INI-style configuration with project sections

### Project Classification System

#### Classification Logic

Projects are automatically classified based on installation paths and characteristics:

1. **Current Project** - Active project (marked in configuration)
2. **Runnable Projects** - Properly configured, executable projects
3. **WinCC OA System Versions** - System installations by version
4. **WinCC OA Sub-Projects** - Components delivered with WinCC OA
5. **User Sub-Projects** - User-created or manually registered projects
6. **Not Registered** - Found but not properly registered projects

#### Path-Based Detection

```typescript
function isWinCCOADeliveredSubProject(project: WinCCOAProject): boolean {
    const installDir = project.config.installationDir.toLowerCase();
    const winccOAPaths = [
        'siemens\\automation\\wincc_oa',
        'wincc_oa',
        'programdata\\siemens\\wincc_oa',
        'program files\\siemens\\wincc_oa',
        '/opt/wincc_oa',
        '/usr/local/wincc_oa'
    ];
    return winccOAPaths.some(path => installDir.includes(path));
}
```

#### Version Detection

```typescript
function extractVersionFromProject(project: WinCCOAProject): string | null {
    // 1. Check direct version field
    if (project.version) return project.version;

    // 2. Extract from project name (e.g., "Project_3.20")
    const nameMatch = project.config.name.match(/(\d+\.\d+)/);
    if (nameMatch) return nameMatch[1];

    // 3. Extract from installation path
    const pathMatch = project.config.installationDir.match(/(\d+\.\d+)/);
    if (pathMatch) return pathMatch[1];

    return null;
}
```

## API Design

### Public API

The extension exports a comprehensive API for other extensions:

```typescript
interface WinCCOAExtensionAPI {
    // Core project management
    getProjects(): WinCCOAProject[];
    getProjectByPath(path: string): WinCCOAProject | undefined;
    getProjectVersion(installationDir: string): string | undefined;
    refreshProjects(): void;

    // Category-based queries
    getProjectCategories(): ProjectCategory[];
    getRunnableProjects(): WinCCOAProject[];
    getSubProjects(): WinCCOAProject[];

    // Version-based queries
    getWinCCOASystemVersions(): WinCCOAProject[];
    getSubProjectsByVersion(version: string): WinCCOAProject[];

    // Specialized queries
    getWinCCOADeliveredSubProjects(): WinCCOAProject[];
    getUserSubProjects(): WinCCOAProject[];

    // Configuration
    getRegisteredProjects(): ProjectConfig[];
    getPvssInstConfPath(): string;
}
```

### Usage Example

```typescript
// Get the extension API
const winccExtension = vscode.extensions.getExtension('mPokornyETM.wincc-oa-projects');
if (winccExtension && winccExtension.isActive) {
    const api = winccExtension.exports.getAPI();

    // Get all runnable projects
    const runnableProjects = api.getRunnableProjects();

    // Get projects by version
    const v320Projects = api.getSubProjectsByVersion('3.20');

    // Get WinCC OA delivered components
    const deliveredProjects = api.getWinCCOADeliveredSubProjects();
}
```

## Development Setup

### Prerequisites

- Node.js (v16 or later)
- VS Code (v1.105.0 or later)
- TypeScript compiler
- Git

### Environment Setup

```bash
# Clone repository
git clone <repository-url>
cd vs-code-wincc-oa-projects-viewer

# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch mode for development
npm run watch
```

### Project Structure

```
├── src/
│   ├── extension.ts          # Main extension code
│   └── test/
│       ├── extension.test.ts # Unit tests
│       └── integration.test.ts # Integration tests
├── docs/
│   ├── USER_GUIDE.md        # User documentation
│   └── DEVELOPMENT.md       # This file
├── package.json             # Extension manifest
├── tsconfig.json           # TypeScript configuration
└── README.md               # Project overview
```

### Build Scripts

- `npm run compile` - Compile TypeScript to JavaScript
- `npm run watch` - Watch mode for development
- `npm run test` - Run test suite
- `npm run lint` - Run ESLint checks
- `npm run package` - Create VSIX package

## Testing

### Unit Tests

Located in `src/test/extension.test.ts`, covering:

- Cross-platform path resolution
- Project version detection
- WinCC OA vs user project classification
- Tree data provider functionality
- API functions

### Integration Tests

Located in `src/test/integration.test.ts`, covering:

- Extension activation
- Command registration
- Tree view integration
- API accessibility
- Error handling

### Running Tests

```bash
# Run all tests
npm run test

# Run specific test suite
npm test -- --grep "Version Detection"

# Debug tests in VS Code
# Press F5 to launch Extension Development Host
# Use Ctrl+Shift+P > "Developer: Reload Window" to restart
```

### Test Coverage Areas

- ✅ Path resolution across platforms
- ✅ Project categorization logic
- ✅ Version extraction algorithms
- ✅ API function completeness
- ✅ Tree structure validation
- ✅ Error handling scenarios

## Configuration Management

### Cross-Platform Paths

```typescript
function getPvssInstConfPath(): string {
    if (os.platform() === 'win32') {
        return path.join('C:', 'ProgramData', 'Siemens', 'WinCC_OA', 'pvssInst.conf');
    } else {
        return path.join('/etc', 'opt', 'pvss', 'pvssInst.conf');
    }
}
```

### Configuration File Parsing

The extension parses INI-style configuration files:

```ini
[Project1]
InstallationDir="C:\Projects\MyProject"
InstallationDate="2024-01-01 10:00:00"
NotRunnable=false

[Project2]
InstallationDir="C:\WinCC_OA\3.20\projects\BACnet"
InstallationDate="2024-01-01 10:00:00"
NotRunnable=false
```

### Registry Integration (Windows)

On Windows, the extension also reads from the Windows Registry for additional project information.

## Performance Considerations

### Lazy Loading

- Projects are loaded on-demand when tree nodes expand
- Large project lists are handled efficiently with virtual scrolling
- Configuration files are cached and only re-read when changed

### Memory Management

- Tree items are created lazily to minimize memory usage
- Event listeners are properly disposed when extension deactivates
- File watchers monitor configuration changes without polling

### Scalability

- Supports hundreds of projects without performance degradation
- Hierarchical categorization reduces visual complexity
- Smart refresh minimizes unnecessary tree updates

## Extension Points

### Commands

- `winccOAProjects.refresh` - Manually refresh project list
- `winccOAProjects.openProject` - Open project in current window
- `winccOAProjects.openProjectNewWindow` - Open in new window
- `winccOAProjects.openInExplorer` - Open in file explorer
- `winccOAProjects.showProjectView` - Focus on tree view

### Context Menu Contributions

- Available on `winccOAProject` context
- Supports multi-selection operations
- Conditional visibility based on project type

### Activity Bar Integration

- Custom tree view in activity bar
- Icon and title customization
- Collapsible category support

## Error Handling

### Graceful Degradation

- Missing configuration files don't crash extension
- Invalid project paths are handled gracefully
- Permission errors are logged but don't interrupt functionality

### Logging Strategy

- Uses VS Code's output channels for debugging
- Different log levels for development vs production
- Structured logging for better troubleshooting

### Recovery Mechanisms

- Automatic retry for temporary file system issues
- Fallback to registry when config files unavailable
- User notifications for critical errors only

## Future Enhancements

### Planned Features

- [ ] Real-time project status monitoring
- [ ] Integration with WinCC OA project tools
- [ ] Custom project templates support
- [ ] Remote project management capabilities
- [ ] Enhanced search and filtering

### Technical Debt

- [ ] Improve test coverage for edge cases
- [ ] Add performance benchmarking
- [ ] Implement configuration schema validation
- [ ] Add internationalization support

## Contributing

### Code Style

- Use TypeScript strict mode
- Follow VS Code extension guidelines
- Maintain backward compatibility
- Add comprehensive tests for new features

### Pull Request Process

1. Create feature branch from main
2. Implement changes with tests
3. Update documentation as needed
4. Ensure all tests pass
5. Submit pull request with detailed description

### Release Process

1. Update version in package.json
2. Update CHANGELOG.md
3. Create release tag
4. Publish to VS Code Marketplace
5. Update GitHub release notes

## Troubleshooting

### Common Issues

1. **Projects not showing**: Check pvssInst.conf file permissions
2. **Incorrect categorization**: Verify installation paths match expected patterns
3. **Performance issues**: Check for very large project lists or network drives
4. **Version detection fails**: Ensure project names or paths contain version numbers

### Debug Information

- Check VS Code Developer Console for errors
- Enable verbose logging in extension settings
- Use "Developer: Reload Window" to restart extension
- Verify WinCC OA installation and registration

### Support Channels

- GitHub Issues for bugs and feature requests
- Discussions for usage questions
- Documentation for comprehensive guides
