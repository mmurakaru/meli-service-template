import { Effect } from 'effect'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import type { AppRuntime } from '../../../runtime/AppRuntime.ts'
import { reportFailures } from '../../../runtime/PostHog.ts'
import {
  createExampleItemBodySchema,
  createExampleItemResponseSchema,
  errorResponseSchema,
  exampleItemParamsSchema,
  exampleItemResponseSchema,
} from '../schemas/exampleSchemas.ts'
import { ExampleService } from '../services/ExampleService.ts'

/**
 * Thin HTTP adapters: validate with Zod at the Fastify edge, build an Effect,
 * run it on the shared runtime, map typed errors to status codes.
 */
export function registerExampleRoutes(app: FastifyInstance, runtime: AppRuntime): void {
  const typed = app.withTypeProvider<ZodTypeProvider>()

  typed.route({
    method: 'POST',
    url: '/example/items',
    schema: {
      body: createExampleItemBodySchema,
      response: { 201: createExampleItemResponseSchema },
      tags: ['example'],
    },
    handler: async (request, reply) => {
      const result = await runtime.runPromise(
        Effect.flatMap(ExampleService, (service) => service.createItem(request.body.name)).pipe(
          reportFailures,
          Effect.withSpan('POST /example/items'),
        ),
      )
      return reply.status(201).send(result)
    },
  })

  typed.route({
    method: 'GET',
    url: '/example/items/:id',
    schema: {
      params: exampleItemParamsSchema,
      response: { 200: exampleItemResponseSchema, 404: errorResponseSchema },
      tags: ['example'],
    },
    handler: async (request, reply) => {
      const outcome = await runtime.runPromise(
        Effect.flatMap(ExampleService, (service) => service.getItem(request.params.id)).pipe(
          Effect.map((item) => ({ found: true as const, item })),
          Effect.catchTag('ExampleItemNotFound', () => Effect.succeed({ found: false as const })),
          Effect.withSpan('GET /example/items/:id'),
        ),
      )
      if (!outcome.found) {
        return reply.status(404).send({ message: 'Example item not found' })
      }
      return reply.send(outcome.item)
    },
  })
}
