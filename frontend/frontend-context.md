# Alimony+ Frontend Context

> Onboarding reference for the Alimony+ frontend. Written for the Frontend Engineer
> (Settlement Negotiation & Mediation Workspace UI) and for AI coding agents working in
> this repository. Reflects the prototype as of October 2026.

---

## 1. Project snapshot

**Alimony+** is an India-focused legal-assistance platform (Tech Tomorrow group project)
that helps women understand, estimate, and organize maintenance / alimony claims in India.
It is a frontend prototype: a clearly labeled synthetic demo plus an adapter to an existing
Express backend. It is a research/technology project, **not** a provider of individualized
legal advice.

**Core user journey:** Tell us about your situation → understand possible legal routes →
prepare information & documents → estimate / plan financial needs → find legal aid / lawyer
→ track case & payments → take the next safe action.

**Primary users:** women seeking to understand their rights and pathways to financial
support, especially those facing information barriers, legal confusion, English-language
barriers, or domestic safety risks.

**Legal landscape the product maps facts to** (it never concludes which law applies — it
organizes data for a human lawyer to review):

| Statute                                                      | Provision   | Who uses it                                                  |
| ------------------------------------------------------------ | ----------- | ------------------------------------------------------------ |
| Bharatiya Nagarik Suraksha Sanhita, 2023 (formerly CrPC 125) | Sec 144     | Wives, children, parents unable to maintain themselves       |
| Protection of Women from Domestic Violence Act, 2005         | Sec 20      | Aggrieved women in a domestic relationship (monetary relief) |
| Hindu Marriage Act, 1955                                     | Sec 24 & 25 | Hindu spouses (interim & permanent maintenance)              |
| Special Marriage Act, 1954                                   | Sec 36 & 37 | Spouses married under SMA                                    |
| Hindu Adoptions and Maintenance Act, 1956                    | Sec 18      | Hindu wives living separately on specific grounds            |

**Key precedent guiding product design — _Rajnesh v. Neha (2020)_:**

- Overlapping proceedings can cause conflicting orders → duplicate/overlapping proceeding
  warning in the Case Tracker.
- Strict **Affidavit of Disclosure of Assets and Liabilities** → structured financial
  disclosure workflow (data workspace prepares exactly this data before a lawyer meeting).
- Maintenance is generally awarded from the **date of application** → filing date is
  emphasized to track accrued arrears accurately.

**What Alimony+ DOES:** explain maintenance concepts; guide through possible pathways; ask
structured questions and organize information; estimate planning scenarios (ranges, never
predictions); maintain a case timeline and arrears ledger; provide verified legal-aid links
(NALSA / SLSA / DLSA / TLSC); summarize approved sources bilingually (planned); flag
uncertainty and escalate to humans.

**What Alimony+ DOES NOT do:** guarantee alimony; decide legal entitlement; predict a court
order with certainty; replace a lawyer or impersonate a court; submit legal documents
autonomously; **contact or threaten the opposing party**; fabricate evidence (e.g. fake
salary slips); provide dangerous instructions in safety situations.

**Mandatory framing:** planning outputs are presented as _"based on the information
entered, this planning estimate falls within this range under the selected methodology"_ —
never _"you will definitely receive ₹X/month"_. Every informational surface carries the
not-legal-advice disclaimer.

---

## 2. Stack, commands & environment

| Layer      | Choice                                                                                                                                                                                                                                       |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework  | Next.js 16 (App Router), `next ^16.4.0`                                                                                                                                                                                                      |
| UI         | React 19 (`react ^19.3.0`), `lucide-react` icons only — no component library                                                                                                                                                                 |
| Language   | TypeScript strict (`typescript ^7.0.2`), `tsc --noEmit` for typecheck                                                                                                                                                                        |
| Styling    | Tailwind CSS 4 (`@import "tailwindcss"` + `@theme`) **plus** a large hand-written semantic CSS layer in `src/app/globals.css` (~2,400 lines). Tailwind is used sparingly as a utility garnish; the design system is the hand-written classes |
| Unit tests | Vitest 5 (`tests/**/*.test.ts`)                                                                                                                                                                                                              |
| E2E tests  | Playwright (`@playwright/test ^1.64`) + `@axe-core/playwright` a11y scans                                                                                                                                                                    |
| Formatting | Prettier (`npm run format`)                                                                                                                                                                                                                  |

