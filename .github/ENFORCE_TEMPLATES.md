# Enforce Issue & PR Template Usage

This repository contains organization-level checks and guidance to encourage the use of issue and PR templates across the organization.

How it works

- `ISSUE_TEMPLATE/config.yml` disables blank issues and provides contact links.
- Reusable workflows `validate-issue-template.yml` and `validate-pr-template.yml` run on issue and PR events and comment when required template sections are missing.

How to enable in a repo

1. Ensure the repo has GitHub Actions enabled.
2. Add a workflow that calls the org-level `validate-pr-template.yml` and `validate-issue-template.yml` or rely on the workflows present in the org `.github` repo (they run for this org by default when present in the org `.github` repository).
3. Optionally enable branch protection rules requiring status checks to pass.

Notes

- These checks only add guidance comments; they do not block merges by themselves unless you configure branch protection to require the validation checks as required status checks.
- To automatically reject issues opened without templates, consider combining the comment workflow with a bot or use GitHub Apps that can close issues automatically.
