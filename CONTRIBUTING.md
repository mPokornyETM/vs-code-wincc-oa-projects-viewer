# Contributing to WinCC OA Projects Extension

Thank you for your interest in contributing to the WinCC OA Projects extension! This document provides guidelines for contributing.

## Getting Started

1. Fork the repository
2. Clone your fork
3. Install dependencies: `npm install`
4. Make your changes
5. Test your changes: `npm test`
6. Submit a pull request

## Development Setup

### Prerequisites

- Node.js 18.x or later
- VS Code 1.105.0 or later
- Git

### Installation

```bash
git clone https://github.com/mPokornyETM/vs-code-wincc-oa-projects-viewer.git
cd vs-code-wincc-oa-projects-viewer
npm install
```

### Running the Extension

1. Open the project in VS Code
2. Press `F5` to launch a new Extension Development Host window
3. Test your changes in the new window

## Code Style

- Use TypeScript for all new code
- Follow existing code style and formatting
- Run `npm run lint` to check for style issues
- Add comments for complex logic

## Testing

- Write tests for new functionality
- Ensure all existing tests pass: `npm test`
- Test with actual WinCC OA projects when possible

## WinCC OA Specific Guidelines

- Maintain compatibility with pvssInst.conf file format
- Ensure proper parsing of WinCC OA configuration files
- Test with different WinCC OA versions when possible
- Consider Windows-specific file paths and permissions

## Submitting Changes

1. Create a descriptive branch name (e.g., `feature/project-search`)
2. Make atomic commits with clear messages
3. Update documentation if needed
4. Ensure all tests pass
5. Submit a pull request with:
   - Clear description of changes
   - Reference to related issues
   - Screenshots if applicable

## Reporting Issues

- Use the issue templates provided
- Include VS Code and WinCC OA version information
- Provide steps to reproduce the issue
- Include relevant log output or error messages

## Extension Points

When contributing features that other extensions might need:

- Use the provided extension points (`winccOAProjectActions`, `winccOAProjectView`)
- Document new extension points in the README
- Consider backward compatibility

## License

By contributing, you agree that your contributions will be licensed under the MIT License.