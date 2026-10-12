# Frontend / backend / AI handoff

## Existing contract used by the frontend

All browser requests use `/api/backend/*` on the Next.js origin. The server forwards to the existing Express `/api/*` endpoint with a bearer token from an HTTP-only cookie.

| Resource         | Existing endpoint                                       | Shape consumed                                                                       |
| ---------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Register / login | POST `/auth/register`, `/auth/login`                    | `name, email, password`; login returns user and token (token stripped before client) |
| Cases            | GET / POST `/cases`                                     | `{ cases }` / `{ title }`                                                            |
| Proceedings      | GET `/proceedings/case/:id`; POST `/proceedings`        | `{ proceedings }`; caseId, courtName, caseNumber, proceedingType, filedAt, status    |
| Orders           | GET `/orders/proceeding/:id`; POST `/orders`            | `{ orders }`; proceedingId, orderType, orderDate, amount, description                |
| Payments         | GET `/payments/order/:id`; POST `/payments`             | `{ payments }`; orderId, amount, paymentDate, status, reference, notes               |
| Documents        | POST `/documents/upload`; GET `/documents/:id/download` | multipart `document`, `caseId`, `documentType`; authenticated binary download        |
| Calculator       | POST `/calculator/run`                                  | `caseId` + named financial inputs; `{ calculatorRun: { formulaVersion, result } }`   |

Dates sent by forms are YYYY-MM-DD, matching current controllers. INR amounts are displayed with the Indian locale. Backend decimals are converted for presentation; production arithmetic should use decimal/minor-unit values server-side.

## Needed for authoritative maintenance reconciliation

Agree on server-owned entities before enabling the live monthly ledger:

- Order: effectiveDate, endDate, frequency, dueDay, currency, sourceDocumentId, supersedesOrderId; treatment of retrospective orders, stays, revisions and proration.
- Obligation: id, orderId, period, dueDate, expectedAmount; preserve the historical amount applicable to each period.
- Payment allocation: paymentId, obligationId, allocatedAmount; support multiple receipts, reversals, partial allocations, advance payments and credits. Never infer an allocation just from the receipt date.
- Ledger response: expected/received/outstanding by period and as-of date, unallocated credits, authoritative totals and calculation version. Do not double count overlapping orders.
- Event: caseId, type, local date/time, time zone, title, location, status. Reminder delivery needs explicit preferences and privacy-aware notification text.
- Document listing: GET by case with safe metadata and download authorization; document→order/payment links; original-file integrity and manual verification.

The demo currently assumes monthly obligations only, due day clamped to the last day of the month, no proration, no automatic credit carry-over, and overdue only after the due date. Effective dates after a month's due day skip that month. It is an illustrative prototype, not a substitute for interpreting the actual order.

## Needed for durable settlement negotiation

The settlement & mediation workspace records offers and checklist terms in the
session only. Before making it durable, agree on server-owned entities:

- Offer: id, caseId, party, date, channel (lawyer/mediation/court provenance), monthlyAmount, lumpSum, assetSplitPct (nullable — null means the term is not part of the offer, never zero), notes, author, supersedesOfferId.
- Negotiation term: id, caseId, title, detail, status (agreed/disputed/pending), statusHistory with actor and timestamp. Status changes should be auditable, not silently overwritten.
- MoU draft: versioned snapshot of agreed terms, generated text, case reference, reviewer identity, review status and expiry. A session draft is not an approved document.
- Review workflow: role-scoped review endpoints; an exported draft is `eligibleForLegalRetrieval: false` until a qualified reviewer approves it.
- Redaction checks before any export leaves the platform; no automated delivery of offers, drafts or messages to the opposing party.

## AI preparation export v1.0

Each record includes title, kind, provenance/section, source URL, effective date, review date, manual status, original value, frequency and certainty. Financial exports include currency, normalized numericValue and normalizedFrequency. Unknown is JSON null; annual recurring values divide by 12; one-time values remain one-time. Original values remain available.

`eligibleForLegalRetrieval` is always false: a manual UI review is not qualified legal approval. Before ingestion add reviewer identity, approved source/version/checksum, last review and expiry, jurisdiction, cited page/paragraph, supersession handling and redaction checks. Private case data must remain separate from shared legal knowledge. Retrieved documents and user uploads are untrusted data, not model instructions. No upload is automatically sent to a model.

The preparation workspace deliberately has no invented API. Add authenticated persistence and role-scoped legal review endpoints before making it durable. AI chat will need cited-source cards, review dates, grounded answers, uncertainty/human escalation, bilingual content and safety handling from the AI team.
