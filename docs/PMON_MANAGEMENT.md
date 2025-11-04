# WinCC OA Pmon Management

This document describes the comprehensive Process Monitor (pmon) management functionality in the WinCC OA Projects extension.

## Features Overview

The extension provides full lifecycle management for WinCC OA projects through the integrated Process Monitor (WCCILpmon.exe). This includes project control, individual manager operations, and comprehensive status monitoring.

## Project Control Operations

### Start Pmon (Monitoring Only)
- **Command**: `WinCC OA: Start Pmon (Monitoring Only)`
- **WCCILpmon args**: `-proj "<project_name>" -noAutoStart`
- **Description**: Starts the process monitor without automatically starting the project managers
- **Use case**: When you want to monitor a project but start managers manually

### Start Project
- **Command**: `WinCC OA: Start Project`
- **WCCILpmon args**: 
  - If pmon not running: `-proj "<project_name>"`
  - If pmon running: `-proj "<project_name>" -command START_ALL:`
- **Description**: Starts the entire project with all configured managers
- **Auto-detection**: Automatically detects if pmon is already running and uses appropriate command

### Stop Project
- **Command**: `WinCC OA: Stop Project`
- **WCCILpmon args**: `-proj "<project_name>" -command STOP_ALL:`
- **Description**: Stops all project managers while keeping pmon running

### Stop Project + Pmon
- **Command**: `WinCC OA: Stop Project + Pmon`
- **WCCILpmon args**: `-proj "<project_name>" -stopWait`
- **Description**: Stops all project managers and the process monitor

### Restart Project
- **Command**: `WinCC OA: Restart Project`
- **WCCILpmon args**: `-proj "<project_name>" -command RESTART_ALL:`
- **Description**: Restarts all project managers

### Set Pmon Wait Mode
- **Command**: `WinCC OA: Set Pmon Wait Mode`
- **WCCILpmon args**: `-proj "<project_name>" -command WAIT_MODE:`
- **Description**: Sets the process monitor to wait mode

## Manager Operations

### Individual Manager Control
All manager operations work with manager indices (0, 1, 2, ...).

#### Start Manager
- **Command**: `WinCC OA: Start Manager`
- **WCCILpmon args**: `-proj "<project_name>" -command SINGLE_MGR:START <idx>`
- **Description**: Starts a specific manager by index

#### Stop Manager
- **Command**: `WinCC OA: Stop Manager`
- **WCCILpmon args**: `-proj "<project_name>" -command SINGLE_MGR:STOP <idx>`
- **Description**: Stops a specific manager by index

#### Kill Manager
- **Command**: `WinCC OA: Kill Manager`
- **WCCILpmon args**: `-proj "<project_name>" -command SINGLE_MGR:KILL <idx>`
- **Description**: Forcefully kills a specific manager by index

#### Remove Manager
- **Command**: `WinCC OA: Remove Manager`
- **WCCILpmon args**: `-proj "<project_name>" -command SINGLE_MGR:DEL <idx>`
- **Description**: Removes a manager from the configuration by index

## Status and Information

### Project Status Overview
- **Command**: `WinCC OA: Show All Runnable Project Status`
- **Description**: Shows a comprehensive overview of all runnable projects with their status
- **Features**:
  - Pmon running/stopped status
  - Manager count and running manager count
  - Last update timestamps
  - Error reporting

### Manager Information
#### Manager List
- **Command**: `WinCC OA: Show Manager List`
- **WCCILpmon args**: `-proj "<project_name>" -command MGRLIST:LIST`
- **Description**: Shows configured managers with their properties

#### Manager Status
- **Command**: `WinCC OA: Show Manager Status`
- **WCCILpmon args**: `-proj "<project_name>" -command MGRLIST:STATI`
- **Description**: Shows current status of all managers including PID and running state

### Refresh Operations
#### Refresh All Status
- **Command**: `WinCC OA: Refresh All Project Status`
- **Description**: Refreshes pmon status for all runnable projects
- **Features**:
  - Parallel status checking
  - Summary of running/stopped/unknown projects
  - Error reporting for failed checks

## User Interface Integration

