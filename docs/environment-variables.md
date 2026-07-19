# Environment variables

Generated from `src/runtime/config.ts` by `node --run docs:generate` - do not edit by hand.

## app

| Variable | Default | Secret | Description |
|---|---|---|---|
| `NODE_ENV` | development |  | Runtime environment; selects pretty vs JSON logging. |
| `APP_VERSION` | VERSION_NOT_SET |  | Application version reported by the health endpoint and traces. |
| `APP_PORT` | 3000 |  | HTTP server listening port. |
| `APP_BIND_ADDRESS` | 0.0.0.0 |  | HTTP server bind address (0.0.0.0 exposes on all interfaces). |
| `LOG_LEVEL` | Info |  | Minimum log level emitted by the Effect logger. |
| `JWT_PUBLIC_KEY` | **required** |  | RS256 public key (PEM) used to verify request JWTs; use || as a newline separator on a single line. |

## database

| Variable | Default | Secret | Description |
|---|---|---|---|
| `DATABASE_URL` | **required** | yes | PostgreSQL connection URL including credentials and database name. |
| `DATABASE_MAX_CONNECTIONS` | 10 |  | Maximum size of the PostgreSQL connection pool. |

## redis

| Variable | Default | Secret | Description |
|---|---|---|---|
| `REDIS_HOST` | localhost |  | Redis hostname used by the BullMQ connection. |
| `REDIS_PORT` | 6379 |  | Redis port. |
| `REDIS_PASSWORD` | *(unset)* | yes | Redis password; omit for an unauthenticated local Redis. |
| `REDIS_KEY_PREFIX` | meli |  | Prefix applied to every BullMQ Redis key. |

## queue

| Variable | Default | Secret | Description |
|---|---|---|---|
| `QUEUE_CONCURRENCY` | 5 |  | Number of jobs a BullMQ worker processes concurrently. |

## posthog

| Variable | Default | Secret | Description |
|---|---|---|---|
| `POSTHOG_API_KEY` | *(unset)* | yes | PostHog project API key; when unset, error and event capture are no-ops. |
| `POSTHOG_HOST` | https://eu.i.posthog.com |  | PostHog ingestion host. |

## observability

| Variable | Default | Secret | Description |
|---|---|---|---|
| `OTEL_SERVICE_NAME` | meli-service-template |  | Resource service.name attached to traces and metrics. |
| `OTEL_TRACING_ENABLED` | false |  | Whether to export OpenTelemetry traces via OTLP. |
| `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` | http://localhost:4318/v1/traces |  | OTLP HTTP traces endpoint used when tracing is enabled. |
| `METRICS_PROMETHEUS_PORT` | 9080 |  | Port on which the Prometheus exporter serves /metrics. |
