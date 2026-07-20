import { defineConfig } from 'drizzle-kit'

// drizzle-kit runs outside the Effect runtime, so it reads DATABASE_URL from the environment directly.
export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://serviceuser:pass@localhost:5432/service_db',
  },
})
