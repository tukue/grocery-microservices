# Frontend Backlog

This file tracks frontend work that is intentionally not implemented in the
current product and cart foundation.

## Product contract completion

- [ ] Add a product `description` field to product-service persistence, DTOs,
  validation, API documentation, and migrations. The frontend currently shows
  the explicit fallback "Description not provided." because the API does not
  provide a description.
- [ ] Define and expose a product currency contract. Prices are currently
  decimal values without a currency, so the frontend display uses an
  overridable `SEK` default rather than treating it as product data.

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
