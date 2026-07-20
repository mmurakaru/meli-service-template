import { describe, expect, it } from '@effect/vitest'
import { Effect, Layer, Option } from 'effect'
import { AppConfigLive } from '../../../runtime/config.ts'
import { DatabaseLive } from '../../../runtime/Database.ts'
import { ExampleRepository, ExampleRepositoryLive } from './ExampleRepository.ts'

const hasDatabase = process.env.DATABASE_URL !== undefined

const IntegrationLayer = ExampleRepositoryLive.pipe(
  Layer.provide(DatabaseLive),
  Layer.provide(AppConfigLive),
)

// Requires real infrastructure: `node --run docker:up && node --run db:migrate`.
describe.skipIf(!hasDatabase)('ExampleRepository (integration)', () => {
  it.scoped('inserts, reads back, and marks an item processed', () =>
    Effect.gen(function* () {
      const repository = yield* ExampleRepository
      const id = yield* repository.insert('integration item')

      const inserted = yield* repository.findById(id)
      expect(Option.isSome(inserted)).toBe(true)
      expect(Option.getOrThrow(inserted).status).toBe('pending')

      yield* repository.markProcessed(id)
      const processed = yield* repository.findById(id)
      expect(Option.getOrThrow(processed).status).toBe('processed')
    }).pipe(Effect.provide(IntegrationLayer)),
  )
})
