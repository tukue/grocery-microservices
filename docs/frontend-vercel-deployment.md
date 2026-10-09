# Vercel Frontend Deployment

## Scope

The frontend is a Vite single-page application. Vercel hosts the static build;
the session BFF remains a separate service because the current BFF is a Vite
development plugin and is not included in `vite build` output.

Define and review feature requirements before deployment using the
[feature-definition template](feature-definition-before-vercel.md).

## Prerequisites

- Deploy the BFF on a public HTTPS URL before deploying the frontend.
- Configure the BFF with reachable `CART_SERVICE_URL`, `ORDER_SERVICE_URL`, and
  `PRODUCT_SERVICE_URL` values.
- Configure the BFF cookie with `Secure`, `HttpOnly`, and `SameSite=Lax` in
  production. The BFF must be hosted on the same site as the frontend, or use
  a deliberate cross-site cookie policy.

## Vercel Project Settings

1. Import the repository and set the Root Directory to `frontend`.
2. Use `npm ci` as the install command.
3. Use `npm run build` as the build command.
4. Publish the `dist` directory.
5. Set Node.js to version 24.

## API Routing

Create `frontend/vercel.json` during the production BFF rollout and replace
`BFF_ORIGIN` with the HTTPS BFF origin:

```json
{
  "rewrites": [{ "source": "/api/(.*)", "destination": "BFF_ORIGIN/api/$1" }]
}
```

Do not expose microservice URLs to the browser. Browser requests use relative
`/api/...` paths; the BFF adds authorization from its HttpOnly session cookie.

## Verification

After deployment, verify the following from the Vercel URL:

- `/products` loads catalog data through `/api/catalog/products`.
- A signed-out visit to `/cart` redirects to `/login`.
- Sign-in creates a Secure HttpOnly cookie and `/api/auth/me` returns the
  expected session.
- Add-to-cart and checkout requests contain no browser-managed JWT.