### Tree View Context Menus
All pmon management commands are available in the tree view context menu for runnable projects:
- Right-click on any runnable project to access pmon commands
- Commands are organized into logical groups:
  - **Pmon Control**: Start pmon only, start project, stop project, stop project + pmon, restart project, wait mode
  - **Manager Operations**: Show manager list, show manager status, start/stop/kill/remove managers

### Command Palette
All commands are available through VS Code's Command Palette (`Ctrl+Shift+P`):
- Search for "WinCC OA" to see all available commands
- Commands include descriptive titles and icons

### View Title Actions
The tree view title bar includes:
- **Refresh All Project Status**: Button to refresh status for all projects
- **Show All Runnable Project Status**: Button to show comprehensive status overview

## Status Monitoring

### Project Running Status
The extension uses exit codes from WCCILpmon to determine project status:
- **Exit Code 0**: Project is running
- **Exit Code 3**: Project is stopped  
- **Exit Code 4**: Project status is unknown
- **Other codes**: Error condition

### Status Enum
```typescript
enum PmonProjectRunningStatus {
    RUNNING = 'RUNNING',
    STOPPED = 'STOPPED', 
    UNKNOWN = 'UNKNOWN'
}
```

### Manager Status
Manager status is parsed from WCCILpmon output and includes:
- Manager index
- Manager name (e.g., WCCOAdata, WCCOAui, WCCOAevent)
- Current status (running, stopped, etc.)
- Process ID (PID) when running
- Configuration (start mode, restart count, etc.)

## Error Handling

### Validation
- All operations validate that projects are runnable
- System projects (WinCC OA installation) are excluded from pmon operations
- WCCILpmon executable availability is checked before operations

### Error Reporting
- Detailed error messages in VS Code Output panel
- User-friendly notifications for common errors
- Graceful handling of missing or invalid projects

### Logging
All pmon operations are logged to the "WinCC OA Projects" output channel with:
- Command execution details
- Success/failure status
- Error messages and troubleshooting information

## Advanced Operations (Future Extensions)

The infrastructure supports additional manager operations that can be implemented:

### Manager Configuration
```
-command SINGLE_MGR:DEBUG <idx> <args>         # Set debug flags
-command SINGLE_MGR:INS <idx> <manager> ...    # Insert new manager  
-command SINGLE_MGR:PROP_PUT <idx> ...         # Update manager properties
-command SINGLE_MGR:PROP_GET <idx>             # Get manager properties
```

### Project Information
```
-command PROJECT:                               # Check which project is running
```

## Best Practices

### Project Management Workflow
1. **Start Development**: Use "Start Pmon (Monitoring Only)" to start monitoring
2. **Start Specific Managers**: Use individual manager start commands as needed
3. **Development Testing**: Use "Start Project" for full system testing
4. **Shutdown**: Use "Stop Project + Pmon" for complete shutdown

### Status Monitoring
1. Use "Refresh All Project Status" regularly to monitor multiple projects
2. Check "Show All Runnable Project Status" for comprehensive overview
3. Use individual manager status for detailed troubleshooting

### Error Resolution
1. Check VS Code Output panel for detailed error information
2. Verify WinCC OA installation and project configuration
3. Ensure projects are properly registered and runnable

## Performance Considerations

### Parallel Operations
- Status checks for multiple projects run in parallel
- Individual project operations are executed asynchronously
- UI remains responsive during long-running operations

### Resource Management
- Detached process execution prevents blocking
- Proper cleanup of child processes
- Error timeout handling

### User Experience
- Progress indicators for long operations
- Informative status messages
- Clear error reporting and recovery guidance

## Technical Implementation

### Process Execution
- Uses Node.js `child_process.spawn()` for WCCILpmon execution
- Detached processes for fire-and-forget operations
- Stream handling for real-time output capture

### Command Structure
All WCCILpmon commands follow the pattern:
```
WCCILpmon.exe -proj "<project_name>" [additional_arguments]
```

### Status Parsing
- Exit code interpretation for project status
- Output parsing for manager information
- Error handling for malformed responses

This comprehensive pmon management system provides full control over WinCC OA project lifecycle through an intuitive VS Code interface.