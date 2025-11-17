# WinCC OA CTRL Code Formatting

This extension provides comprehensive code formatting for WinCC OA CTRL (.ctl) files using the `astyle.exe` tool included with WinCC OA installations.

> **Important**: CTRL code formatting requires **WinCC OA version 3.19 or later**. The `astyle.exe` tool is not available in WinCC OA 3.18 and older versions.

## Features

### Automatic Detection

- **astyle.exe**: Automatically detected from WinCC OA installation directory
- **astyle.config**: Auto-detected from `{WinCC_OA_Install}\config\astyle.config`
- **Version-aware**: Works with multiple WinCC OA versions (3.19-3.21+)
- **Multi-Project Support**: Automatically detects the correct project in multi-project workspaces

### Flexible Formatting Options

- **Format Active File**: Format the currently open .ctl file
- **Format from Explorer**: Right-click any .ctl file in the file explorer
- **Format Folder**: Recursively format all .ctl files in a folder
- **Format Workspace**: Format all .ctl files in the entire workspace

### Smart Features

- **Built-in Formatting Provider**: Integrates with VS Code's standard "Format Document" command
- **Format on Save**: Works with VS Code's "Format On Save" setting
- **Extension-less Files**: Prompts to format files without .ctl extension
- **Dirty File Handling**: Automatically saves unsaved changes before formatting
- **Output Logging**: Detailed formatting logs in "WinCC OA Formatting" OUTPUT channel
- **No Backup Files**: Doesn't create .orig backup files by default (configurable)

## Usage

### Format Active File

**Method 1: Using Format Document Command (Recommended)**
1. Open a .ctl file in the editor
2. Press `Shift+Alt+F` (Windows/Linux) or `Shift+Option+F` (Mac)
3. Or right-click in editor and select "Format Document"

**Method 2: Using WinCC OA Command**
1. Open a .ctl file in the editor
2. Open Command Palette (Ctrl+Shift+P)
3. Run: `WinCC OA: Format CTRL File`

**Or use a keyboard shortcut** (if configured)

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

## Requirements

- **WinCC OA Version**: 3.19 or later (astyle.exe not available in 3.18 and older)
- **Registered Project**: File must be part of a registered WinCC OA project
- **Proper Installation**: WinCC OA must be properly installed with astyle.exe in bin directory

## Configuration

### Settings

Configure the extension in VS Code Settings (File > Preferences > Settings):

```json
{
  // Create .orig backup files when formatting (default: false)
  "winccOAProjects.astyleCreateBackup": false
}
```

> **Note**: Manual path configuration (`astylePath` and `astyleConfigPath`) has been removed. The extension now automatically detects these paths from your registered WinCC OA projects.

### Auto-Detection Process

The extension automatically detects astyle.exe using the following process:

1. **Identifies the Project**: Determines which registered WinCC OA project contains the file being formatted
2. **Finds the Installation**: Locates the WinCC OA system installation for that project's version
3. **Locates astyle.exe**: Looks in `{WinCC_OA_Install}\bin\astyle.exe`
4. **Finds astyle.config**: Looks in `{WinCC_OA_Install}\config\astyle.config`

#### Multi-Project Workspace Support

In workspaces with multiple WinCC OA projects or sub-projects:

- The extension finds the **most specific project** that contains the file
- Uses that project's WinCC OA installation to locate astyle.exe
- Supports nested project structures automatically

Example:
```
workspace/
├── ProjectA/           (WinCC OA 3.19)
│   └── scripts/
│       └── libs/
│           └── myLib.ctl   → Uses 3.19 astyle.exe
└── ProjectB/           (WinCC OA 3.20)
    └── scripts/
        └── main.ctl        → Uses 3.20 astyle.exe
```

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

**Common Causes**:

1. **Old WinCC OA Version**: You're using WinCC OA 3.18 or older (astyle.exe not included)
2. **Project Not Registered**: The file is not part of a registered WinCC OA project
3. **Invalid Installation**: WinCC OA installation is incomplete or corrupted

**Solutions**:

1. **Upgrade to WinCC OA 3.19+**: Code formatting requires version 3.19 or later
2. **Register Your Project**: Use the extension to register your project in WinCC OA
3. **Verify Installation**: Check that `{WinCC_OA_Install}\bin\astyle.exe` exists
4. **Check Project Version**: Ensure the project's `config/config` file has correct version info

### Config File Not Found

**Problem**: Extension can't find astyle.config

**Solutions**:

1. Verify astyle.config exists in `{WinCC_OA_Install}\config\`
2. Extension will automatically use default formatting rules if no config found
3. Check WinCC OA installation is complete

### Project Not Found

**Problem**: "No WinCC OA project found" error

**Solutions**:

1. Ensure the file is inside a registered WinCC OA project directory
2. Register your project using the WinCC OA Projects view
3. Refresh the projects view to update the project list
4. Verify the project appears in the WinCC OA Projects tree

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
4. **Enable Format on Save**: Add to workspace settings:
   ```json
   {
     "editor.formatOnSave": true,
     "[ctl]": {
       "editor.defaultFormatter": "mPokornyETM.wincc-oa-projects"
     }
   }
   ```

### Format on Save

To automatically format .ctl files when you save them:

**For All Files:**
```json
{
  "editor.formatOnSave": true
}
```

**For .ctl Files Only:**
```json
{
  "editor.formatOnSave": true,
  "[ctl]": {
    "editor.defaultFormatter": "mPokornyETM.wincc-oa-projects",
    "editor.formatOnSave": true
  }
}
```

Add these settings to your User Settings or Workspace Settings (File > Preferences > Settings).

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
A: The extension detects the version from your project's config file and uses the corresponding astyle.exe automatically.

**Q: Can I format files not in a WinCC OA project?**
A: Yes, but you need to select which WinCC OA version shall be used.

**Q: What about WinCC OA 3.18 and older versions?**
A: Code formatting is not available for WinCC OA 3.18 and older. The astyle.exe tool was introduced in version 3.19.

**Q: How does it work with multiple projects in one workspace?**
A: The extension automatically identifies which project contains the file and uses that project's WinCC OA installation.

## Related Features

- [Project Management](PMON_MANAGEMENT.md)
- [User Guide](USER_GUIDE.md)
- [Development Guide](development/DEVELOPMENT.md)

---

Made with ❤️ for the WinCC OA Community