**Node.js 20.9 or newer** (verified with Node 24). Dev server binds `127.0.0.1` only.

| Command                           | Purpose                                          |
| --------------------------------- | ------------------------------------------------ |
| `npm ci`                          | Install                                          |
| `npm run dev`                     | Dev server on http://127.0.0.1:3000              |
| `npm run typecheck`               | `tsc --noEmit` — run before every handoff        |
| `npm test`                        | Vitest unit tests (ledger + proxy)               |
| `npx playwright install chromium` | One-time browser install for e2e                 |
| `npm run test:e2e`                | Playwright suite (auto-starts dev server)        |
| `npm run build`                   | Production build                                 |
| `npm run format`                  | Prettier over `src tests *.ts *.mjs *.json *.md` |

**Backend connection:** copy `.env.example` to `.env.local`, set `BACKEND_URL` to the
trusted Express origin (default `http://127.0.0.1:5000`). `BACKEND_URL` is **server-only**
— never `NEXT_PUBLIC_`, never user-supplied. Sign in via **Connect your account** to enter
live mode.

> **Note for AI agents:** `frontend/AGENTS.md` warns that this Next.js version has breaking
> changes versus older training data. Read the relevant guide in
> `node_modules/next/dist/docs/` before writing Next-specific code, and heed deprecation
> notices.

---

## 3. Source map

```
src/
├─ app/
│  ├─ layout.tsx                  Root layout: wraps <body> in WorkspaceProvider; robots noindex/nofollow
│  ├─ page.tsx                    redirect("/dashboard")
│  ├─ [section]/page.tsx          Dynamic route: validates section id against allowlist, renders <WorkspaceApp section/>
│  ├─ api/backend/[...path]/route.ts  The ONLY API route: server proxy to Express (see §7)
│  ├─ globals.css                 Design system: tokens, semantic classes, responsive + a11y CSS
│  └─ icon.svg                    App icon
├─ lib/
│  ├─ types.ts                    All domain types (plain `type` exports) — see §6
│  ├─ api.ts                      Client adapter: single generic api<T>(path, body?) function
│  ├─ demo.ts                     Synthetic demo workspace; DEMO_DATE = "2026-10-09"
│  ├─ ledger.ts                   Pure reconciliation logic: buildLedger(), normalizeFinancial()
│  └─ planning.ts                 Planning types + calculateDemo (mirrors backend calculator v1.0)
├─ components/
│  ├─ workspace-provider.tsx      React Context store: demo/live state, create(), inactivity timer
│  ├─ workspace-app.tsx           The app shell: sidebar/topbar/banner + all primary sections via
│  │                              {section === "..."} blocks; helpers (CaseSelector, Stat, PaymentChart,
│  │                              LedgerTable, safeExit)
│  ├─ workspace-extras.tsx        Secondary views: CalculatorView, DataReviewView, HelpView,
│  │                              SettingsView, LoginView
│  ├─ record-dialog.tsx           One polymorphic RecordDialog for all 7 record kinds
│  └─ ui.tsx                      Primitives: Badge, Empty, PageHeading, Modal, Field, ExternalLink
tests/
├─ ledger.test.ts                 buildLedger + normalizeFinancial edge cases
├─ proxy.test.ts                  Proxy auth/origin/allowlist/503 behavior
└─ e2e/
   ├─ workspace.spec.ts           Routes, demo flows, exports, calculator invalidation, mobile nav
   ├─ integration.spec.ts         Live mode against mocked /api/backend/**; logout origin rules
   └─ accessibility.spec.ts       axe WCAG 2.0 A/AA scans over all routes + open dialog
```

Key docs: root `README.md` (product/legal context), `frontend/README.md` (setup +
boundaries), `frontend/API-HANDOFF.md` (backend contract + needed extensions + AI export
spec). Read all three before designing new features.

---

## 4. Routing & sections model

- One dynamic route `src/app/[section]/page.tsx` (`dynamic = "force-dynamic"`) validates
  the section id, then renders `<WorkspaceApp section={section}/>`. Unknown ids →
  `notFound()`.
