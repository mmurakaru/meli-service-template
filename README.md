# meli-service-template

Effect.ts service skeleton for meli backend services. A **walking skeleton**: one
example module wired through every layer the architecture prescribes - HTTP, DI,
persistence, background jobs, config, observability, healthchecks - so a new
service starts from a proven shape rather than a blank page.

The architecture decisions behind this skeleton are recorded on the wayfinder map
in `mmurakaru/meli-turbo` (issues [#151](https://github.com/mmurakaru/meli-turbo/issues/151)-[#163](https://github.com/mmurakaru/meli-turbo/issues/163)).

## Stack

- **HTTP**: Fastify 5 shell; Effect runs behind a single `ManagedRuntime`. Route
  handlers are thin adapters that build an Effect and `runtime.runPromise` it.
  Contracts stay Zod via `fastify-type-provider-zod`; OpenAPI + Scalar at `/documentation`.
- **DI**: per-module Layer bundles composed in `src/runtime/AppRuntime.ts`.
- **Persistence**: `@effect/sql` + `@effect/sql-drizzle` (node-postgres driver),
  drizzle-kit migrations. Queries are Effects failing with `SqlError`.
- **Jobs**: BullMQ `Queue`/`Worker` wrapped in scoped Layers. BullMQ owns
  attempts/backoff; `Effect.Schedule` handles in-attempt retries.
- **Config**: `Effect.Config` in `src/runtime/config.ts`; env docs generated from
  the config definition itself.
- **Logging**: Effect `Logger.json` (production) / `Logger.pretty` (dev) to stdout.
- **Observability**: one `@effect/opentelemetry` pipeline - OTLP traces (opt-in)
  plus a Prometheus exporter serving `/metrics` on port 9080.
- **Error/analytics**: PostHog (`posthog-node`), no-op without `POSTHOG_API_KEY`.

## Layout

```
src/
  modules/<name>/
    http/         route registrars (registerRoutes)
    services/     service + repository (module-private unless exported from index.ts)
    jobs/         BullMQ queue + worker layers
    schemas/      Zod contracts
    index.ts      the module's public surface: its Layer, its routes, its public Tags
  runtime/        composition root, config, and the infrastructure layers
  db/             drizzle schema + migrations
scripts/          env-doc generation/validation
```

A module's `index.ts` is its boundary: it exports only the composed Layer, the
route registrar, and the Tags other modules may depend on. Everything else
(repositories, job internals) stays unexported and therefore module-private.

## Adding a module

1. Create `src/modules/<name>/` with the four subfolders.
2. Export `<Name>ModuleLive` and `register<Name>Routes` from its `index.ts`.
3. Add `<Name>ModuleLive` to `AppLive` in `src/runtime/AppRuntime.ts`.
4. Add `register<Name>Routes(app, runtime)` in `src/server.ts`.

## Quickstart

```bash
cp .env.default .env          # then set JWT_PUBLIC_KEY
node --run docker:up          # postgres, redis, prometheus, grafana
node --run db:migrate
node --run dev                # http on :3000, metrics on :9080
```

## Checks

```bash
node --run typecheck          # tsc
node --run lint               # biome + tsc + env-doc validation
node --run test               # vitest (integration specs skip without DATABASE_URL)
```
