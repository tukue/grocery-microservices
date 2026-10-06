# Grove Grocery frontend design and customer flow

This is the design reference for the grocery storefront. Use it together with
`architecture.md`, `../../docs/frontend-implementation-approach.md`, and
`../../BACKEND_SKILL.md`. It describes the intended experience; implementation
and validation status belong in the delivery notes, not in this specification.

## Product principles

Make everyday grocery shopping calm, clear, and easy to complete. Let customers
browse before signing in, retain their cart after sign-in, and recover an
order from its URL. Show real backend data and explain failures with an action
the customer can take. Do not invent delivery promises, discounts, stock,
ratings, payment success, or order completion.

The customer path is catalogue → product detail → sign-in when needed → cart
→ review and checkout → persisted confirmation → receipt and order history.
The current backend checkout does not take delivery details or payment data;
do not present working address, payment, or delivery controls without their API
contracts and implementations.

Use concise, professional customer-facing language. Prefer direct labels such as
“Review your order” and “Sign in to continue shopping” over conversational slogans.
Describe only supported features; do not imply favourites or other unavailable
account capabilities. Use “cart” consistently throughout the shopping journey.

## Visual identity

The storefront name is **Grove Grocery**. Use a warm cream canvas, forest-green
actions, and restrained botanical illustrations. The editorial hero introduces
the shop; the product grid and shopping actions remain the main content.

| Token                | Value                 | Use                                  |
| -------------------- | --------------------- | ------------------------------------ |
| Canvas               | `#faf9f5`             | Page background                      |
| Surface              | `#ffffff`             | Product cards, forms, order details  |
| Primary              | `#245c3e`             | Primary buttons, links, prices       |
| Primary strong       | `#173d2b`             | Brand and action hover               |
| Text                 | `#223b2c`             | Main copy                            |
| Muted text           | `#6a746b`             | Supporting copy                      |
| Border               | `#e3e7dc`             | Panels and separators                |
| Soft surface         | `#edf1e5`             | Cart summary and supportive panels |
| Focus                | `#db9a41`             | Visible keyboard focus               |
| Error surface / text | `#fff1ed` / `#8c3927` | Customer-facing failures             |

Use the system sans-serif stack for UI and Georgia for the brand and editorial
hero. Avoid remote font dependencies. Page titles scale between 30 and 48px;
the hero scales between 36 and 58px. Body text is 14–16px, supporting copy
12–14px, and uppercase eyebrow labels 12px with generous tracking. Keep small
type for supporting information, never essential instructions.

Use an 8px spacing rhythm with 12px and 20px intermediate gaps. Controls have
8px corners, cards 12px, and feature panels 16px. Borders are subtle; shadows
are restrained and appear primarily on interactive cards. Primary actions
must have at least a 44px interaction height. Keep motion brief and disable
decorative animation when reduced motion is requested.

## Layout and responsive behavior

The shared shell contains a concise brand message, brand/home link, main
navigation, cart count, account action, content area, and footer. Provide a
keyboard skip link and labelled navigation landmarks. Highlight the current
route. Show sign-out and order history after authentication; do not expose the
upstream JWT in the UI or browser storage.

The content width is at most 1280px. Use 40px horizontal desktop padding, 24px
on tablet, and 16px on mobile. Below 1000px reduce the catalogue to three
columns; below 720px use two columns, stack the hero, detail, cart summary,
and sign-in panels, and give navigation its own row. Product card content must
wrap without clipping. Order tables have an accessible horizontal scrolling
container when necessary. Do not hide essential controls on narrow screens.

Use real product images when supplied. A failed or absent image uses a neutral
botanical placeholder with an accessible label. Decorative hero art is hidden
from assistive technology. Do not use fabricated product photography as if it
were a backend product image.

## Reusable UI patterns

| Pattern            | Contract                                                                     |
| ------------------ | ---------------------------------------------------------------------------- |
| Primary button     | One main action per decision area; green, clear verb                         |
| Secondary action   | Outline or text link; lower emphasis                                         |
| Product card       | Image, name, description, price with currency, availability, detail link     |
| Availability badge | Text plus color; unavailable products remain inspectable                     |
| Quantity control   | Labelled decrement/increment controls, current value, disabled pending state |
| Cart summary     | Item count and price preview; persisted order is the final authority         |
| Empty state        | Explain absence and offer a relevant next action                             |
| Error state        | Customer-safe message, recovery action, no raw internal error or stack trace |
| Loading state      | Visible status text; decorative skeletons hidden from assistive technology   |
| Success feedback   | Polite live status; never rely on color alone                                |
| Receipt panel      | Ready, pending, delayed, unavailable, and access-denied states               |

