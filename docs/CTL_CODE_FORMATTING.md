# WinCC OA CTRL Code Formatting

This extension provides comprehensive code formatting for WinCC OA CTRL (.ctl) files using the `astyle.exe` tool included with WinCC OA installations.

## Features

### Automatic Detection

- **astyle.exe**: Automatically detected from WinCC OA installation directory
- **astyle.config**: Auto-detected from `{WinCC_OA_Install}\config\astyle.config`
- **Version-aware**: Works with multiple WinCC OA versions (3.17-3.21+)

### Flexible Formatting Options

- **Format Active File**: Format the currently open .ctl file
- **Format from Explorer**: Right-click any .ctl file in the file explorer
- **Format Folder**: Recursively format all .ctl files in a folder
- **Format Workspace**: Format all .ctl files in the entire workspace

### Smart Features

- **Extension-less Files**: Prompts to format files without .ctl extension
- **Dirty File Handling**: Automatically saves unsaved changes before formatting
- **Output Logging**: Detailed formatting logs in "WinCC OA Formatting" OUTPUT channel
- **No Backup Files**: Doesn't create .orig backup files by default (configurable)

## Usage

### Format Active File

1. Open a .ctl file in the editor
2. Open Command Palette (Ctrl+Shift+P)
3. Run: `WinCC OA: Format CTRL File`

**Or use the keyboard shortcut** (if configured)

### Format from Explorer

1. Right-click a .ctl file in the Explorer
2. Select `WinCC OA: Format CTRL File`

### Format Folder

1. Right-click a folder in the Explorer
2. Select `WinCC OA: Format All CTRL Files in Folder`
3. Confirm the operation

### Format Workspace

1. Open Command Palette (Ctrl+Shift+P)
2. Run: `WinCC OA: Format All CTRL Files`
3. Confirm the number of files to format

## Configuration

### Settings

Configure the extension in VS Code Settings (File > Preferences > Settings):

```json
{
  // Path to astyle.exe (auto-detected if not specified)
  "winccOAProjects.astylePath": "",

  // Path to astyle.config (auto-detected if not specified)
  "winccOAProjects.astyleConfigPath": "",

  // Create .orig backup files when formatting (default: false)
  "winccOAProjects.astyleCreateBackup": false
}
```

### Auto-Detection Paths

The extension searches for `astyle.exe` in the following locations:

1. **PVSS_II Environment Variable**: `%PVSS_II%\bin\astyle.exe`
2. **Project Config**: Path from project's `config/config` file
3. **Common Paths**:
   - `C:\Siemens\Automation\WinCC_OA\{version}\bin\astyle.exe`
   - `C:\WinCC_OA\{version}\bin\astyle.exe`
   - `D:\Siemens\Automation\WinCC_OA\{version}\bin\astyle.exe`

The extension searches for `astyle.config` in:

- `{WinCC_OA_Install}\config\astyle.config`

### Manual Configuration

If auto-detection fails, you'll be prompted to manually select:

1. **astyle.exe location**: Browse to your WinCC OA installation's bin folder
2. **astyle.config location** (optional): Browse to your custom config file

The extension saves your selections in workspace settings for future use.

## astyle.config

The `astyle.config` file contains formatting rules for CTRL code. Example location:

```
C:\Siemens\Automation\WinCC_OA\3.20\config\astyle.config
```

### Using Custom Config

To use a custom astyle configuration:

1. Create your own `astyle.config` file
2. Set `winccOAProjects.astyleConfigPath` to your file path
3. The extension will use your custom config instead of the default

### Default Formatting Style

If no config file is found, the extension uses these default options:

- **Style**: Allman (brackets on new line)
- **Indentation**: 2 spaces
- **Line Length**: 120 characters
- **Mode**: C/C++ (CTRL is C-like)
- Additional formatting for operators, headers, and blocks

## OUTPUT Panel

View detailed formatting information in the OUTPUT panel:

1. Open OUTPUT panel (View > Output or Ctrl+Shift+U)
2. Select "WinCC OA Formatting" from the dropdown
3. See formatting logs including:
   - File being formatted
   - astyle.exe path
   - Config file path
   - Command executed
   - stdout/stderr output
   - Success/failure status

## Troubleshooting

### astyle.exe Not Found

**Problem**: Extension can't find astyle.exe automatically

**Solutions**:

1. Set `PVSS_II` environment variable to your WinCC OA installation path
2. Manually specify path in settings: `winccOAProjects.astylePath`
3. Select astyle.exe when prompted

### Config File Not Found

**Problem**: Extension can't find astyle.config

**Solutions**:

1. Verify astyle.config exists in `{WinCC_OA_Install}\config\`
2. Manually specify path in settings: `winccOAProjects.astyleConfigPath`
3. Extension will use default formatting rules if no config found

### Files Without Extension

**Problem**: Need to format CTRL files without .ctl extension

**Solution**:

- The extension prompts you to confirm formatting
- Select "Yes" to proceed with formatting
- The extension treats the file as CTRL code

### .orig Files Created

**Problem**: Backup .orig files are being created

**Solution**:

- Set `winccOAProjects.astyleCreateBackup` to `false` (default)
- Existing .orig files must be deleted manually
- Not recommended when using source control (Git, SVN, etc.)

## Best Practices

### Source Control Integration

When using Git or other version control:

- Keep `astyleCreateBackup` set to `false`
- Use source control to track changes instead of .orig files
- Add `*.orig` to your `.gitignore` if you enable backups

### Team Configuration

For consistent formatting across your team:

1. **Share astyle.config**: Commit your astyle.config to source control
2. **Document Path**: Add config location to team documentation
3. **Workspace Settings**: Share `.vscode/settings.json` with team

### Format on Save

To automatically format on save:

1. Use VS Code's format on save feature
2. Or integrate with pre-commit hooks
3. Or use workspace tasks

## Examples

### Format Single File (Command Palette)

```
1. Open myScript.ctl
2. Ctrl+Shift+P
3. Type: "Format CTRL"
4. Select: "WinCC OA: Format CTRL File"
5. File is formatted in-place
```

### Format All Files in Project

```
1. Ctrl+Shift+P
2. Type: "Format All"
3. Select: "WinCC OA: Format All CTRL Files"
4. Confirm: "Yes" to format X files
5. Progress notification shows formatting status
```

### Format Specific Folder

```
1. Right-click "scripts" folder in Explorer
2. Select: "WinCC OA: Format All CTRL Files in Folder"
3. Confirm: "Yes"
4. All .ctl files in folder are formatted recursively
```

## FAQ

**Q: Does formatting change my file immediately?**
A: Yes, formatting modifies files in-place. Use source control to review changes.

**Q: Can I undo formatting?**
A: Yes, use Ctrl+Z to undo, or revert using source control.

**Q: Does it work with files open in other editors?**
A: Yes, but you may need to reload the file in other editors after formatting.

**Q: What if I have multiple WinCC OA versions installed?**
A: The extension detects the version from your project's config file and uses the corresponding astyle.exe.

**Q: Can I format files not in a WinCC OA project?**
A: Yes, but you must manually specify the astyle.exe and config paths in settings.

## Related Features

- [Project Management](PMON_MANAGEMENT.md)
- [User Guide](USER_GUIDE.md)
- [Development Guide](development/DEVELOPMENT.md)

---

Made with ❤️ for the WinCC OA Community