- Section ids and their sidebar labels come from the `nav` / `pageTitles` literals near the
  top of `workspace-app.tsx`. Both must be updated together when adding a section.

| Section id    | Label               | Notes                                                                 |
| ------------- | ------------------- | --------------------------------------------------------------------- |
| `dashboard`   | Overview            | Metrics, monthly demo chart, next event, case cards, activity         |
| `cases`       | My cases            | Create case/proceeding, timeline, search & filtering                  |
| `orders`      | Court orders        | Create/read; monthly scheduling demo-only                             |
| `payments`    | Maintenance         | Receipts; demo ledger (partial, overdue, credits); JSON export        |
| `documents`   | Documents           | Upload/download; readiness by category                                |
| `calculator`  | Planning calculator | Versioned scenarios; live via `/calculator/run`                       |
| `data-review` | Data workspace      | Editable legal-source/financial-fact records, provenance, JSON export |
| `help`        | Help & legal aid    | NALSA/eCourts links, safety explanation                               |
| `settings`    | Settings            | Mode/session/privacy rows, demo reset                                 |
| `login`       | (special)           | Renders only LoginView — no app shell                                 |

There is no nested routing: `workspace-app.tsx` switches sections internally, sharing one
sidebar / topbar / mode-banner / toast / dialog shell across all screens.

---

## 5. State architecture

**`WorkspaceProvider` is the only global state** (React Context, mounted in `layout.tsx`
so it survives route changes). Plain `useState` + `useRef` — no `useReducer`, no external
state library, and **no `localStorage`/`sessionStorage` ever** (safety decision: nothing
case-related persists in the browser; a refresh returns to the demo).

Context value (`useWorkspace()` — throws if the provider is missing):

- `data: Workspace` — the single aggregate state all screens read
- `demo: boolean`, `asOf: string` (DEMO_DATE in demo, real Asia/Kolkata today in live)
- `name`, `loading`, `error`, `notice`, `setNotice`
- `selectedCase` / `setSelectedCase` (case-scoped filtering)
- `setData`, `refresh`
- `enterLive(name)`, `resetDemo()`, `logout()`
- `create(kind, body)` — demo: appends a synthetic record (`id: Date.now()`); live: POSTs
  to the backend then re-fetches the chain

**Live loading fan-out** (`loadLive` in the provider): `GET cases` → parallel
`proceedings/case/:id` per case → parallel `orders/proceeding/:id` → parallel
`payments/order/:id`. A `requestGeneration` ref discards stale responses. Failures show an
error banner with Retry — **live mode never falls back to demo data**.

**Inactivity clearing** (live mode only): a 15-minute `setTimeout` reset on every
`pointerdown`/`keydown`; on expiry it cancels in-flight loads, clears live records,
returns to demo as "Guest", shows a notice, fire-and-forget `auth/logout`, routes to
`/login`.

**Quick exit** (`safeExit()` in `workspace-app.tsx`): hides the page immediately
(`visibility: hidden`), sends a best-effort `keepalive` logout POST when connected, then
`window.location.replace("https://www.google.com")` so the app leaves the history stack.
The UI honestly notes it cannot erase browsing history/downloads or revoke the token
server-side.

---

## 6. Domain data model (`src/lib/types.ts`)

| Type             | Key fields                                                                                                                                                                                                                                        | Notes                                                                                                                    |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `CaseRecord`     | `id: number, title, status, createdAt, legalRoute?, description?`                                                                                                                                                                                 | Root entity                                                                                                              |
| `Proceeding`     | `id, caseId, courtName?, caseNumber?, proceedingType?, filedAt?, status`                                                                                                                                                                          | Child of case                                                                                                            |
| `Order`          | `id, proceedingId, orderType?, orderDate?, amount: number, description?, effectiveDate?, dueDay?, endDate?`                                                                                                                                       | Schedule fields (`effectiveDate/dueDay/endDate`) exist in the type but are **demo-only** — backend does not support them |
| `Payment`        | `id, orderId, amount, paymentDate, status: "RECEIVED"\|"PENDING"\|"FAILED", period?, reference?, notes?`                                                                                                                                          | `period` (YYYY-MM, explicit allocation) is **demo-only**                                                                 |
| `Hearing`        | `id, caseId, date, title, location`                                                                                                                                                                                                               | **Demo-only entity** — no backend endpoint                                                                               |
| `DocumentRecord` | `id, caseId, originalName, documentType, fileSize, createdAt, file?: File`                                                                                                                                                                        | Client-side `File` in demo                                                                                               |
| `SourceRecord`   | `id, title, kind: "Legal source"\|"Financial fact", url, section, reviewedOn, effectiveFrom, status: "Needs review"\|"Reviewed", value, frequency: "Monthly"\|"Annual"\|"One-time"\|"Not applicable", certainty: "Known"\|"Estimated"\|"Unknown"` | Data-workspace records; session-only                                                                                     |
| `Workspace`      | `{ cases, proceedings, orders, payments, hearings, documents, sources }`                                                                                                                                                                          | The full app state shape                                                                                                 |
| `LedgerRow`      | `orderId, period, dueDate, expected, received, outstanding, status: "Paid"\|"Overdue"\|"Partially paid"\|"Upcoming", credit`                                                                                                                      | Produced by `buildLedger`, not stored                                                                                    |