Forms use persistent visible labels, browser autocomplete where appropriate,
and native validation supplemented by domain validation. Disabled controls
must communicate the pending or unavailable reason nearby. Prevent rapid
double submission synchronously, and retain server-side idempotency as the
correctness boundary.

## Screen specifications

### Catalogue

Show the editorial hero when browsing the unfiltered shop, then the catalogue
title, search, stock filter, sort control, result count, and product grid.
Search is represented in the URL and debounced. Abort stale requests and keep
browser back/forward navigation consistent with the input. Price sorting must
not compare unlike currencies as if they were equivalent. Distinguish initial
loading, no matches, empty catalogue, and service failure; offer retry for
service failure. Never silently render stale results as current.

### Product detail

Use a two-column image/details layout on desktop and a stacked mobile layout.
Show the backend name, description, currency-formatted price, availability,
quantity input, add action, and cart link. Validate positive integer
quantity and known stock limits. A signed-out add action leads to sign-in and
returns to the product; require an explicit add after authentication. Explain
mutation failure without falsely claiming the cart changed.

### Sign-in and session

Pair a short brand panel with a compact labelled username/password form. Keep
the requested internal route through sign-in; reject external redirect
destinations. Disable duplicate submission. Surface failed sign-in and failed
sign-out. Expired-session responses must lead to authentication without
displaying another customer's data. Public browsing stays available.

### Cart

Show current server-confirmed lines, price previews, quantity controls, remove
actions, and a summary beside the lines. Use an empty cart panel with a shop
link when there are no mutable lines. Mutations replace local data with the
server response. On optimistic failure restore or reload authoritative state
and show actionable feedback. Serialize or guard overlapping mutations so
late responses cannot lose another change. Disable checkout during mutation.

The cart API currently exposes line prices without a currency or aggregate
total. Until the backend contract supplies them, display the numeric cart
preview without inventing a currency. Submit only cart ID and idempotency key;
the backend calculates and persists the authoritative order total.

### Checkout

Show cart/review/confirmation progress, line names and quantities, amount
preview, and one place-order action. No fabricated address or card form.
Retain the same idempotency key when the outcome is ambiguous, and prevent
double submission. Distinguish expired session, ownership denial, missing
cart, stock/state conflict, and temporary outage. On success clear the mutable
cart and navigate to the persisted order URL.

### Confirmation and receipt

Load the owned order from the backend before claiming successful confirmation.
Show order ID, creation time, lifecycle status, immutable lines and recorded
total. Provide shop and history links. A missing or forbidden order never
shows purchase data or a success claim.

Receipt projection is separate from order status. Read it through authenticated
BFF routes. Treat a missing receipt as pending only after order ownership is
confirmed. Poll with bounded backoff, stop on completion/navigation, and show
a delayed state with a retry action after the wait budget. An outage is
unavailable, not an instruction to resubmit checkout. Render receipt text as
plain text, not HTML. The current event has no itemized snapshot; the persisted
order remains the source for purchased line details.

### Order history

List owned orders newest first with ID, formatted creation time, lifecycle
status, and recorded total. Link each order to its persisted details. Distinguish
loading, no orders, failure, and expired session. Provide a shop action in the
empty state and a retry action in the failure state.

## API and architecture rules

Browser requests use relative `/api` routes. The Express BFF owns the HttpOnly
session cookie and upstream token. Redis stores runtime sessions. Validate
network data at feature API boundaries and map DTOs to domain types before
rendering. UI components do not call microservice URLs. Cross-feature imports
use public feature entrypoints; shared modules do not import features.

Ledger integration extends the BFF with `LEDGER_SERVICE_URL` and the existing
backend endpoints `/api/customer/ledger` and
`/api/customer/ledger/orders/{orderId}/receipt`. Preserve JWT scopes and backend
ownership checks. Never convert arbitrary 404 responses into receipt-pending
without validating the owned order first.

## Acceptance and maintenance

Run formatting, lint, type checks, unit/component tests, production build, and
Playwright journey tests. Cover public discovery, search/back navigation,
sign-in and return route, cart add/update/remove/reload, mutation recovery,
retry-safe checkout, confirmation reload, history, receipt pending-to-ready,
ownership denial, session expiry, and mobile navigation. Browser API fixtures
must be stateful and intercept only the actual `/api/` namespace.

Review desktop and mobile screenshots and keyboard navigation. Keep mocked
browser verification distinct from a real backend/Kafka integration test.
Update this reference when a visual token, reusable component, customer flow,
or API-driven behavior changes. Keep feature-specific exceptions explicit;
avoid introducing a second visual system on an individual page.
