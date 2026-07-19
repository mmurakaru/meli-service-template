import { pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core'

export const exampleItems = pgTable('example_items', {
  id: varchar('id').primaryKey(),
  name: text('name').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type ExampleItemRow = typeof exampleItems.$inferSelect
export type NewExampleItemRow = typeof exampleItems.$inferInsert
