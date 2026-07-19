# meli-service-template

Effect.ts service skeleton for meli backend services.

This template captures the enterprise structure of the meli services - modular boundaries, dependency injection, background jobs, config, healthchecks, and observability - expressed in idiomatic Effect.ts instead of the Lokalise package stack.

## Status

Pre-skeleton. The walking skeleton lands once the architecture decisions on the
[wayfinder map](https://github.com/mmurakaru/meli-turbo/issues/151) are locked:

- Module and DI architecture in Effect Layers (meli-turbo#156)
- Observability and vendor scope (meli-turbo#157)
- HTTP layer, persistence, and background-job choices from the map's research tickets

## Intended contents

- One example module (route, service, repository, background job) demonstrating the Layer composition pattern
- `Effect.Config`-based configuration
- Healthchecks and graceful shutdown
- Observability baseline (tracing, metrics, structured logging)
