# Grocery frontend guidance

The customer storefront runs React + TypeScript with Vite and an Express BFF.
Before changing its UI, read [docs/design-system.md](docs/design-system.md) and
[docs/architecture.md](docs/architecture.md). Follow
[the frontend implementation approach](../docs/frontend-implementation-approach.md)
for API validation, session security, checkout idempotency, and verification.
Keep future screens consistent with the shared storefront design. The legacy
Next.js files are not the active Vite customer entrypoint.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
