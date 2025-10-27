# Dependabot Quick Reference 🤖

## What is Dependabot?

Dependabot automatically creates pull requests to update your dependencies when new versions are available. It helps keep your extension secure and up-to-date without manual effort.

## ⚡ Quick Setup Summary

✅ **Dependabot is configured** in `.github/dependabot.yml`  
✅ **PR labeling** automatically detects Dependabot PRs  
✅ **Release automation** handles dependency update releases  
✅ **Security updates** get priority treatment  

## 🔄 Weekly Workflow

### Monday Morning (9:00 AM CET)
- Dependabot checks for npm dependency updates
- Creates PRs for available updates (max 10 open)
- Auto-assigns to `mPokornyETM`

### Monday Morning (9:30 AM CET) 
- Dependabot checks for GitHub Actions updates
- Creates PRs for workflow updates (max 5 open)

### What Happens Next
1. **Auto-labeling**: PRs get `dependencies` + `size/small` labels
2. **Security detection**: Security updates get `priority/high`  
3. **Review**: Check the PR for breaking changes
4. **Merge**: Approve and merge when ready
5. **Auto-release**: Patch version released automatically

## 📦 Dependency Groups

Dependabot groups related dependencies together:

| Group | Includes |
|-------|----------|
| **typescript** | `typescript`, `@types/*`, `ts-*` |
| **vscode** | `@vscode/*`, `vscode-*` |
| **testing** | `*test*`, `jest`, `mocha`, `chai`, `@types/node` |
| **dev-tools** | `eslint*`, `prettier*`, `webpack*`, `esbuild*` |

## 🚨 Priority Handling

### 🔒 Security Updates (High Priority)
- Marked with `priority/high` label
- Should be reviewed and merged quickly
- May include vulnerability fixes

### 📈 Regular Updates (Normal Priority)  
- Weekly dependency updates
- Can be batched and reviewed together
- Generally safe to merge after CI passes

## 🎯 Action Items

### ✅ For Each Dependabot PR:
1. **Check CI status** - Ensure tests pass
2. **Review changelog** - Look for breaking changes  
3. **Security focus** - Pay attention to security updates
4. **Merge when ready** - Auto-release handles the rest

### 🚫 What NOT to do:
- Don't ignore security updates
- Don't let PRs pile up indefinitely
- Don't merge without checking CI status
- Don't manually edit Dependabot PRs (close and recreate instead)

## 📊 Monitoring

### Regular Checks:
- **Open PRs**: Monitor Dependabot PRs in GitHub
- **Security alerts**: Check GitHub security tab
- **Release notes**: Review auto-generated changelogs
- **Extension performance**: Monitor after dependency updates

### Warning Signs:
- Multiple failed CI checks on Dependabot PRs
- Security alerts not being addressed
- Many open Dependabot PRs (>10)
- Broken functionality after dependency updates

## 🛠️ Emergency Actions

### Disable Dependabot Temporarily
```bash
# Edit .github/dependabot.yml
# Add ignore rules or change schedule to "monthly"
```

### Force Specific Version
```bash
npm install package-name@specific-version --save
git add package.json package-lock.json
git commit -m "fix: pin package-name to specific version"
```

### Close All Dependabot PRs
```bash
# Use GitHub CLI
gh pr list --author app/dependabot --json number --jq '.[].number' | xargs -I {} gh pr close {}
```

## 🎉 Benefits

- **🔐 Security**: Automatic security patch deployment
- **⏰ Time-saving**: No manual dependency checking  
- **📈 Up-to-date**: Always running latest stable versions
- **📋 Documented**: All updates tracked in git + changelog
- **🚀 Seamless**: Integrates with existing release automation

---

💡 **Pro Tip**: Let Dependabot handle the routine updates while you focus on building features!