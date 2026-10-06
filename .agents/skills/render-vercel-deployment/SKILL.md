---
name: render-vercel-deployment
description: Plan, configure, review, or document deployments of this grocery microservices repository with Spring Boot services on Render and the Vite frontend on Vercel.
---

Use this skill for Render/Vercel deployment planning, configuration reviews,
deployment troubleshooting, and release checklists for this repository.

Read `docs/DEPLOYMENT_RENDER_VERCEL.md` before proposing deployment
configuration.

Repository constraints:

- The backend consists of cart, product, order, and summary Spring Boot
  services under `microservices/`.
- Deploy each service from its existing Dockerfile with the repository root as
  Docker build context.
- Production uses `SPRING_PROFILES_ACTIVE=prod`; it requires Postgres, a real
  OIDC issuer, CORS allowlists, and Kafka for order and ledger services.
- Use Render internal database URLs and private Render service URLs for
  backend-to-backend traffic.
- The frontend is Vite, with root directory `frontend`, build command
  `npm run build`, and output directory `dist`.
- The current Vite `/api` BFF proxy is development-only. Do not claim a static
  Vercel deployment supports login, cart, or checkout until Vercel Functions
  or an equivalent production BFF is implemented.
- Never add secrets, database credentials, JWTs, or broker credentials to Git.
- Before recommending production rollout, include health checks, rollback
  steps, and post-deploy checkout validation.
