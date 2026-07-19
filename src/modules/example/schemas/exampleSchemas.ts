import { z } from 'zod'

export const createExampleItemBodySchema = z.object({
  name: z.string().min(1).max(200),
})

export const exampleItemParamsSchema = z.object({
  id: z.string().min(1),
})

export const exampleItemResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(['pending', 'processed']),
  createdAt: z.string(),
})

export const createExampleItemResponseSchema = z.object({
  id: z.string(),
})

export const errorResponseSchema = z.object({
  message: z.string(),
})

export type CreateExampleItemBody = z.infer<typeof createExampleItemBodySchema>
export type ExampleItemResponse = z.infer<typeof exampleItemResponseSchema>
