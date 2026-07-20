import { Layer } from 'effect'
import { ExampleJobQueueLive, ExampleWorkerLive } from './jobs/ExampleJob.ts'
import { ExampleRepositoryLive } from './services/ExampleRepository.ts'
import { ExampleServiceLive } from './services/ExampleService.ts'

/**
 * The module's public surface: its composed Layer, its route registrar, and the
 * Tags other modules may depend on. The repository and job queue are built once
 * as internals and provided inward to the service and worker, so a single
 * instance of each is shared within the module and neither enters the
 * application context - they stay module-private.
 */
const ModuleInternalsLive = Layer.merge(ExampleRepositoryLive, ExampleJobQueueLive)

export const ExampleModuleLive = Layer.mergeAll(ExampleServiceLive, ExampleWorkerLive).pipe(
  Layer.provide(ModuleInternalsLive),
)

export { registerExampleRoutes } from './http/exampleRoutes.ts'
export { ExampleService } from './services/ExampleService.ts'
