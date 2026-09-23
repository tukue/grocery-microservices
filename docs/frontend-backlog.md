# Frontend Backlog

This file tracks frontend work that is intentionally not implemented in the
current product and cart foundation.

## Integration spec status

- [x] Phase 6 Confirmation (INT-17 order read adapter, INT-18 confirmation
  page, INT-19 order history) — see `Grocery_PR59_Integration_Spec.md`.

## Customer authentication

- [ ] Implement the production sign-in/session flow that writes a short-lived,
  httpOnly `access_token` cookie. The add-to-cart Server Action already reads
  this cookie on the server and returns an accessible sign-in message when it
  is absent; it does not expose a token to browser JavaScript.
- [ ] Add session expiry, refresh, sign-out, and CSRF protections appropriate
  to the selected identity provider and deployment topology.

## Verification and delivery

- [ ] Restore a working local `npm ci` environment and run `npm run lint`,
  `npm run type-check`, `npm test`, and `npm run build`. The local dependency
  installation stalled before `tsc` and Vitest became available.
- [ ] Add browser-level coverage against an authenticated, deployed cart and
  product environment once the session flow exists.
