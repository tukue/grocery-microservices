# Frontend Backlog

This file tracks frontend work that is intentionally not implemented in the
current product and cart foundation.

## Integration spec status

- [x] Phase 6 Confirmation (INT-17 order read adapter, INT-18 confirmation
  page, INT-19 order history) — see `Grocery_PR59_Integration_Spec.md`.
- [x] Phase 7 Quality Gates (INT-20 vitest file discovery, INT-21 API client
  tests, INT-22 auth and cart context tests, INT-23 Playwright happy-path
  smoke test).
- [x] Phase 8 Cleanup (INT-24 duplicate Vite-era components, INT-25 Vite
  starter assets, INT-26 CI format/lint/type-check/test/build/e2e).

## Customer authentication

- [ ] Implement the production sign-in/session flow that writes a short-lived,
  httpOnly `access_token` cookie. The add-to-cart Server Action already reads
  this cookie on the server and returns an accessible sign-in message when it
  is absent; it does not expose a token to browser JavaScript.
- [ ] Add session expiry, refresh, sign-out, and CSRF protections appropriate
  to the selected identity provider and deployment topology.

## Verification and delivery

- [x] Restore a working local `npm ci` environment and run `npm run lint`,
  `npm run type-check`, `npm test`, and `npm run build`. All four pass, and
  `npm run test:e2e` runs the Playwright smoke test against mocked API routes.
- [ ] Add browser-level coverage against an authenticated, deployed cart and
  product environment once the session flow exists.
