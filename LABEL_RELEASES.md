# Pull Request Labels & Automatic Releases

This document explains how pull request labels automatically control release versions and changelog generation.

## 🏷️ How Label-Based Releases Work

When a PR is merged to the `main` branch, the release system:

1. **Detects PR labels** from the merged pull request
2. **Determines release type** based on label priority
3. **Bumps version** according to semantic versioning rules
4. **Generates changelog** with proper categorization
5. **Creates GitHub release** with VSIX file

## 📋 Label Categories

### 🚀 Type Labels (Release Impact)

These labels determine the version bump type:

| Label | Version Impact | Use For | Example |
|-------|---------------|---------|---------|
| `breaking-change` | **Major** (1.0.0 → 2.0.0) | API breaking changes | Removing public methods |
| `enhancement` | **Minor** (1.0.0 → 1.1.0) | New features | Adding project filtering |
| `bug` | **Patch** (1.0.0 → 1.0.1) | Bug fixes | Fixing config parsing |
| `documentation` | **Patch** (1.0.0 → 1.0.1) | Documentation only | README updates |
| `dependencies` | **Patch** (1.0.0 → 1.0.1) | Dependency updates | npm package upgrades |
| `chore` | **Patch** (1.0.0 → 1.0.1) | Maintenance tasks | Build script updates |

**Priority Order:** `breaking-change` > `enhancement` > `bug` > `documentation` > `dependencies` > `chore`

### 🎯 Area Labels (Changelog Organization)

These labels organize changes in the changelog:

| Label | Changelog Section | Description |
|-------|------------------|-------------|
| `area:ui` | UI/UX Changes | User interface modifications |
| `area:api` | API Changes | Extension API modifications |
| `area:parser` | Parser Improvements | Config file parsing changes |
| `area:build` | Build System | CI/CD, compilation changes |
| `area:docs` | Documentation | README, guides, examples |

### 📏 Size Labels (Automatically Added)

Based on files changed and lines modified:

| Label | Files | Lines | Description |
|-------|-------|-------|-------------|
| `size:small` | ≤ 2 | ≤ 50 | Minor changes |
| `size:medium` | ≤ 10 | ≤ 500 | Moderate changes |
| `size:large` | > 10 | > 500 | Major changes |

### ⚡ Priority Labels

| Label | Description | Use For |
|-------|-------------|---------|
| `priority:high` | Urgent changes | Security fixes, critical bugs |
| `priority:medium` | Important changes | Needed features, important fixes |
| `priority:low` | Nice-to-have | Minor improvements |

### 🎯 Target Labels (Automatically Added)

| Label | Description |
|-------|-------------|
| `target:main` | PR targets main branch |
| `target:develop` | PR targets develop branch |

### 📦 Special Labels

| Label | Description | Version Impact |
|-------|-------------|----------------|
| `release` | Release PR | Automatic detection |
| `v1.2.3` | Force specific version | Exact version (overrides type) |

## 🤖 Automatic Label Detection

Labels are automatically added based on:

### Branch Name Analysis
```
feature/ui-improvements     → enhancement, area:ui
fix/config-parser-bug       → bug, area:parser  
docs/update-readme          → documentation, area:docs
chore/update-dependencies   → dependencies, chore
```

### Commit Message Analysis
```
feat: add project sorting   → enhancement
fix: resolve parsing issue  → bug
docs: update installation   → documentation
chore: bump typescript      → chore
```

### PR Title & Description Analysis
```
"Add new project filtering" → enhancement, area:ui
"Fix configuration parser"  → bug, area:parser
"Update README examples"    → documentation, area:docs
"Security update for deps"  → dependencies, priority:high
```

## 📝 Manual Label Management

### Adding Labels

You can manually add or modify labels:

1. **GitHub Web Interface**: Use the Labels sidebar in PR
2. **GitHub CLI**: `gh pr edit <number> --add-label "enhancement"`  
3. **API**: Use GitHub API to programmatically add labels

### Label Override

Manual labels always take priority over automatic detection.

### Force Specific Version

