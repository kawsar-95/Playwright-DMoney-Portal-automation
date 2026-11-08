---
description: Run the smoke suite (positive @smoke tests only) and summarise the result
allowed-tools: Bash(npm run smoke*), Bash(npm run typecheck), Read
---

1. Run `npm run typecheck`.
2. Run `npm run smoke$ARGUMENTS` (pass `:headed` to watch the browser).
3. Report pass/fail counts and any failure with its error message. The report is in `playwright-report-smoke/`.
