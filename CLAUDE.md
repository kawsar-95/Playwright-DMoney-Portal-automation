# DMoney Portal – Playwright E2E project

Playwright + TypeScript automation of the DMoney Agent journey on
`https://dmoneyportal.roadtocareer.net` (API: `https://dmoney.roadtocareer.net`).

## Commands
- `npm run regression` – full suite (positive + negative), HTML report in `playwright-report-regression/`
- `npm run smoke` – positive checks only (`--grep @smoke`), report in `playwright-report-smoke/`
- append `:headed` (e.g. `npm run regression:headed`) to watch the browser; `SLOW_MO=300` slows it down
- `npm run typecheck` – `tsc --noEmit`; must be clean before committing

## Layout
- `src/pages/` – Page Objects (one class per screen, all extend `BasePage` for header/balance/logout)
- `src/utils/api.ts` – API helpers for **test-data setup and e-mail-delivered values only** (OTP, reset token)
- `src/utils/csv.ts`, `src/utils/data.ts` – CSV writer/parser, unique data builders, date + money helpers
- `tests/e2e/agent-journey.spec.ts` – the 20 ordered journey tests (TC01–TC20), one shared browser session
- `tests/negative/` – stand-alone negative checks
- `tests/global-setup.ts` – logs in once as Admin and System (the two fixed-credential roles) and saves each
  session to `playwright/.auth/*.json` (gitignored). A new test that needs to start already authenticated as
  one of them can do `test.use({ storageState: adminAuthFile })` (see `tests/e2e/auth-reuse.spec.ts`) instead of
  repeating the login flow. Agent/Customer/Merchant aren't included: each run creates a brand-new account for
  those, so they must still log in (with OTP) inside the test itself.
- `output/self_statement_YYYY-MM-DD.csv` – CSV produced by TC20

## Conventions
- Tag every positive test `@smoke`; negative tests get `@negative` and never `@smoke`.
- Assert through the UI. Use the API only to set up data or read what the app e-mails (see the dmoney-portal skill).
- Prefer role/label/placeholder locators; the sidebar is rendered twice, so scope to `header` or use `.first()`.
- Never hard-code credentials in code – they come from `.env` (template: `.env.example`).
- The portal is a **shared live environment**: only touch users the test itself created; never log in to,
  edit or delete other people's accounts.
- Read `.claude/skills/dmoney-portal/SKILL.md` before changing selectors or business assertions.
