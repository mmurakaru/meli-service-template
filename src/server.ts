import { fastifyCors } from '@fastify/cors'
import fastifyHelmet from '@fastify/helmet'
import fastifyJWT from '@fastify/jwt'
import fastifySwagger from '@fastify/swagger'
import scalarFastifyApiReference from '@scalar/fastify-api-reference'
import { Effect } from 'effect'
import fastify from 'fastify'
import {
  createJsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod'
import { registerExampleRoutes } from './modules/example/index.ts'
import { makeAppRuntime } from './runtime/AppRuntime.ts'
import { AppConfig } from './runtime/config.ts'
import { Healthcheck } from './runtime/Healthcheck.ts'

const JWT_SKIP_LIST = new Set(['/', '/health', '/documentation', '/documentation/openapi.json'])

async function main(): Promise<void> {
  const runtime = makeAppRuntime()
  const config = await runtime.runPromise(AppConfig)
  const isDevelopment = config.app.nodeEnv === 'development'

  const app = fastify({ logger: false })
  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)

  await app.register(fastifyHelmet, isDevelopment ? { contentSecurityPolicy: false } : {})
  if (isDevelopment) {
    await app.register(fastifyCors, { origin: '*' })
  }

  await app.register(fastifySwagger, {
    transform: createJsonSchemaTransform({ skipList: ['/documentation', '/documentation/*'] }),
    openapi: {
      info: { title: 'meli-service-template', version: config.app.appVersion },
      components: {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        },
      },
    },
  })
  await app.register(scalarFastifyApiReference, { routePrefix: '/documentation' })

  await app.register(fastifyJWT, { secret: { public: config.app.jwtPublicKey } })
  app.addHook('onRequest', async (request, reply) => {
    const path = request.url.split('?')[0] ?? request.url
    if (JWT_SKIP_LIST.has(path) || path.startsWith('/documentation')) {
      return
    }
    try {
      await request.jwtVerify()
    } catch {
      return reply.status(401).send({ message: 'Unauthorized' })
    }
  })

  app.get('/health', async (_request, reply) => {
    const report = await runtime.runPromise(
      Effect.flatMap(Healthcheck, (healthcheck) => healthcheck.report),
    )
    return reply.status(report.healthy ? 200 : 503).send({
      ...report,
      version: config.app.appVersion,
    })
  })

  registerExampleRoutes(app, runtime)
  // registerNextModuleRoutes(app, runtime) - new modules add one line here

  const shutdown = async (signal: string): Promise<void> => {
    await runtime.runPromise(Effect.logInfo(`Received ${signal}, shutting down`))
    await app.close()
    await runtime.dispose()
    process.exit(0)
  }
  process.on('SIGTERM', () => void shutdown('SIGTERM'))
  process.on('SIGINT', () => void shutdown('SIGINT'))

  await app.listen({ port: config.app.port, host: config.app.bindAddress })
  await runtime.runPromise(
    Effect.logInfo('Server started').pipe(
      Effect.annotateLogs('port', config.app.port),
      Effect.annotateLogs('environment', config.app.nodeEnv),
    ),
  )
}

main().catch((error) => {
  console.error('Fatal startup error', error)
  process.exit(1)
})