Add a label like `v1.5.0` to force an exact version (overrides type-based detection).

## 🔄 Release Workflow Example

### Example PR: "Add Project Icons"

**Automatic Detection:**
```
Branch: feature/ui-project-icons
Title: "Add project icons and improve visual hierarchy"
Commits: 
  - feat: add project type icons
  - style: improve tree view spacing

Detected Labels:
✅ enhancement (from "feat:" commits)
✅ area:ui (from "icons", "visual" keywords)  
✅ size:medium (5 files, 120 lines changed)
✅ target:main (PR targets main branch)
```

**Release Impact:**
- **Version**: 1.0.0 → 1.1.0 (minor bump from `enhancement`)
- **Changelog**: Categorized under "🚀 Features" → "UI/UX Changes"
- **Release Notes**: Professional formatting with proper sections

## ⚙️ Configuration

### Label Auto-Detection Rules

The detection rules are defined in `.github/workflows/pr-labels.yml`:

```javascript
const labelRules = {
  'enhancement': [
    /\bfeat(\(|:|\b)/i,     // feat: commits
    /\bfeature\b/i,         // "feature" keyword
    /enhancement/i,         // "enhancement" keyword
    /\bnew\b/i,            // "new" keyword
    // ... more patterns
  ],
  // ... other rules
};
```

### Customizing Detection

To customize label detection:

1. Edit `.github/workflows/pr-labels.yml`
2. Modify the `labelRules` object
3. Add new patterns or labels as needed
4. Test with dry-run PRs

## 🎯 Best Practices

### For Contributors

1. **Use Descriptive Titles**
   ```
   ✅ "Add drag-and-drop support for project reordering" 
   ❌ "Update UI"
   ```

2. **Include Keywords in Description**
   ```markdown
   This PR adds a new feature for drag-and-drop reordering of projects
   in the tree view, improving user experience significantly.
   ```

3. **Use Conventional Commits**
   ```
   ✅ feat(ui): add drag-and-drop support
   ❌ added new feature
   ```

4. **Review Auto-Labels**
   - Check labels after PR creation
   - Adjust if detection was incorrect
   - Add missing area labels if needed

### For Maintainers

1. **Label Review Process**
   - Verify auto-labels are correct
   - Add priority labels for urgent changes
   - Use force-version labels sparingly

2. **Release Planning**
   ```
   enhancement labels → Minor releases (monthly)
   bug labels → Patch releases (weekly)  
   breaking-change → Major releases (quarterly)
   ```

3. **Quality Gates**
   - Require appropriate labels before merge
   - Use branch protection rules
   - Review changelog generation

## 🚨 Troubleshooting

### Wrong Version Bump

**Problem**: PR got wrong version bump type

**Solutions**:
1. Edit labels before merging
2. Use force-version label (`v1.2.3`)
3. Manually adjust after merge

### Missing Labels

**Problem**: No labels were auto-detected

**Causes**:
- Generic branch name
- Non-conventional commits  
- Missing keywords in title/description

**Solutions**:
1. Add labels manually
2. Update PR title with keywords
3. Use conventional commit messages

### Label Conflicts

**Problem**: Multiple type labels detected

**Resolution**: Highest priority label wins
```
breaking-change > enhancement > bug > documentation > chore
```

## 📊 Monitoring & Analytics

### GitHub Insights

Monitor label usage at:
```
https://github.com/mPokornyETM/vs-code-wincc-oa-projects-viewer/labels
```

### Release Analytics

Track release patterns:
- Average time between releases
- Most common change types  
- Breaking change frequency
- Community contribution patterns

## 🎉 Benefits

- 🤖 **Fully Automated**: No manual version management
- 📊 **Data-Driven**: Release decisions based on actual changes
- 📝 **Professional Changelogs**: Consistent, categorized release notes
- 🚀 **Faster Releases**: Immediate publishing after merge
- 👥 **Team Friendly**: Clear guidelines for contributors
- 🔍 **Transparent Process**: Visible decision-making logic

---

**The label-based release system makes version management effortless while maintaining professional standards!** 🎯