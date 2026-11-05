import type { Response } from 'express'
import { isValidObjectId } from 'mongoose'
import { z, type ZodError } from 'zod'

export const objectIdSchema = z.string().refine(isValidObjectId, 'Invalid ID')
export const dueAtSchema = z.iso.datetime({ offset: true }).nullable()

export const pageSchema = z.coerce.number().int().min(1).max(10000).default(1)
export const limitSchema = z.coerce.number().int().min(1).max(100).default(50)

export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** One human-readable sentence describing the first validation problem, for the UI to show. */
export function validationMessage(error: ZodError): string {
  const issue = error.issues[0]
  if (!issue) return 'Invalid request'
  const field = issue.path.map(String).join('.')
  if (!field || issue.message.toLowerCase().includes(field.toLowerCase())) return issue.message
  return `${field}: ${issue.message}`
}

/** Sends the standard 400 body: a machine-readable code, a message for the UI, and per-field details. */
export function validationError(res: Response, error: ZodError): void {
  res.status(400).json({
    error: 'VALIDATION_ERROR',
    message: validationMessage(error),
    details: error.issues.map((issue) => ({ path: issue.path.map(String).join('.'), message: issue.message })),
  })
}
