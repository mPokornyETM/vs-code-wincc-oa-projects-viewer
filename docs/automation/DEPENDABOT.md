# Dependabot Integration

This document explains how Dependabot is configured to automatically manage dependencies for the WinCC OA Projects VS Code extension.

## 🤖 Automated Dependency Management

Dependabot automatically monitors your dependencies and creates pull requests when updates are available. This ensures your extension stays secure and up-to-date with the latest versions.

## 📅 Update Schedule

### NPM Dependencies (Node.js/TypeScript)

- **Frequency**: Weekly (every Monday at 9:00 AM CET)
- **Scope**: All npm dependencies in `package.json`
- **Limit**: Maximum 10 open PRs at once

### GitHub Actions

- **Frequency**: Weekly (every Monday at 9:30 AM CET)
- **Scope**: All GitHub Actions in `.github/workflows/`
- **Limit**: Maximum 5 open PRs at once

## 🏷️ Automatic Labeling

Dependabot PRs are automatically labeled by our PR automation:

### Standard Labels Applied

- `dependencies` - Identifies dependency updates
- `size/small` - Most dependency updates are small changes
- Automatic assignee: `mPokornyETM`

### Special Cases

- **Security Updates**: Get `priority/high` label automatically
- **Major Version Updates**: May trigger `breaking-change` detection
- **Grouped Updates**: Related dependencies are grouped together

## 📦 Dependency Groups

Related dependencies are grouped together to reduce PR noise:

### TypeScript Group

- `typescript`
- `@types/*` packages
- `ts-*` packages

### VS Code Group

- `@vscode/*` packages
- `vscode-*` packages

### Testing Group

- `*test*` packages
- Jest, Mocha, Chai related packages
- `@types/node`

### Development Tools Group

- ESLint packages
- Prettier packages
- Webpack, esbuild
- TypeScript ESLint packages

## 🚀 Release Integration

Dependabot PRs integrate seamlessly with our automated release system:

1. **PR Created**: Dependabot creates PR with dependency updates
2. **Auto-Labeling**: Our system adds appropriate labels (`dependencies`, size, etc.)
3. **Review & Merge**: Review the changes and merge when ready
4. **Auto-Release**: Upon merge to main, triggers **patch** version release
5. **Changelog**: Automatically updates CHANGELOG.md with dependency changes

## 🔒 Security Updates

Security updates receive special treatment:

- **Priority**: Automatically marked as `priority/high`
- **Detection**: Keywords like "security", "vulnerability", "CVE" trigger high priority
- **Immediate Action**: Consider merging security updates quickly

## ⚙️ Configuration

The Dependabot configuration is in `.github/dependabot.yml`:

```yaml
# Key settings
- package-ecosystem: 'npm' # Monitor npm dependencies
  schedule:
      interval: 'weekly' # Check weekly
      day: 'monday' # Every Monday
      time: '09:00' # At 9 AM
  open-pull-requests-limit: 10 # Max 10 open PRs
  labels:
      - 'dependencies' # Auto-add labels
      - 'size/small'
```

## 🛠️ Manual Overrides

You can manually adjust Dependabot behavior:

### Ignore Specific Updates

Add to dependabot.yml:

```yaml
ignore:
    - dependency-name: 'package-name'
      versions: ['1.x', '2.x']
```

### Change Schedule

Modify the schedule section:

```yaml
schedule:
    interval: 'daily' # daily, weekly, monthly
    time: '04:00' # UTC time
    timezone: 'Europe/Prague'
```

### Adjust PR Limits

```yaml
open-pull-requests-limit: 5 # Reduce number of open PRs
```

## 📋 Best Practices

### Reviewing Dependabot PRs

1. **Check the changelog**: Review what changed in the dependency
2. **Run tests**: Ensure all tests pass with the new version
3. **Security focus**: Pay special attention to security updates
4. **Breaking changes**: Watch for major version updates that might break compatibility

### Managing Multiple Updates

1. **Group related**: Let Dependabot group related dependencies
2. **Merge frequently**: Don't let PRs pile up
3. **Test together**: Sometimes test multiple dependency updates together
4. **Monitor releases**: Watch for any issues after merging

### Emergency Updates

For critical security updates:

1. **Fast-track review**: Prioritize security PRs
2. **Immediate merge**: Consider merging without extensive testing
3. **Quick release**: Let auto-release handle immediate deployment
4. **Monitor closely**: Watch for any issues post-release

## 🔍 Monitoring

### PR Status

- Check open Dependabot PRs regularly
- Monitor for failed checks or conflicts
- Review security alerts from GitHub

### Release Impact

- Watch CHANGELOG.md for dependency update entries
- Monitor extension performance after dependency updates
- Check VS Code marketplace for any user reports

## 🚨 Troubleshooting

### Common Issues

#### Conflicting PRs

- Dependabot may create conflicting PRs for related dependencies
- Close individual PRs and wait for grouped PR
- Or manually merge and resolve conflicts

#### Failed Checks

- Some dependency updates may break tests
- Review the failing tests
- Either fix the code or ignore the update

#### Version Conflicts

- Sometimes dependencies have conflicting version requirements
- May need manual resolution in package.json
- Consider updating other dependencies first

### Emergency Actions

#### Disable Dependabot Temporarily

```yaml
# Add to dependabot.yml
schedule:
    interval: 'weekly'
ignore:
    - dependency-name: '*' # Ignore all updates temporarily
```

#### Force Specific Version

```bash
npm install package-name@specific-version
git commit -m "fix: force specific version for compatibility"
```

## 📈 Benefits

### Security

- **Timely updates**: Get security patches quickly
- **Vulnerability alerts**: GitHub alerts for known issues
- **Automated fixes**: Dependabot creates fixes automatically

### Maintenance

- **Reduced manual work**: No need to manually check for updates
- **Consistent updates**: Regular schedule keeps dependencies fresh
- **Documentation**: All updates tracked in git history and changelog

### Quality

- **Automated testing**: CI runs on all dependency updates
- **Gradual updates**: Weekly schedule prevents overwhelming changes
- **Rollback capability**: Git history allows easy rollbacks if needed

---

_This system ensures your VS Code extension stays secure, up-to-date, and maintainable with minimal manual intervention._
