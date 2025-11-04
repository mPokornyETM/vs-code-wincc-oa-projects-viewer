# Contribution Checklist

Use this checklist to ensure your contribution meets the project standards.

## 🚀 Before You Start

- [ ] I have read the [Contributing Guidelines](../CONTRIBUTING.md)
- [ ] I have reviewed the [Contributor Workflow Guide](CONTRIBUTOR_WORKFLOW.md)
- [ ] I have forked the repository to my GitHub account
- [ ] I have set up the development environment locally

## 🌿 Branch Management

- [ ] I created my feature branch from the latest `main` branch
- [ ] My branch follows naming conventions (`feature/`, `fix/`, `docs/`, etc.)
- [ ] I have synced my fork with upstream before creating the branch

## 💻 Code Quality

- [ ] My code follows the existing TypeScript style
- [ ] I have added JSDoc comments for public functions
- [ ] I have handled errors appropriately
- [ ] My code is compatible with both Windows and Unix systems
- [ ] I have not introduced any breaking changes (or documented them)

## 🧪 Testing

- [ ] I have tested my changes manually in VS Code Extension Development Host
- [ ] All existing tests pass (`npm test`)
- [ ] I have added tests for new functionality
- [ ] I have tested with real WinCC OA projects when possible
- [ ] My changes don't break the parsing of `pvssInst.conf` files

## 📚 Documentation

- [ ] I have updated the README if needed
- [ ] I have updated JSDoc comments for modified functions
- [ ] I have added examples for new API functions
- [ ] I have updated the CHANGELOG if this is a significant change

## 🔧 Technical Checks

- [ ] TypeScript compilation passes (`npm run compile`)
- [ ] Linting passes without errors (`npm run lint`)
- [ ] No console errors or warnings in the Extension Development Host
- [ ] File system operations handle permissions correctly
- [ ] Cross-platform path handling works correctly

## 📝 Commit Standards

- [ ] I use conventional commit messages (`feat:`, `fix:`, `docs:`, etc.)
- [ ] My commit messages are descriptive and clear
- [ ] I have made atomic commits (one logical change per commit)
- [ ] I have not committed sensitive information or test files

## 🔄 Pull Request

- [ ] My PR targets the `main` branch
- [ ] I have filled out the pull request template completely
- [ ] I have provided a clear description of the changes
- [ ] I have included screenshots if the changes affect the UI
- [ ] I have linked to any related issues

## 🎯 WinCC OA Specific Checks

- [ ] Changes maintain compatibility with WinCC OA project structure
- [ ] Project categorization logic works correctly
- [ ] Version detection from project names/paths functions properly
- [ ] Path-based detection of delivered vs user projects works
- [ ] The extension handles missing or corrupted config files gracefully

## ✅ Final Review

- [ ] I have reviewed my own code for obvious issues
- [ ] I have tested the changes in a clean VS Code environment
- [ ] I have verified that no existing functionality is broken
- [ ] I am ready to address code review feedback promptly

---

## 🚨 Common Issues to Avoid

- **Don't commit node_modules** or build artifacts
- **Don't hardcode file paths** - use the utility functions for cross-platform support
- **Don't break existing APIs** without proper deprecation
- **Don't skip tests** - both manual and automated testing are important
- **Don't forget error handling** - the extension should gracefully handle edge cases

## 💡 Tips for Success

- Start with small, focused changes
- Ask questions early if you're unsure about the approach
- Test thoroughly with different WinCC OA project configurations
- Keep your fork up to date with upstream changes
- Be responsive to code review feedback

---

_This checklist helps ensure high-quality contributions that benefit the entire WinCC OA community!_ ✨
