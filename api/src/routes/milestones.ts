import { Router } from 'express'
import { Types } from 'mongoose'
import { z } from 'zod'
import { dueAtSchema, limitSchema, objectIdSchema, pageSchema } from '../lib/route-helpers.js'
import { Milestone } from '../models/milestone.js'
import { Task } from '../models/task.js'

const createSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional(),
  dueAt: dueAtSchema.optional(),
}).strict()
const updateSchema = createSchema.partial().refine((value) => Object.keys(value).length > 0)
const listSchema = z.object({ page: pageSchema, limit: limitSchema })

function result(item: { _id: Types.ObjectId; title: string; description: string; dueAt: Date | null }) {
  return { id: item._id.toString(), title: item.title, description: item.description, dueAt: item.dueAt }
}

export function milestoneRoutes() {
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
      Milestone.find(filter).sort({ dueAt: 1, _id: 1 }).skip((page - 1) * limit).limit(limit),
      Milestone.countDocuments(filter),
    ])
    res.json({ items: items.map(result), page, limit, total })
  })

  router.post('/', async (req, res) => {
    const parsed = createSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() })
      return
    }
    const item = await Milestone.create({ owner: req.userId, ...parsed.data })
    res.status(201).json(result(item))
  })

  router.get('/:id', async (req, res) => {
    if (!objectIdSchema.safeParse(req.params.id).success) {
      res.status(400).json({ error: 'INVALID_ID' })
      return
    }
    const item = await Milestone.findOne({ _id: req.params.id, owner: req.userId })
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
    const item = await Milestone.findOneAndUpdate(
      { _id: req.params.id, owner: req.userId },
      { $set: parsed.data },
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
    const item = await Milestone.findOneAndDelete({ _id: req.params.id, owner: req.userId })
    if (!item) {
      res.status(404).json({ error: 'NOT_FOUND' })
      return
    }
    await Task.deleteMany({ owner: req.userId, milestone: item._id })
    res.status(204).end()
  })

  return router
}
