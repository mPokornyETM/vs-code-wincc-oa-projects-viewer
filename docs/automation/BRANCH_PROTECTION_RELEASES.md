# Branch Protection Compatible Release System 🛡️

## Overview

This release system is designed to work with GitHub branch protection rules that require changes to be made through pull requests.

## How It Works

### 🔒 With Branch Protection Rules

When your repository has branch protection enabled (requires PRs for changes to `main`):

1. **Release Triggered**: Push to `main` or manual workflow dispatch
2. **Version Calculation**: Analyzes PR labels or conventional commits
3. **Local Changes**: Updates `package.json` and `CHANGELOG.md` locally
4. **Tag Creation**: Creates release tag locally
5. **Release PR**: Creates PR with version/changelog changes
6. **GitHub Release**: Creates GitHub release immediately with VSIX
7. **Auto-Merge**: Separate workflow auto-merges the release PR
8. **Complete**: Version metadata is updated in main branch

### 🚀 Without Branch Protection Rules

If no branch protection is enabled:

1. **Release Triggered**: Push to `main` or manual workflow dispatch
2. **Version Calculation**: Analyzes PR labels or conventional commits
3. **Direct Update**: Updates files and pushes directly to main
4. **Tag Push**: Pushes tag to repository
5. **GitHub Release**: Creates GitHub release with VSIX

## Workflows

### Primary Release Workflow (`.github/workflows/release.yml`)

**Triggers:**

- Push to `main` branch
- Manual workflow dispatch

**Key Features:**

- ✅ Respects branch protection rules
- ✅ Creates immediate releases (no waiting for PR merge)
- ✅ Automatic PR creation for version updates
- ✅ Comprehensive changelog generation
- ✅ VSIX packaging and upload
- ✅ VS Code Marketplace publishing (if configured)

**Steps:**

1. Run tests to ensure code quality
2. Detect release type from PR labels
3. Update version and changelog (locally)
4. Create release tag
5. Create PR for version changes (if branch protection enabled)
6. Push tag to repository
7. Package extension as VSIX
8. Create GitHub release with assets
9. Publish to VS Code Marketplace

### Auto-Merge Workflow (`.github/workflows/auto-merge-release.yml`)

**Triggers:**

- PR opened by `github-actions[bot]`
- PR title starts with `chore(release):`
- PR has `release` label

**Key Features:**

- ✅ Automatic approval of release PRs
- ✅ 30-second delay for CI completion
- ✅ Squash merge for clean history
- ✅ Only processes bot-created release PRs

## Error Handling

### Branch Protection Violations

If direct push fails due to branch protection:

```
remote: error: GH013: Repository rule violations found for refs/heads/main
remote: - Changes must be made through a pull request
```

**Solution:**

1. Workflow continues normally
2. Creates PR with version changes
3. Auto-merge workflow handles the PR
4. Release is created immediately (not waiting for PR)

### Missing Permissions

If token doesn't have sufficient permissions:

**Symptoms:**

- Tag push fails
- PR creation fails
- Release creation fails

**Solutions:**

1. **Use PAT Token**: Add `PAT_TOKEN` secret with repo admin permissions
2. **Update Workflow**: The workflow will fall back to `GITHUB_TOKEN`
3. **Manual Intervention**: Create release manually if needed

## Configuration

### Repository Settings

1. **Branch Protection Rules**:
    - ✅ Require pull request reviews before merging
    - ✅ Restrict pushes that create files
    - ✅ Allow specified actors (optional: add `github-actions[bot]`)

2. **Required Status Checks**:
    - Add any CI/CD checks that must pass
    - Auto-merge will wait 30 seconds for checks

3. **Auto-merge Settings**:
    - ✅ Allow auto-merge
    - ✅ Automatically delete head branches

### Secrets Configuration

| Secret         | Purpose                 | Required                      |
| -------------- | ----------------------- | ----------------------------- |
| `GITHUB_TOKEN` | Basic GitHub API access | ✅ Auto-provided              |
| `PAT_TOKEN`    | Admin access (optional) | ❌ Fallback for complex rules |
| `VSCE_PAT`     | VS Code Marketplace     | ❌ For marketplace publishing |

## Benefits

### ✅ Advantages

1. **Immediate Releases**: Don't wait for PR approval to create releases
2. **Branch Protection Compatible**: Works with any GitHub protection rules
3. **Automated Cleanup**: Auto-merges version update PRs
4. **Audit Trail**: All changes tracked through PRs
5. **Zero Manual Work**: Completely automated process
6. **Rollback Friendly**: Easy to revert if needed

### ⚠️ Considerations

1. **Dual Workflow**: Two workflows needed (release + auto-merge)
2. **Temporary Inconsistency**: Brief period where tag exists but version not in main
3. **Auto-merge Dependency**: Relies on auto-merge for completion

## Troubleshooting

### Release Created but Version Not Updated

**Symptom**: GitHub release exists but `package.json` version not updated in main

**Cause**: Auto-merge workflow didn't run or failed

**Solution**:

```bash
# Check for open release PR
gh pr list --label release

# Manually merge the PR
gh pr merge <PR-NUMBER> --squash
```

### Tag Exists but Release Failed

**Symptom**: Git tag created but no GitHub release

**Cause**: Release creation step failed

**Solution**:

```bash
# Create release manually
gh release create v1.0.0 --title "Release v1.0.0" --notes "Release notes"
```

### Auto-merge Not Working

**Symptom**: Release PR created but not auto-merged

**Causes & Solutions**:

1. **Missing Labels**: Ensure PR has `release` label
2. **Wrong Author**: Only works for PRs from `github-actions[bot]`
3. **Workflow Disabled**: Check if auto-merge workflow is enabled
4. **Permissions**: Ensure `GITHUB_TOKEN` has write permissions

## Manual Override

If automation fails, you can always:

1. **Manual Release**:

    ```bash
    npm run release:patch  # or minor/major
    git push --follow-tags
    gh release create v1.0.0 --generate-notes
    ```

2. **Manual PR Merge**:

    ```bash
    gh pr merge <PR-NUMBER> --squash
    ```

3. **Manual Marketplace Publish**:
    ```bash
    vsce publish
    ```

---

_This system provides the best of both worlds: immediate releases for users while maintaining proper change control through branch protection rules._
