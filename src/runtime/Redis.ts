import { Context, Effect, Layer, Option, Redacted } from 'effect'
import { Redis, type RedisOptions } from 'ioredis'
import { AppConfig, type AppConfigValues } from './config.ts'

export class RedisConnection extends Context.Tag('RedisConnection')<RedisConnection, Redis>() {}

/**
 * ioredis client for healthchecks and ad-hoc use, closed with the runtime scope.
 * `maxRetriesPerRequest: null` keeps the client compatible with BullMQ semantics.
 */
export const RedisLive = Layer.scoped(
  RedisConnection,
  Effect.gen(function* () {
    const config = yield* AppConfig
    return yield* Effect.acquireRelease(
      Effect.sync(() => new Redis(redisOptionsFromConfig(config.redis))),
      (client) => Effect.promise(() => client.quit().then(noop, noop)),
    )
  }),
)

export function redisOptionsFromConfig(redis: AppConfigValues['redis']): RedisOptions {
  return {
    host: redis.host,
    port: redis.port,
    maxRetriesPerRequest: null,
    ...Option.match(redis.password, {
      onNone: () => ({}),
      onSome: (password) => ({ password: Redacted.value(password) }),
    }),
  }
}

function noop(): void {}
