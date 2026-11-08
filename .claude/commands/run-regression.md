---
description: Run the full regression suite (positive + negative) and summarise the result
allowed-tools: Bash(npm run regression*), Bash(npm run typecheck), Read, Glob
---

1. Run `npm run typecheck`. Stop and report if it fails.
2. Run `npm run regression$ARGUMENTS` (pass `:headed` as the argument to watch the browser).
3. Report: passed / failed / skipped counts, the name and error of each failure, and the path of the CSV written to `output/`.
4. If something failed, suggest delegating to the `playwright-debugger` agent. Do not change assertions just to make them pass.