Planning types (`src/lib/planning.ts`): `PlanningInputs = Record<string, number>`;
`PlanningResult` = `applicantNeed, respondentCapacity, scenarios {conservative, baseline,
stress → amount}, assumptions[], uncapturedFactors[], disclaimer`.

**Ledger semantics** (`src/lib/ledger.ts`, demo): monthly obligations only; due day
clamped to the last day of the month; no proration; no automatic credit carry-forward;
overdue only after the due date; effective dates after a month's due day skip that month;
FAILED/PENDING/future/unperiodized receipts are excluded; overpayment becomes `credit`
without double-allocation. `normalizeFinancial`: Unknown → JSON `null` (never 0), Annual
÷ 12, One-time untouched.

**Calculator honesty:** the backend accepts applicant liabilities but does not apply them
in its formula (limitation is surfaced in the UI); its 75%/125% scenario multipliers are
budget assumptions, **not legal percentages**.

---

## 7. Backend integration contract

**Client adapter** (`src/lib/api.ts`): one generic `api<T>(path, body?)`. GET when
`body === undefined`, else POST. Always same-origin `/api/backend/${path}` with
`credentials: "same-origin"`, `cache: "no-store"`. `FormData` passes through untouched
(no Content-Type header). Non-OK responses are parsed and thrown as `Error(result.message
|| …)`.

**Server proxy** (`src/app/api/backend/[...path]/route.ts`) — the only API route:

- **Route allowlist** (regex per method). GET: `cases`, `cases/:id`, `proceedings/:id`,
  `proceedings/case/:id`, `orders/:id`, `orders/proceeding/:id`, `payments/:id`,
  `payments/order/:id`, `documents/:id/download`, `health`. POST: `auth/(login|register|
logout)`, `cases`, `proceedings`, `orders`, `payments`, `documents/upload`,
  `calculator/run`. Anything else → 404. **New endpoints must be added to this allowlist.**
- **Session:** `alimony_session` cookie — `httpOnly`, `sameSite: "strict"`, `secure` in
  production, `maxAge: 86400`. On successful login the backend JWT is stored in the cookie
  and **stripped from the client response** — the token never touches client JS.
- **Origin check:** non-GET requests must have `Origin` matching the request host, else 403. Writes are same-origin only.
- **Uploads:** capped at 10 MB (content-length and actual body both checked → 413).
- **Upstream:** `fetch(BACKEND_URL + "/api/" + path)` with `no-store`, 20 s
  `AbortSignal.timeout`, `redirect: "error"`. Upstream 401 deletes the session cookie.
  Binary downloads stream with Content-Disposition. Fetch failure → 503 _"Your entry has
  not been saved…"_ — **synthetic data is never substituted for a failed live request**.

**Conventions:** dates are `YYYY-MM-DD`; INR amounts display with the Indian locale;
backend decimals are converted for presentation (production arithmetic should use
decimal/minor-unit values server-side).

**Known backend gaps** (live mode shows explicit unavailable states — it never fakes
them): payment schedules, effective dates, due days, payment-period allocation, hearing
events, document listing (only documents uploaded this session can be listed), source
review, AI chat. See `API-HANDOFF.md` for the full list of needed server-owned entities
(order schedule, obligation, payment allocation, ledger response, event, document
listing) and the AI preparation export v1.0 spec (`eligibleForLegalRetrieval` is always
`false` — manual UI review is not legal approval).

