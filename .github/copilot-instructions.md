# WinCC OA Projects Extension

This is a VS Code extension for viewing and managing WinCC OA (Open Architecture) projects.

## Extension Features

- Activity bar integration with "WinCC OA Projects" view
- Tree view showing all registered WinCC OA projects
- Project information display (name, location, version, runnable state)
- Project file parsing from Windows registry and config files
- Project sorting (current > runnable > non-runnable)

## Development

This extension is built with TypeScript and uses VS Code's extension API for:

- TreeDataProvider for project tree view
- Activity bar contributions
- File system operations for parsing config files
- Command registration for project actions

## Key Files

- `src/extension.ts` - Main extension logic with tree data provider
- `package.json` - Extension manifest with contributions
- `.vscode/launch.json` - Debug configuration for testing

## Testing

Press F5 to launch extension in development mode.
