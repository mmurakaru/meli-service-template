import type { SqlError } from '@effect/sql'
import { Context, Data, Effect, Layer, Option } from 'effect'
import { ExampleJobQueue } from '../jobs/ExampleJob.ts'
import type { ExampleItemResponse } from '../schemas/exampleSchemas.ts'
import { ExampleRepository } from './ExampleRepository.ts'

export class ExampleItemNotFound extends Data.TaggedError('ExampleItemNotFound')<{
  readonly id: string
}> {}

export class QueueUnavailable extends Data.TaggedError('QueueUnavailable')<{
  readonly cause: unknown
}> {}

export type ExampleServiceApi = {
  readonly createItem: (
    name: string,
  ) => Effect.Effect<{ id: string }, SqlError.SqlError | QueueUnavailable>
  readonly getItem: (
    id: string,
  ) => Effect.Effect<ExampleItemResponse, SqlError.SqlError | ExampleItemNotFound>
}

export class ExampleService extends Context.Tag('ExampleService')<
  ExampleService,
  ExampleServiceApi
>() {}

export const ExampleServiceLive = Layer.effect(
  ExampleService,
  Effect.gen(function* () {
    const repository = yield* ExampleRepository
    const queue = yield* ExampleJobQueue
    return {
      createItem: (name) =>
        Effect.gen(function* () {
          const id = yield* repository.insert(name)
          yield* Effect.tryPromise({
            try: () => queue.add('process-example-item', { itemId: id }),
            catch: (cause) => new QueueUnavailable({ cause }),
          })
          yield* Effect.annotateCurrentSpan('exampleItem.id', id)
          yield* Effect.logInfo('Example item created').pipe(
            Effect.annotateLogs('exampleItemId', id),
          )
          return { id }
        }),
      getItem: (id) =>
        repository.findById(id).pipe(
          Effect.flatMap(
            Option.match({
              onNone: () => Effect.fail(new ExampleItemNotFound({ id })),
              onSome: (row) =>
                Effect.succeed({
                  id: row.id,
                  name: row.name,
                  status:
                    row.status === 'processed' ? ('processed' as const) : ('pending' as const),
                  createdAt: row.createdAt.toISOString(),
                }),
            }),
          ),
        ),
    }
  }),
)