---

## 8. Styling & design system

- **Tailwind 4** via `@import "tailwindcss"` + `@theme { --font-sans: "Segoe UI", Arial,
sans-serif }`, but the visual design lives in **hand-written semantic CSS classes** in
  `globals.css` (`.app-shell`, `.sidebar`, `.nav-link.active`, `.stat-card`, `.panel`,
  `.callout.warning`, `.form-stack`, `.modal`, `.toast`, `.filter-tabs`, `.arrears-banner`).
  Use these classes; use Tailwind utilities only for spacing/layout garnish
  (`mb-6`, `flex items-center gap-4`, `sr-only`, `animate-spin`).
- **Palette tokens** (`:root`): `--green #254f42`, `--green-deep #193e33`,
  `--green-light #edf3ee`, `--ink #273c34`, `--muted #626f61`, `--border #e4e7df`,
  `--cream #f7f8f3`, `--amber #9a652d`, `--amber-bg #fbf1df`. Amber is reserved for
  warnings/overdue.
- **Typography:** Georgia serif for display headings (h1, brand, order amounts, scenario
  figures); Segoe UI body at 14px base. Warm cream/sage aesthetic.
- **Layout:** fixed sidebar 242px (258px ≥ 1500px; off-canvas with transform + scrim
  ≤ 900px). Responsive breakpoints: 1500 / 1180 / 900 / 640 px. Mobile form inputs use a
  16px font to prevent iOS zoom.
- No `@keyframes` in the file; the only animation is Tailwind's `animate-spin` for
  loaders.

---

## 9. Accessibility standards (enforced by axe scans)

- Native `<dialog>` + `showModal()` for modals (`Modal` in `ui.tsx`) — the browser supplies
  the focus trap; focus is restored to the trigger on close; labelled via
  `aria-labelledby` / `aria-describedby`.
- Manual Tab-trap + Escape + focus restore for the mobile sidebar; `inert` on background
  content while it is open.
- Skip link off-canvas until `:focus`; global `:focus-visible` outline (3px, offset 3).
- `@media (prefers-reduced-motion: reduce)` disables all animation/transitions.
- `aria-current="page"` on nav; `aria-label`s on icon buttons/selects; `role="alert"` for
  form errors; `role="status"` for toast/loading; the pure-CSS chart is exposed via
  `role="img"` + a text summary.
- 40px minimum tap targets; semantic forms/tables; textual statuses alongside color.
- `@axe-core/playwright` WCAG 2.0 A/AA scans run over every route — **zero violations is
  the bar for any new screen**.

---

## 10. Code conventions & testing patterns

- Kebab-case filenames; named function components (`export function X`) — no default
  exports in `components/`; default exports only for App Router pages/layout.
- Every interactive component is `"use client"`; plain function components with inline
  prop type annotations (no `React.FC`, no `forwardRef`).
- **Uncontrolled forms** read via `new FormData(event.currentTarget)` with `str()`/`num()`
  helpers (see `record-dialog.tsx`); controlled state only where a select drives
  conditional UI.
- Per-kind validation lives in the dialog: amounts > 0, no future payment/review dates,
  HTTPS-only source URLs, MIME allowlist (PDF/PNG/JPG/DOC/DOCX ≤ 10 MB),
  `normalizeFinancial` for financial facts; "no parent" guards disable saving when the
  required parent record does not exist.
- Derived data (filtered lists, ledger, sums) is recomputed per render from `data` — no
  memoization layer.
- New pure domain logic goes in `src/lib/` as plain exported functions with Vitest tests
  in `tests/*.test.ts`; new flows get Playwright coverage in `tests/e2e/` (mirror
  `workspace.spec.ts` / `integration.spec.ts`) plus an axe scan of the new route.
- Always run `npm run typecheck`, `npm test`, `npm run test:e2e`, `npm run build` before
  handoff. Format with Prettier.

---

## 11. Role brief: Settlement Negotiation & Mediation Workspace

**Current state: implemented (October 2026).** The `settlement` section lives at
`/settlement` between "Planning calculator" and "Data workspace" in the
sidebar. Architecture:

