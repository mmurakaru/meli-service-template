import { Layer } from 'effect'
import { ExampleJobQueueLive, ExampleWorkerLive } from './jobs/ExampleJob.ts'
import { ExampleRepositoryLive } from './services/ExampleRepository.ts'
import { ExampleServiceLive } from './services/ExampleService.ts'

/**
 * The module's public surface: its composed Layer, its route registrar, and the
 * Tags other modules may depend on. Everything not exported here is
 * module-private (ExampleRepository, the job internals).
 */
export const ExampleModuleLive = Layer.mergeAll(
  ExampleServiceLive.pipe(
    Layer.provideMerge(Layer.merge(ExampleRepositoryLive, ExampleJobQueueLive)),
  ),
  ExampleWorkerLive.pipe(Layer.provide(ExampleRepositoryLive)),
)

export { registerExampleRoutes } from './http/exampleRoutes.ts'
export { ExampleService } from './services/ExampleService.ts'
