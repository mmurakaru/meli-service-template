import { Queue, Worker } from 'bullmq'
import { Context, Effect, Layer, Runtime } from 'effect'
import type { ErrorReporter } from '../../../runtime/PostHog.ts'
import { reportFailures } from '../../../runtime/PostHog.ts'
import { BullConnection } from '../../../runtime/Queue.ts'
import { ExampleRepository } from '../services/ExampleRepository.ts'

export const EXAMPLE_QUEUE_NAME = 'example-items'

export type ExampleJobPayload = { readonly itemId: string; readonly correlationId: string }

export class ExampleJobQueue extends Context.Tag('ExampleJobQueue')<
  ExampleJobQueue,
  Queue<ExampleJobPayload>
>() {}

/** BullMQ queue producer, closed with the runtime scope. */
export const ExampleJobQueueLive = Layer.scoped(
  ExampleJobQueue,
  Effect.gen(function* () {
    const bull = yield* BullConnection
    return yield* Effect.acquireRelease(
      Effect.sync(
        () =>
          new Queue<ExampleJobPayload>(EXAMPLE_QUEUE_NAME, {
            connection: bull.connection,
            prefix: bull.prefix,
            defaultJobOptions: {
              attempts: 3,
              backoff: { type: 'exponential', delay: 1000 },
              removeOnComplete: 100,
              removeOnFail: 1000,
            },
          }),
      ),
      (queue) => Effect.promise(() => queue.close().catch(() => undefined)),
    )
  }),
)

/**
 * BullMQ worker consuming the queue. The processor captures the Effect runtime at
 * layer construction so each job runs as a full Effect (traced, logged, reported).
 * BullMQ owns cross-process attempts/backoff; Effect handles in-attempt logic.
 */
export const ExampleWorkerLive: Layer.Layer<
  never,
  never,
  BullConnection | ExampleRepository | ErrorReporter
> = Layer.scopedDiscard(
  Effect.gen(function* () {
    const bull = yield* BullConnection
    const runtime = yield* Effect.runtime<ExampleRepository | ErrorReporter>()

    const processJob = (payload: ExampleJobPayload) =>
      Effect.gen(function* () {
        const repository = yield* ExampleRepository
        yield* repository.markProcessed(payload.itemId)
        yield* Effect.logInfo('Example item processed').pipe(
          Effect.annotateLogs('exampleItemId', payload.itemId),
        )
      }).pipe(
        reportFailures,
        Effect.annotateLogs('correlationId', payload.correlationId),
        Effect.withSpan('ExampleJob.process', {
          attributes: { 'exampleItem.id': payload.itemId, correlationId: payload.correlationId },
        }),
      )

    yield* Effect.acquireRelease(
      Effect.sync(
        () =>
          new Worker<ExampleJobPayload>(
            EXAMPLE_QUEUE_NAME,
            (job) => Runtime.runPromise(runtime)(processJob(job.data)),
            {
              connection: bull.connection,
              prefix: bull.prefix,
              concurrency: bull.concurrency,
            },
          ),
      ),
      (worker) => Effect.promise(() => worker.close().catch(() => undefined)),
    )
  }),
)
