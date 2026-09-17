# Frontend Architecture

## Import Boundaries

- `src/app` may import feature and shared modules.
- Feature modules may import shared modules.
- Shared modules must not import feature modules.
- A feature must not import another feature's internal files; use only its public `index.ts` entrypoint when cross-feature collaboration is required.

## Application Boundaries

- UI components must not call backend services directly.
- Domain modules must not depend on React or Next.js.
- Backend DTOs must remain inside API layers and must not leak into domain or UI modules.
