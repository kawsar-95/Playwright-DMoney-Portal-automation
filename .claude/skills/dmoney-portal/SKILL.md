---
name: dmoney-portal
description: Business rules, UI structure, API endpoints and known quirks of the DMoney portal (dmoneyportal.roadtocareer.net). Load before writing, fixing or reviewing any test or Page Object in this repo.
---

# DMoney portal – what the tests rely on

Everything below was observed on the live portal while building this suite. If the portal changes,
update this file together with the code.

## Roles and logins
| Account | Login | Lands on | Notes |
|---|---|---|---|
| Admin | `ADMIN_EMAIL` / `ADMIN_PASSWORD` | `/profile`, header "Admin Dashboard" | no OTP |
| System | `SYSTEM_EMAIL` / `SYSTEM_PASSWORD` | `/profile`, header "Agent Dashboard", name "SYSTEM" | it is an **Agent** account (the liquidity pool), no OTP |
| New Agent | its e-mail + password | `/profile`, "Agent Dashboard" | **4-digit OTP** e-mailed on every login, valid 2 min |

- Wrong credentials -> "Login failed. Please input correct email/phone number or password."
- A *pending* agent can still log in (gets the OTP); "inactive" is shown by status, not by login refusal.

## E-mail-delivered values (why the tests use the admin API)
The registration address must be `@gmail.com` and tests cannot read that inbox. The admin endpoint
`GET /user/search/id/:id` returns the user's current `otp` and `reset_token`, so `DmoneyApi.loginOtp()` /
`resetToken()` read them for **the user the test created** only. Reset link format: `/reset-password?token=<reset_token>`.

## Registration (`/register`, linked as "Sign Up" from `/`)
- Fields by `name`: `name`, `email`, `password`, `phone_number` (11 digits, 01…), `nid` (7–13 digits); role combobox: Customer / Agent / Merchant.
- Non-Gmail e-mail is blocked client-side: "Only Gmail addresses (@gmail.com) are allowed for registration." (no API call).
- Success (`POST /user/register` -> 201): "Registration successful. Your account is pending approval by an admin.", `user.status = "pending"`.

## Admin
- User List `/admin/users`: "Search Type" combobox -> "Search by Email", input placeholder `e.g., user@example.com`, button `SEARCH`. Rows show status chip `PENDING`/`ACTIVE`.
- VIEW -> `/admin/users/:id`. Status chip is the sibling after the "Account Status" label (CSS upper-cases it; DOM text may be mixed case -> assert case-insensitively).
- Activate: `Edit User` -> 2nd combobox (Account Status) -> `Active` -> `Save Changes` (`PATCH /user/update/:id`, needs header `x-auth-secret-key` which the frontend sends; value in `.env` as `API_SECRET_KEY`).

## Money movement
- System -> Agent: Cash In page `/agent/cash-in` (`input[name=customer]` phone, `input[name=amount]`). Receipt: "SYSTEM deposit to Agent successful", TRANSACTION ID, TOTAL AMOUNT `৳ 2000.00`.
- Agent -> Customer cash-in: receipt "Deposit successful". **The agent earns 2.5 % commission**: after 2000 in and 500 out the balance is **1512.50**, not 1500.
- **Customers have a balance cap** (~10,000). Seeded customers are often near it ("Limit exceeded. You can deposit a maximum of X tk"), so the suite creates a fresh active customer in `beforeAll` (override with `CUSTOMER_PHONE`).
- Recipient must be active, else "To account is not active. Please contact admin."
- Header "Balance" button reveals `৳ <amount>`; reload first for a fresh value.

## Self Statement (`/agent/self-statement`)
- Columns: Transaction ID, Sender Account, Receiver Account, Type, Debit, Credit, Balance, Date. Empty money cell = `-`.
- Agent rows: `Top-up from SYSTEM` (credit 2000) and `Deposit Commission` (debit 500, credit 12.50). System row: `System Deposit to Agent` (debit 2000).
- Filtered to **today** by default. **Quirk:** the paginator counts the account's all-time history, but each page only shows that server page's rows within the date filter; the server is newest-first, so stop at the first page with no rows (`SelfStatementPage.extractAllRows`).

## UI structure quirks
- The sidebar is rendered twice (drawer + permanent) -> sidebar links need `.first()`, and text that also appears in the sidebar should be scoped to `header`.
- Logout: user chip = last block of the header -> menu items "Profile", "Change Password", "Logout" -> `/login`.
