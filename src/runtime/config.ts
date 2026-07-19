import { Config, Context, Layer, LogLevel } from 'effect'

export type EnvironmentVariableSpec = {
  readonly name: string
  readonly group: string
  readonly description: string
  readonly secret?: boolean
  readonly defaultValue?: string
  readonly optional?: boolean
}

const registry: Array<EnvironmentVariableSpec> = []

/**
 * Registers a variable's documentation metadata while constructing its Config, so
 * `scripts/generate-env-docs.ts` can render docs from the same definition it validates.
 */
function documented<A>(
  spec: EnvironmentVariableSpec,
  build: (name: string) => Config.Config<A>,
): Config.Config<A> {
  registry.push(spec)
  return build(spec.name)
}

const appConfig = Config.all({
  nodeEnv: documented(
    {
      name: 'NODE_ENV',
      group: 'app',
      description: 'Runtime environment; selects pretty vs JSON logging.',
      defaultValue: 'development',
    },
    (name) =>
      Config.literal(
        'development',
        'production',
        'test',
      )(name).pipe(Config.withDefault('development' as const)),
  ),
  appVersion: documented(
    {
      name: 'APP_VERSION',
      group: 'app',
      description: 'Application version reported by the health endpoint and traces.',
      defaultValue: 'VERSION_NOT_SET',
    },
    (name) => Config.string(name).pipe(Config.withDefault('VERSION_NOT_SET')),
  ),
  port: documented(
    {
      name: 'APP_PORT',
      group: 'app',
      description: 'HTTP server listening port.',
      defaultValue: '3000',
    },
    (name) => Config.integer(name).pipe(Config.withDefault(3000)),
  ),
  bindAddress: documented(
    {
      name: 'APP_BIND_ADDRESS',
      group: 'app',
      description: 'HTTP server bind address (0.0.0.0 exposes on all interfaces).',
      defaultValue: '0.0.0.0',
    },
    (name) => Config.string(name).pipe(Config.withDefault('0.0.0.0')),
  ),
  logLevel: documented(
    {
      name: 'LOG_LEVEL',
      group: 'app',
      description: 'Minimum log level emitted by the Effect logger.',
      defaultValue: 'Info',
    },
    (name) => Config.logLevel(name).pipe(Config.withDefault(LogLevel.Info)),
  ),
  jwtPublicKey: documented(
    {
      name: 'JWT_PUBLIC_KEY',
      group: 'app',
      description:
        'RS256 public key (PEM) used to verify request JWTs; use || as a newline separator on a single line.',
    },
    (name) => Config.string(name).pipe(Config.map((value) => value.replaceAll('||', '\n'))),
  ),
})

const databaseConfig = Config.all({
  url: documented(
    {
      name: 'DATABASE_URL',
      group: 'database',
      description: 'PostgreSQL connection URL including credentials and database name.',
      secret: true,
    },
    (name) => Config.redacted(name),
  ),
  maxConnections: documented(
    {
      name: 'DATABASE_MAX_CONNECTIONS',
      group: 'database',
      description: 'Maximum size of the PostgreSQL connection pool.',
      defaultValue: '10',
    },
    (name) => Config.integer(name).pipe(Config.withDefault(10)),
  ),
})

const redisConfig = Config.all({
  host: documented(
    {
      name: 'REDIS_HOST',
      group: 'redis',
      description: 'Redis hostname used by the BullMQ connection.',
      defaultValue: 'localhost',
    },
    (name) => Config.string(name).pipe(Config.withDefault('localhost')),
  ),
  port: documented(
    {
      name: 'REDIS_PORT',
      group: 'redis',
      description: 'Redis port.',
      defaultValue: '6379',
    },
    (name) => Config.integer(name).pipe(Config.withDefault(6379)),
  ),
  password: documented(
    {
      name: 'REDIS_PASSWORD',
      group: 'redis',
      description: 'Redis password; omit for an unauthenticated local Redis.',
      secret: true,
      optional: true,
    },
    (name) => Config.redacted(name).pipe(Config.option),
  ),
  keyPrefix: documented(
    {
      name: 'REDIS_KEY_PREFIX',
      group: 'redis',
      description: 'Prefix applied to every BullMQ Redis key.',
      defaultValue: 'meli',
    },
    (name) => Config.string(name).pipe(Config.withDefault('meli')),
  ),
})

const queueConfig = Config.all({
  concurrency: documented(
    {
      name: 'QUEUE_CONCURRENCY',
      group: 'queue',
      description: 'Number of jobs a BullMQ worker processes concurrently.',
      defaultValue: '5',
    },
    (name) => Config.integer(name).pipe(Config.withDefault(5)),
  ),
})

const posthogConfig = Config.all({
  apiKey: documented(
    {
      name: 'POSTHOG_API_KEY',
      group: 'posthog',
      description: 'PostHog project API key; when unset, error and event capture are no-ops.',
      secret: true,
      optional: true,
    },
    (name) => Config.redacted(name).pipe(Config.option),
  ),
  host: documented(
    {
      name: 'POSTHOG_HOST',
      group: 'posthog',
      description: 'PostHog ingestion host.',
      defaultValue: 'https://eu.i.posthog.com',
    },
    (name) => Config.string(name).pipe(Config.withDefault('https://eu.i.posthog.com')),
  ),
})

const observabilityConfig = Config.all({
  serviceName: documented(
    {
      name: 'OTEL_SERVICE_NAME',
      group: 'observability',
      description: 'Resource service.name attached to traces and metrics.',
      defaultValue: 'meli-service-template',
    },
    (name) => Config.string(name).pipe(Config.withDefault('meli-service-template')),
  ),
  tracingEnabled: documented(
    {
      name: 'OTEL_TRACING_ENABLED',
      group: 'observability',
      description: 'Whether to export OpenTelemetry traces via OTLP.',
      defaultValue: 'false',
    },
    (name) => Config.boolean(name).pipe(Config.withDefault(false)),
  ),
  exporterUrl: documented(
    {
      name: 'OTEL_EXPORTER_OTLP_TRACES_ENDPOINT',
      group: 'observability',
      description: 'OTLP HTTP traces endpoint used when tracing is enabled.',
      defaultValue: 'http://localhost:4318/v1/traces',
    },
    (name) => Config.string(name).pipe(Config.withDefault('http://localhost:4318/v1/traces')),
  ),
  prometheusPort: documented(
    {
      name: 'METRICS_PROMETHEUS_PORT',
      group: 'observability',
      description: 'Port on which the Prometheus exporter serves /metrics.',
      defaultValue: '9080',
    },
    (name) => Config.integer(name).pipe(Config.withDefault(9080)),
  ),
})

const rootConfig = Config.all({
  app: appConfig,
  database: databaseConfig,
  redis: redisConfig,
  queue: queueConfig,
  posthog: posthogConfig,
  observability: observabilityConfig,
})

export type AppConfigValues = typeof rootConfig extends Config.Config<infer A> ? A : never

export class AppConfig extends Context.Tag('AppConfig')<AppConfig, AppConfigValues>() {}

export const AppConfigLive = Layer.effect(AppConfig, rootConfig)

/** Documentation metadata for every environment variable, in declaration order. */
export const environmentVariableRegistry: ReadonlyArray<EnvironmentVariableSpec> = registry
