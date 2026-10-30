import { Router } from 'express'
import { z } from 'zod'
import { limitSchema, objectIdSchema, pageSchema } from '../lib/route-helpers.js'
import { FocusSession } from '../models/focus-session.js'
import { Task } from '../models/task.js'

const createSchema = z.object({
  taskId: objectIdSchema.nullable().optional(),
  targetSeconds: z.number().int().min(60).max(14400),
}).strict()
const actionSchema = z.object({ action: z.enum(['pause', 'resume', 'complete', 'cancel']) }).strict()
const listSchema = z.object({ page: pageSchema, limit: limitSchema })

function result(item: { _id: { toString(): string }; task: { toString(): string } | null; status: string; targetSeconds: number; accumulatedMs: number; lastStartedAt: Date | null; completedAt: Date | null }) {
  const elapsedMs = item.accumulatedMs + (item.status === 'running' && item.lastStartedAt ? Date.now() - item.lastStartedAt.getTime() : 0)
  return {
    id: item._id.toString(), taskId: item.task?.toString() ?? null, status: item.status,
    targetSeconds: item.targetSeconds, elapsedSeconds: Math.floor(elapsedMs / 1000), completedAt: item.completedAt,
  }
}

export function focusSessionRoutes() {
  const router = Router()

  router.get('/', async (req, res) => {
    const parsed = listSchema.safeParse(req.query)
    if (!parsed.success) {
      res.status(400).json({ error: 'VALIDATION_ERROR' })
      return
    }
    const { page, limit } = parsed.data
    const filter = { owner: req.userId }
    const [items, total] = await Promise.all([
      FocusSession.find(filter).sort({ _id: -1 }).skip((page - 1) * limit).limit(limit),
      FocusSession.countDocuments(filter),
    ])
    res.json({ items: items.map(result), page, limit, total })
  })

  router.get('/active', async (req, res) => {
    const item = await FocusSession.findOne({ owner: req.userId, active: true })
    res.json({ session: item ? result(item) : null })
  })

  router.post('/', async (req, res) => {
    const parsed = createSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() })
      return
    }
    if (parsed.data.taskId && !(await Task.exists({ _id: parsed.data.taskId, owner: req.userId }))) {
      res.status(404).json({ error: 'TASK_NOT_FOUND' })
      return
    }
    if (await FocusSession.exists({ owner: req.userId, active: true })) {
      res.status(409).json({ error: 'ACTIVE_SESSION_EXISTS' })
      return
    }
    const item = await FocusSession.create({
      owner: req.userId, task: parsed.data.taskId ?? null, targetSeconds: parsed.data.targetSeconds,
      status: 'running', active: true, accumulatedMs: 0, lastStartedAt: new Date(),
    })
    res.status(201).json(result(item))
  })

  router.patch('/:id', async (req, res) => {
    if (!objectIdSchema.safeParse(req.params.id).success) {
      res.status(400).json({ error: 'INVALID_ID' })
      return
    }
    const parsed = actionSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'VALIDATION_ERROR' })
      return
    }
    const item = await FocusSession.findOne({ _id: req.params.id, owner: req.userId })
    if (!item) {
      res.status(404).json({ error: 'NOT_FOUND' })
      return
    }
    if (!item.active || (parsed.data.action === 'pause' && item.status !== 'running') || (parsed.data.action === 'resume' && item.status !== 'paused')) {
      res.status(409).json({ error: 'INVALID_SESSION_STATE' })
      return
    }
    const now = new Date()
    if (item.status === 'running' && item.lastStartedAt) {
      item.accumulatedMs += now.getTime() - item.lastStartedAt.getTime()
      item.lastStartedAt = null
    }
    switch (parsed.data.action) {
      case 'pause': item.status = 'paused'; break
      case 'resume': item.status = 'running'; item.lastStartedAt = now; break
      case 'complete': item.status = 'completed'; item.active = false; item.completedAt = now; break
      case 'cancel': item.status = 'cancelled'; item.active = false; break
    }
    await item.save()
    res.json(result(item))
  })

  return router
}
