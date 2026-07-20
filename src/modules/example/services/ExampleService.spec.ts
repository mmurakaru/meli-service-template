import { describe, expect, it } from '@effect/vitest'
import { Effect, Layer, Option } from 'effect'
import type { ExampleItemRow } from '../../../db/schema.ts'
import { ErrorReporter } from '../../../runtime/PostHog.ts'
import { ExampleJobQueue } from '../jobs/ExampleJob.ts'
import { ExampleRepository } from './ExampleRepository.ts'
import { ExampleService, ExampleServiceLive } from './ExampleService.ts'

const storedRow: ExampleItemRow = {
  id: 'item-1',
  name: 'stored item',
  status: 'processed',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
}

const repositoryDouble = Layer.succeed(ExampleRepository, {
  insert: () => Effect.succeed('generated-id'),
  findById: (id) =>
    id === storedRow.id ? Effect.succeed(Option.some(storedRow)) : Effect.succeed(Option.none()),
  markProcessed: () => Effect.void,
})

const enqueuedJobs: Array<string> = []
const queueDouble = Layer.succeed(ExampleJobQueue, {
  add: (name: string) => {
    enqueuedJobs.push(name)
    return Promise.resolve({ id: 'job-1' })
  },
} as never)

const reporterDouble = Layer.succeed(ErrorReporter, {
  captureException: () => Effect.void,
  captureEvent: () => Effect.void,
})

const TestLayer = ExampleServiceLive.pipe(
  Layer.provide(Layer.mergeAll(repositoryDouble, queueDouble, reporterDouble)),
)

describe('ExampleService', () => {
  it.effect('creates an item and enqueues its processing job', () =>
    Effect.gen(function* () {
      const service = yield* ExampleService
      const result = yield* service.createItem('fresh item')
      expect(result.id).toBe('generated-id')
      expect(enqueuedJobs).toContain('process-example-item')
    }).pipe(Effect.provide(TestLayer)),
  )

  it.effect('returns a stored item mapped to the response shape', () =>
    Effect.gen(function* () {
      const service = yield* ExampleService
      const item = yield* service.getItem('item-1')
      expect(item).toEqual({
        id: 'item-1',
        name: 'stored item',
        status: 'processed',
        createdAt: '2026-01-01T00:00:00.000Z',
      })
    }).pipe(Effect.provide(TestLayer)),
  )

  it.effect('fails with ExampleItemNotFound for an unknown id', () =>
    Effect.gen(function* () {
      const service = yield* ExampleService
      const outcome = yield* service.getItem('missing').pipe(Effect.flip)
      expect(outcome._tag).toBe('ExampleItemNotFound')
    }).pipe(Effect.provide(TestLayer)),
  )
})
