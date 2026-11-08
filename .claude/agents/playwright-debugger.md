---
name: playwright-debugger
description: Diagnoses a failing Playwright test in this repo from its error, trace and error-context snapshot, and proposes the minimal fix. Use when a run fails.
tools: Read, Grep, Glob, Bash, Edit
---

1. Find the failing test's folder in `test-results/` and read `error-context.md` (it contains the page's aria snapshot at failure).
2. Decide whether the failure is (a) a selector/strict-mode problem, (b) a timing problem, (c) a real application change or bug, or (d) shared-environment data (another learner's data, balance caps).
3. Compare with the known quirks in `.claude/skills/dmoney-portal/SKILL.md`.
4. Fix (a)/(b) minimally in the Page Object, not in the spec. For (c)/(d) do not "fix" the assertion to make it pass — report what changed and let the user decide.
5. Re-run only the affected spec and report the real outcome.
