import { Effect } from 'effect'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import type { AppRuntime } from '../../../runtime/AppRuntime.ts'
import { runHandler } from '../../../runtime/ErrorHandler.ts'
import {
  createExampleItemBodySchema,
  createExampleItemResponseSchema,
  errorResponseSchema,
  exampleItemParamsSchema,
  exampleItemResponseSchema,
} from '../schemas/exampleSchemas.ts'
import { ExampleService } from '../services/ExampleService.ts'

/**
 * Thin HTTP adapters: validate with Zod at the Fastify edge, build an Effect, run it
 * on the shared runtime via runHandler (which annotates the request id and surfaces
 * typed failures), and let the central error seam map any failure to a response.
 */
export function registerExampleRoutes(app: FastifyInstance, runtime: AppRuntime): void {
  const typed = app.withTypeProvider<ZodTypeProvider>()

  typed.route({
    method: 'POST',
    url: '/example/items',
    schema: {
      body: createExampleItemBodySchema,
      response: { 201: createExampleItemResponseSchema, 503: errorResponseSchema },
      tags: ['example'],
    },
    handler: async (request, reply) => {
      const result = await runHandler(
        runtime,
        request,
        Effect.flatMap(ExampleService, (service) => service.createItem(request.body.name)).pipe(
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
      // ExampleItemNotFound propagates to the central error seam, which maps it to 404.
      const item = await runHandler(
        runtime,
        request,
        Effect.flatMap(ExampleService, (service) => service.getItem(request.params.id)).pipe(
          Effect.withSpan('GET /example/items/:id'),
        ),
      )
      return reply.send(item)
    },
  })
}
