import { randomUUID } from 'node:crypto'
import type { SqlError } from '@effect/sql'
import { eq } from 'drizzle-orm'
import { Context, Effect, Layer, Option } from 'effect'
import { type ExampleItemRow, exampleItems } from '../../../db/schema.ts'
import { PgDrizzle } from '../../../runtime/Database.ts'

// drizzle-orm 0.45.x carries duplicate PgColumn declarations that @effect/sql-drizzle 0.51's
// patched query builder rejects (Effect-TS/effect#5904); the documented workaround is to widen
// the table reference at the call sites until the peer range moves past drizzle-orm 0.50.
// biome-ignore lint/suspicious/noExplicitAny: see Effect-TS/effect#5904
const table = exampleItems as any
// biome-ignore lint/suspicious/noExplicitAny: see Effect-TS/effect#5904
const whereId = (id: string): any => eq(exampleItems.id, id)

export type ExampleRepositoryService = {
  readonly insert: (name: string) => Effect.Effect<string, SqlError.SqlError>
  readonly findById: (id: string) => Effect.Effect<Option.Option<ExampleItemRow>, SqlError.SqlError>
  readonly markProcessed: (id: string) => Effect.Effect<void, SqlError.SqlError>
}

export class ExampleRepository extends Context.Tag('ExampleRepository')<
  ExampleRepository,
  ExampleRepositoryService
>() {}

export const ExampleRepositoryLive = Layer.effect(
  ExampleRepository,
  Effect.gen(function* () {
    const db = yield* PgDrizzle.PgDrizzle
    return {
      insert: (name) =>
        Effect.gen(function* () {
          const id = randomUUID()
          yield* db.insert(table).values({ id, name })
          return id
        }),
      findById: (id) =>
        db
          .select()
          .from(table)
          .where(whereId(id))
          .limit(1)
          .pipe(Effect.map((rows) => Option.fromNullable(rows[0] as ExampleItemRow | undefined))),
      markProcessed: (id) =>
        db
          .update(table)
          .set({ status: 'processed', updatedAt: new Date() })
          .where(whereId(id))
          .pipe(Effect.asVoid),
    }
  }),
)
