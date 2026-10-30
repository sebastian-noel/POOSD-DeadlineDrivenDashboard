import { Router } from 'express'
import { z } from 'zod'
import { escapeRegex } from '../lib/route-helpers.js'
import { Milestone } from '../models/milestone.js'
import { Task } from '../models/task.js'

const querySchema = z.object({ q: z.string().trim().min(2).max(100) })

export function searchRoutes() {
  const router = Router()
  router.get('/', async (req, res) => {
    const parsed = querySchema.safeParse(req.query)
    if (!parsed.success) {
      res.status(400).json({ error: 'VALIDATION_ERROR', message: 'q must contain 2 to 100 characters' })
      return
    }
    const title = { $regex: escapeRegex(parsed.data.q), $options: 'i' }
    const [milestones, tasks] = await Promise.all([
      Milestone.find({ owner: req.userId, title }).select('_id title dueAt').limit(20),
      Task.find({ owner: req.userId, title }).select('_id title status milestone dueAt').limit(20),
    ])
    res.json({
      query: parsed.data.q,
      milestones: milestones.map((item) => ({ id: item._id.toString(), title: item.title, dueAt: item.dueAt })),
      tasks: tasks.map((item) => ({ id: item._id.toString(), title: item.title, status: item.status, milestoneId: item.milestone.toString(), dueAt: item.dueAt })),
    })
  })
  return router
}
