# WinCC OA Version Information Feature

## Overview

This feature provides detailed WinCC OA version information using the `WCCILpmon.exe -version` command. It extracts comprehensive build details including version number, platform, architecture, build date, and commit hash.

## Features

### Command Integration

- **Command Palette**: `WinCC OA: Show Detailed Version Information`
- **Context Menu**: Right-click on WinCC OA system projects
- **Project View**: Automatic display in project panels

### Interactive Elements

- Copy version info to clipboard
- Display details in VS Code output channel
- Retry functionality for failed requests
- User-friendly error handling with retry options

## Technical Implementation

### Core Functions

**`getDetailedVersionInfo(project)`**

- Executes WCCILpmon.exe -version command
- Parses output to extract structured information
- Returns detailed version data object

**`parseVersionOutput(output, executablePath)`**

- Uses regex patterns to parse WCCILpmon output
- Extracts version, platform, build date, commit hash
- Handles parsing failures gracefully

**`showVersionInfoDialog(versionInfo)`**

- Creates formatted markdown document
- Integrates clipboard and output channel functionality
- Shows user-friendly summary messages

### Project View Integration

**`_getVersionInfoSection(project)`**

- Generates HTML section for project view panels
- Only executes for WinCC OA system installations
- Includes interactive buttons and error handling

**Webview Message Handling**

- `copyToClipboard`: System clipboard integration
- `showInOutput`: VS Code output channel display
- `retryVersionInfo`: Panel refresh for retry attempts

## Example Output

### Raw Command Output

```text
WCCILpmon    (1), 2025.11.03 15:15:01.846: 3.20.5 platform Windows AMD64 linked at Mar  2 2025 09:51:08 (faf9f4332a)
WCCILpmon    (1), 2025.11.03 15:15:01.847: exit(1) called!
```

### Parsed Information

- **Version**: 3.20.5
- **Platform**: Windows AMD64
- **Build Date**: Mar 2 2025 09:51:08
- **Commit Hash**: faf9f4332a
- **Executable**: C:\Siemens\Automation\WinCC_OA\3.20\bin\WCCILpmon.exe

## User Interface

### Project View Display

The version information appears as an integrated section in project view panels:

```html
🔧 Detailed Version Information Version: 3.20.5 Platform: Windows AMD64 Build Date: Mar 2 2025 09:51:08 Commit Hash:
faf9f4332a [📋 Copy to Clipboard] [📄 Show in Output]
```

### Error Handling

When version retrieval fails, users see:

```html
⚠️ Unable to retrieve version information Error: WCCILpmon not found for version... This feature requires WCCILpmon.exe
to be accessible. [🔄 Retry]
```

## Configuration

### Context Values

- **`winccOASystemProject`**: Enables version info for WinCC OA systems
- Controls command visibility and project view integration

### Command Registration

```json
{
    "command": "winccOAProjects.getVersionInfo",
    "title": "WinCC OA: Show Detailed Version Information",
    "icon": "$(info)"
}
```

## Testing Scenarios

### Success Cases

1. WCCILpmon.exe exists and executes successfully
2. Multiple WinCC OA versions available for selection
3. Project view integration displays automatically

### Error Cases

1. Missing or inaccessible WCCILpmon.exe
2. Unexpected command output format
3. Command execution failures

### Recovery Features

1. Retry mechanism for failed requests
2. Clear error messages explaining issues
3. Fallback to basic project information

## Benefits

### For Developers

- Quick access to detailed build information
- Build dates and commit hashes for debugging
- Platform and architecture verification

### For System Administrators

- Installation auditing capabilities
- Version compatibility checking
- Support case documentation

### For Project Management

- Version tracking for documentation
- Release planning information
- Compliance record keeping

## Performance

- Command execution: ~100-500ms
- Output parsing: <10ms
- UI rendering: ~50ms
- No caching (ensures fresh information)

## Future Enhancements

- Batch version retrieval for all installations
- Version comparison between installations
- Export functionality to various formats
- Integration with release notes and documentation
- Performance caching with TTL
- System health monitoring integration
