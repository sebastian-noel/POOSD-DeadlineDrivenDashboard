import { Router } from 'express'
import { Types } from 'mongoose'
import { z } from 'zod'
import { dueAtSchema, limitSchema, objectIdSchema, pageSchema } from '../lib/route-helpers.js'
import { Milestone } from '../models/milestone.js'
import { Task } from '../models/task.js'
import { FocusSession } from '../models/focus-session.js'

const statusSchema = z.enum(['todo', 'in_progress', 'done'])
const createSchema = z.object({
  milestoneId: objectIdSchema,
  title: z.string().trim().min(1).max(120),
  notes: z.string().trim().max(2000).optional(),
  dueAt: dueAtSchema.optional(),
  status: statusSchema.optional(),
}).strict()
const updateSchema = createSchema.partial().refine((value) => Object.keys(value).length > 0)
const listSchema = z.object({
  page: pageSchema,
  limit: limitSchema,
  milestoneId: objectIdSchema.optional(),
  status: statusSchema.optional(),
})

function result(item: { _id: Types.ObjectId; milestone: Types.ObjectId; title: string; notes: string; status: string; dueAt: Date | null; completedAt: Date | null }) {
  return { id: item._id.toString(), milestoneId: item.milestone.toString(), title: item.title, notes: item.notes, status: item.status, dueAt: item.dueAt, completedAt: item.completedAt }
}

export function taskRoutes() {
  const router = Router()

  router.get('/', async (req, res) => {
    const parsed = listSchema.safeParse(req.query)
    if (!parsed.success) {
      res.status(400).json({ error: 'VALIDATION_ERROR' })
      return
    }
    const { page, limit, milestoneId, status } = parsed.data
    const filter = { owner: req.userId, ...(milestoneId ? { milestone: milestoneId } : {}), ...(status ? { status } : {}) }
    const [items, total] = await Promise.all([
      Task.find(filter).sort({ dueAt: 1, _id: 1 }).skip((page - 1) * limit).limit(limit),
      Task.countDocuments(filter),
    ])
    res.json({ items: items.map(result), page, limit, total })
  })

  router.post('/', async (req, res) => {
    const parsed = createSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() })
      return
    }
    if (!(await Milestone.exists({ _id: parsed.data.milestoneId, owner: req.userId }))) {
      res.status(404).json({ error: 'MILESTONE_NOT_FOUND' })
      return
    }
    const { milestoneId, ...fields } = parsed.data
    const item = await Task.create({
      owner: req.userId,
      milestone: milestoneId,
      ...fields,
      completedAt: fields.status === 'done' ? new Date() : null,
    })
    res.status(201).json(result(item))
  })

  router.get('/:id', async (req, res) => {
    if (!objectIdSchema.safeParse(req.params.id).success) {
      res.status(400).json({ error: 'INVALID_ID' })
      return
    }
    const item = await Task.findOne({ _id: req.params.id, owner: req.userId })
    if (!item) {
      res.status(404).json({ error: 'NOT_FOUND' })
      return
    }
    res.json(result(item))
  })

  router.patch('/:id', async (req, res) => {
    if (!objectIdSchema.safeParse(req.params.id).success) {
      res.status(400).json({ error: 'INVALID_ID' })
      return
    }
    const parsed = updateSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() })
      return
    }
    if (parsed.data.milestoneId && !(await Milestone.exists({ _id: parsed.data.milestoneId, owner: req.userId }))) {
      res.status(404).json({ error: 'MILESTONE_NOT_FOUND' })
      return
    }
    const { milestoneId, ...fields } = parsed.data
    const update = {
      ...fields,
      ...(milestoneId ? { milestone: milestoneId } : {}),
      ...(fields.status ? { completedAt: fields.status === 'done' ? new Date() : null } : {}),
    }
    const item = await Task.findOneAndUpdate(
      { _id: req.params.id, owner: req.userId },
      { $set: update },
      { new: true, runValidators: true },
    )
    if (!item) {
      res.status(404).json({ error: 'NOT_FOUND' })
      return
    }
    res.json(result(item))
  })

  router.delete('/:id', async (req, res) => {
    if (!objectIdSchema.safeParse(req.params.id).success) {
      res.status(400).json({ error: 'INVALID_ID' })
      return
    }
    const item = await Task.findOneAndDelete({ _id: req.params.id, owner: req.userId })
    if (!item) {
      res.status(404).json({ error: 'NOT_FOUND' })
      return
    }
    await FocusSession.updateMany({ owner: req.userId, task: item._id }, { $set: { task: null } })
    res.status(204).end()
  })

  return router
}
