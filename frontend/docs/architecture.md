# Frontend Architecture

Use [the storefront design system](design-system.md) for visual tokens,
responsive layouts, customer screens, and recovery behavior. Use the repository
frontend implementation approach for API validation and delivery practices.

See [the current implementation](current-implementation.md) for runtime behavior
and [the application overview](../../docs/architecture-overview.md) for service
ownership and event flow.

## Import Boundaries

- `src/app` may import feature and shared modules.
- Feature modules may import shared modules.
- Shared modules must not import feature modules.
- A feature must not import another feature's internal files; use only its public `index.ts` entrypoint when cross-feature collaboration is required.

## Application Boundaries

- UI components must not call backend services directly.
- Domain modules must not depend on React or Next.js.
- Backend DTOs must remain inside API layers and must not leak into domain or UI modules.