- **Types** (`src/lib/types.ts`): `SettlementOffer` (party, date, channel
  provenance, `monthlyAmount/lumpSum/assetSplitPct` nullable — null = term not
  part of the offer, never zero), `SettlementTerm` + `ChecklistStatus`
  ("agreed" | "disputed" | "pending"); both arrays live on `Workspace`
  (`offers`, `terms`).
- **Pure logic** (`src/lib/settlement.ts`): `latestOffers` (latest per party,
  date then id), `compareOffers` (delta only when both sides offered; states
  match/apart/applicant-only/respondent-only/unaddressed), `buildMemorandum`
  (agreed-only clauses; disputed/pending stay "matters to be resolved"),
  `memorandumText`, `sliderBounds`, `statusLabel`.
- **View** (`src/components/settlement-view.tsx`): dual-pane latest-position
  comparison + delta badges, three keyboard-accessible negotiation sliders with
  live gap vs the respondent's latest offer and a "Save my position" action
  (appends a session-only applicant offer, channel "Working position"),
  agreement checklist with 3-state aria-pressed toggles, MoU draft preview
  (Georgia serif document panel, signature blocks, disclaimer) with Copy draft
  - confirm-then-export JSON (`alimony-plus-settlement-mou.json`).
- **Dialogs**: `DialogKind` "offer" and "term" in `record-dialog.tsx` —
  session-only `setData` branches (like hearings/sources); offers validate
  date ≤ asOf, ≥ 1 term, non-negative amounts, asset share ≤ 100.
- **Tests**: `tests/settlement.test.ts` (unit) + e2e flows in
  `workspace.spec.ts`, axe scans in `accessibility.spec.ts`, session-only
  behavior + overflow checks in `integration.spec.ts`.

### Hard product constraints (unchanged)

1. **No opposing-party contact.** The workspace records offers exchanged
   through lawyers/mediators — never automated outreach.
2. **Not legal advice.** The MoU is framed "DRAFT FOR REVIEW — NOT LEGAL
   ADVICE" with a disclaimer footer.
3. **Safety first.** Domestic-violence disclosures route to the safety-first
   branch, not negotiation tooling.
4. **Unknown ≠ 0.** Absent offer terms stay null; a blank input is never read
   as a known zero or as agreement.
5. **Session-only honesty.** Until backend entities exist (see
   `API-HANDOFF.md` "Needed for durable settlement negotiation"), records are
   in-memory only and labeled as such in both demo and live modes.
6. **Disclosure alignment.** Settlement prep reuses the Rajnesh-mandated
   structured disclosure modeled by the data workspace rather than inventing a
   parallel financial model.

### Extension checklist (how to add another section correctly)

1. Add the section id to the allowlist in `src/app/[section]/page.tsx`.
2. Add matching `nav` and `pageTitles` entries in `workspace-app.tsx`.
3. Build the view as an exported function component (pattern: `workspace-extras.tsx`) and
   render it via a `{section === "..." && <View/>}` block in `workspace-app.tsx` so it
   shares the shell, banner, toast and mode state.
4. If records are created via forms, extend `DialogKind` and the corresponding branch in
   `record-dialog.tsx` (uncontrolled `FormData`, per-kind validation, demo-only field
   gating).
5. Add domain types to `src/lib/types.ts` and synthetic records to `src/lib/demo.ts`
   (with an as-of note); add the new array(s) to the `Workspace` shape.
6. Put any pure logic (term diffing, position comparison, scenario summaries) in
   `src/lib/` as testable functions with Vitest edge-case tests.
7. Add Playwright flows to `tests/e2e/` and ensure the axe scan covers the new route.
8. Document any needed backend support in `API-HANDOFF.md` (server-owned entities,
   persistence, review workflow) — do not invent an API in the UI.
9. Exports, if any, follow the JSON handoff pattern: `schemaVersion`, `synthetic` flag,
   `asOf`, and an explicit `limitations[]` list (see the existing export summary and the
   AI preparation export v1.0 spec).

### Verification bar

`npm run typecheck` → `npm test` → `npm run test:e2e` (includes axe scans) →
`npm run build`, plus `npm run format`. Frontend tests establish UI correctness only —
never legal correctness or backend readiness.
