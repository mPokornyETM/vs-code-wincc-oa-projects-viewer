# WinCC OA Pmon Project Status Check Feature

## Overview

This feature provides the ability to check if WinCC OA projects are currently running using the WCCILpmon process monitor. It leverages the `WCCILpmon.exe -proj "<project_name>" -status` command to determine the current state of a project's pmon process.

## Key Changes Made

### 1. **Corrected WCCILpmon Arguments**

- **Fixed**: Changed from `-project` to `-proj` argument as per WCCILpmon specification
- **Command**: `WCCILpmon.exe -proj "<project_name>" -status`

### 2. **Renamed Components for Clarity**

- **Enum**: `ProjectRunningStatus` → `PmonProjectRunningStatus`
- **Command**: `winccOAProjects.checkProjectStatus` → `winccOAProjects.checkPmonProjectStatus`
- **Rationale**: Clarifies that we're checking the pmon process status, not the project itself

### 3. **Status Interpretation**

The feature correctly interprets WCCILpmon exit codes:

- **Exit Code 0**: Pmon is RUNNING
- **Exit Code 3**: Pmon is STOPPED
- **Exit Code 4**: Pmon status is UNKNOWN

## Implementation Details

### Core Functions

```typescript
export enum PmonProjectRunningStatus {
    RUNNING = 'running', // Exit code 0: pmon is running
    STOPPED = 'stopped', // Exit code 3: pmon is stopped
    UNKNOWN = 'unknown' // Exit code 4: unknown status
}

export async function checkProjectRunningStatus(project: WinCCOAProject): Promise<PmonProjectRunningStatus>;
export async function isProjectRunning(project: WinCCOAProject): Promise<boolean>;
```

### VS Code Integration

#### Command

- **ID**: `winccOAProjects.checkPmonProjectStatus`
- **Title**: "WinCC OA: Check Pmon Project Status"
- **Icon**: `$(pulse)`

#### Tree View Integration

- **Context Value**: `winccOAProjectRunnable` for runnable projects
- **Inline Button**: Status check button (pulse icon) for runnable projects
- **Context Menu**: Right-click option for runnable projects

#### Command Palette

- Available via Command Palette: "WinCC OA: Check Pmon Project Status"
- Shows quick pick for runnable projects if none selected

### Safety & Validation

- ✅ **Runnable Projects Only**: Status check restricted to user projects (excludes system installations)
- ✅ **Version Validation**: Ensures appropriate WCCILpmon version is available
- ✅ **Error Handling**: Comprehensive error handling with user-friendly messages
- ✅ **Process Isolation**: Uses child_process.spawn with proper cleanup

### User Experience

#### Status Display

- **Running**: ✅ "Project 'ProjectName' is currently RUNNING."
- **Stopped**: ⏹️ "Project 'ProjectName' is currently STOPPED."
- **Unknown**: ❓ "Project 'ProjectName' status is UNKNOWN."

#### Output Logging

All operations are logged to the "WinCC OA Projects" output channel with detailed information:

- Command execution details
- Exit codes and interpretation
- Error messages and troubleshooting information

## Usage Examples

### Programmatic Usage

```typescript
// Check status and get enum value
const status = await checkProjectRunningStatus(project);
console.log(status); // 'running', 'stopped', or 'unknown'

// Check if running (boolean)
const isRunning = await isProjectRunning(project);
console.log(isRunning); // true or false (throws error for unknown)
```

### User Interface

1. **Tree View Button**: Click pulse icon ($(pulse)) on runnable projects
2. **Context Menu**: Right-click runnable project → "WinCC OA: Check Pmon Project Status"
3. **Command Palette**: `Ctrl+Shift+P` → "WinCC OA: Check Pmon Project Status"

## Testing

The feature includes comprehensive unit tests covering:

- Enum values validation
- Project type validation (runnable vs system)
- Error handling scenarios
- Command execution flow

**Test Coverage**: 171/171 tests passing

## Future Enhancements

This foundation enables future WCCILpmon process management features:

- Start/stop/restart projects
- Manager-level control (start/stop individual components)
- Real-time status monitoring
- Process health monitoring

## Technical Notes

- **Command Format**: `WCCILpmon.exe -proj "<project_name>" -status`
- **Exit Code Mapping**: 0=running, 3=stopped, 4=unknown
- **Platform Support**: Windows and Linux WinCC OA installations
- **Process Management**: Uses Node.js child_process.spawn for execution
- **Error Recovery**: Graceful handling of missing executables and command failures
