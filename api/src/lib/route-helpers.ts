import { isValidObjectId } from 'mongoose'
import { z } from 'zod'

export const objectIdSchema = z.string().refine(isValidObjectId, 'Invalid ID')
export const dueAtSchema = z.iso.datetime({ offset: true }).nullable()

export const pageSchema = z.coerce.number().int().min(1).max(10000).default(1)
export const limitSchema = z.coerce.number().int().min(1).max(100).default(50)

export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
