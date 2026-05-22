# Branch Protection Guide

Apply these settings to the `main` branch in GitHub repository settings.

## Required Status Checks

Require these jobs before merge:

- `type-check`
- `unit-test`
- `scan-principles`
- `security-wall`

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

- `constitution-drift` is an additional guard for local constitution and agent spec alignment.
- Actions SHA pinning is deferred; keep `actions/*@v4` managed by Dependabot or Renovate until pinning is scheduled.
