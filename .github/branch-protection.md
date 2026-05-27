# Branch Protection Guide

Apply these settings to the `main` branch in GitHub repository settings.

## Required Status Checks

Require these jobs before merge. The check names must match `.github/workflows/ci.yml`.

- `install`
- `type-check`
- `build`
- `test`
- `e2e`
- `security-regressions`
- `scan-principles`
- `security-wall`
- `secret-scan`
- `dependency-audit`
- `prisma-validate`
- `constitution-drift`

## Pull Request Review

- Require a pull request before merging.
- Require at least 1 approving review.
- Require review from Code Owners.
- Dismiss stale approvals when new commits are pushed.

## Branch Safety

- Include administrators.
- Disable force pushes.
- Disable branch deletion.

## Notes

- `constitution-drift` guards local constitution and agent spec alignment.
- Actions SHA pinning is deferred; keep `actions/*@v4` managed by Dependabot or Renovate until pinning is scheduled.
- Actual GitHub branch protection must be applied in GitHub settings or through an authenticated GitHub API flow; this file is the repository-local policy record.
