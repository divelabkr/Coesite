---
name: coesite-security-ops
description: Use for Coesite CI failures, PR/diff reviews, changelog or docs updates, release/business readiness, debugging, regression-first fixes, test classification, security preflight, RedTeam follow-up, and codex-log reporting. Trigger whenever the user asks to ship, start business, prepare a release, fix failing build/tests/CI, review code, update docs/changelog, debug runtime behavior, classify tests, or check if Coesite is safe to proceed.
metadata:
  short-description: Coesite CI, release, security, and test ops
---

# Coesite Security Ops

Use this skill for recurring Coesite operating work. Keep it practical, short, and evidence-based.

## First Checks

1. Read `docs/00-MASTER-PLAN.md`, `AGENTS.md`, and `docs/08-MULTI-AI-WORKFLOW.md` when the task affects gates, security, release, or workflow.
2. Confirm branch and dirty worktree with `git status --short`.
3. Preserve unrelated user changes. Do not revert files outside the task.
4. Do not print secrets, env values, tokens, keys, cookies, JWTs, or full database URLs.
5. For LARGE work, create/update a task file first; implementation starts only after the gate state is explicit.

## Auto-Apply Triggers

- **CI/build/test failure**: capture the exact failing command, classify environment vs code failure, rerun focused tests, then broad gates.
- **Bug/security fix**: add or update failing regression tests first, confirm RED, then implement GREEN.
- **PR/diff review**: lead with P0/P1/P2 findings and file:line references; avoid style-only churn.
- **Docs/changelog**: update docs only when behavior, gate policy, risk status, or user-facing contract changed.
- **Release/business readiness**: run the business preflight checklist before claiming readiness.
- **Debugging**: reproduce, isolate, patch one cause at a time, verify, and log residual risk.
- **Test classification**: split fast unit, lightweight e2e, heavy timing/load, coverage, and sandbox-outside tests.
- **Security/RedTeam request**: use `runtime-redteam` for request/response paths and `platform-redteam` for CI/schema/WORM/dependency/ops.

## RedTeam Time Budget

Use generous budgets for RedTeam work. A timeout is evidence gap, not PASS.

| Mode | Budget per subagent | Use when |
|---|---:|---|
| Quick | up to 10 min | Small patch sanity check only, when risk is low and user did not ask for depth |
| Standard | up to 20 min | Normal P1/P2 code review, focused regression, single-module security check |
| Deep | 45-60 min | Business, pilot, release, production, P0/P1, dependency audit, CI gate, WORM, prevHash, oracle, auth, schema, or platform readiness |
| Split Deep | 45-60 min each | Run `runtime-redteam` and `platform-redteam` separately when both runtime and platform surfaces are in scope |

Rules:

1. Business/release/security readiness defaults to Deep, even if the user only says "check it".
2. If RedTeam times out, record `timeout/NOT_RUN`; do not use it as GO evidence.
3. Retry by narrowing scope, not by asking a single agent to review everything again.
4. Require file:line evidence for P0/P1. Suspicion without evidence is backlog, not blocker.
5. Ask RedTeam to produce partial P0/P1 findings first, then continue detailed matrix work.

## Default Gates

Run focused verification first, then broad verification.

```bash
pnpm -r build
pnpm -r exec tsc --noEmit
TMPDIR=/tmp pnpm test
TMPDIR=/tmp pnpm test:e2e
bash scripts/security-wall.sh
bash scripts/scan-principles.sh
pnpm audit --audit-level moderate
DATABASE_URL=postgresql://user:pass@localhost:5432/coesite pnpm exec prisma validate --schema=prisma/schema.prisma
```

Important local behavior:

- `pnpm test` without `TMPDIR=/tmp` can fail on Windows temp paths.
- Sandbox-internal e2e can fail with `listen EPERM`; record it as environment failure and rerun outside the sandbox only with approval.
- `scan-principles.sh` PASS is not proof of P8/P5/P10 completeness.
- `security-wall.sh` PASS is authoritative for the current scanner run; if a review disagrees, log the mismatch without reprinting sealed terms.

## Business Preflight

Before business, pilot, release, or external demo claims:

1. Check `tasks/phase1/business-preflight-risk-register.md`.
2. Confirm all P0s are closed or explicitly waived by the user.
3. Confirm dependency audit policy.
4. Confirm OpenAPI/types/SDK contract state.
5. Confirm CI includes the relevant gate for the risk being discussed.
6. Run Deep RedTeam or record an explicit waiver.
7. Write a codex-log with PASS/FAIL/NOT_RUN, never a vague "looks good".

## Output Shape

Keep final reports concise:

- Decision: GO / CONDITIONAL GO / NO-GO
- What changed or what was reviewed
- P0/P1 blockers with file links
- Verification results
- Residual risk / waiver needed
- Next action

## Log Rule

When work changes code, tests, gates, workflow, or business risk status, write:

`docs/codex-log/YYYY-MM-DD-HHMM-<topic>.md`

Include what happened, why, changed files, verification, and unresolved risk.
