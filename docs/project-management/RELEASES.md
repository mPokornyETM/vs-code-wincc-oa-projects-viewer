# Automated Release System 🚀

This project uses an **automated release system** that handles versioning, changelog generation, and distribution automatically.

## 📋 How It Works

Every time code is pushed to the `main` branch:

1. ✅ **Tests run** - Code quality checks
2. ✅ **Version bumped** - Semantic versioning based on commits/PR labels
3. ✅ **Changelog updated** - Generated from conventional commits
4. ✅ **GitHub release created** - With release notes and VSIX file
5. ✅ **VS Code Marketplace** - Extension published automatically

## 🤖 Dependabot Integration

**Automated dependency management** keeps your extension secure and up-to-date:

- 📅 **Weekly Updates**: Every Monday at 9:00 AM CET
- 🏷️ **Auto-Labeled**: PRs get `dependencies` and size labels automatically
- 🔒 **Security Priority**: Security updates marked as `priority/high`
- 📦 **Grouped Updates**: Related dependencies bundled together
- 🚀 **Auto-Release**: Dependency updates trigger patch releases

→ See [DEPENDABOT.md](DEPENDABOT.md) for detailed configuration

## 🎯 For Contributors

### Making Changes

Use **conventional commit format** for all commits:

```
<type>: <description>

Examples:
feat: add new project sorting options
fix: resolve config file parsing issue
docs: update installation instructions
```

### Commit Types & Version Impact

| Commit Type        | Version Bump          | Example                            |
| ------------------ | --------------------- | ---------------------------------- |
| `feat:`            | Minor (0.1.0 → 0.2.0) | `feat: add drag and drop support`  |
| `fix:`             | Patch (0.1.0 → 0.1.1) | `fix: handle missing config files` |
| `docs:`            | Patch (0.1.0 → 0.1.1) | `docs: update README examples`     |
| `BREAKING CHANGE:` | Major (0.1.0 → 1.0.0) | `feat: redesign API`               |

### Helper Script

For Windows users, use the interactive commit helper:

```powershell
.\scripts\commit.ps1
```

This script guides you through creating properly formatted commits.

## 📦 Releases

### Automatic Releases

- Triggered by pushes to `main` branch
- Version determined by commit types
- Includes VSIX file and changelog
- Published to VS Code Marketplace

### Manual Releases

Project maintainers can trigger releases manually:

1. Go to **Actions** → **Release** workflow
2. Click **Run workflow**
3. Choose version bump type (patch/minor/major)
4. Click **Run workflow**

## 📊 Monitoring

- **Releases**: https://github.com/mPokornyETM/vs-code-wincc-oa-projects-viewer/releases
- **Actions**: https://github.com/mPokornyETM/vs-code-wincc-oa-projects-viewer/actions
- **Marketplace**: https://marketplace.visualstudio.com/items?itemName=mPokornyETM.wincc-oa-projects

## 🎉 Benefits

- 🤖 **Zero manual work** - Everything automated
- 📝 **Consistent changelog** - Generated from commits
- 🏷️ **Proper versioning** - Semantic versioning
- 🚀 **Fast distribution** - Immediate availability
- 🔄 **CI/CD integration** - Quality checks included

---

**Just write good commit messages and let automation handle the rest!** ✨
