import { Router } from 'express'
import { Types } from 'mongoose'
import { z } from 'zod'
import { FocusSession } from '../models/focus-session.js'
import { Milestone } from '../models/milestone.js'
import { Task } from '../models/task.js'

const querySchema = z.object({ limit: z.coerce.number().int().min(1).max(100).default(50) })

export function dashboardRoutes() {
  const router = Router()
  router.get('/', async (req, res) => {
    const parsed = querySchema.safeParse(req.query)
    if (!parsed.success) {
      res.status(400).json({ error: 'VALIDATION_ERROR' })
      return
    }
    const owner = new Types.ObjectId(req.userId)
    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60_000)
    const [milestones, counts, totalTasks, completedTasks, overdueTasks, upcoming, focus] = await Promise.all([
      Milestone.find({ owner }).sort({ dueAt: 1, _id: 1 }).limit(parsed.data.limit),
      Task.aggregate<{ _id: Types.ObjectId; total: number; done: number }>([
        { $match: { owner } },
        { $group: { _id: '$milestone', total: { $sum: 1 }, done: { $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] } } } },
      ]),
      Task.countDocuments({ owner }),
      Task.countDocuments({ owner, status: 'done' }),
      Task.countDocuments({ owner, status: { $ne: 'done' }, dueAt: { $lt: now, $ne: null } }),
      Task.find({ owner, status: { $ne: 'done' }, dueAt: { $gte: now } }).sort({ dueAt: 1 }).limit(5),
      FocusSession.aggregate<{ _id: null; totalMs: number }>([
        { $match: { owner, status: 'completed', completedAt: { $gte: sevenDaysAgo } } },
        { $group: { _id: null, totalMs: { $sum: '$accumulatedMs' } } },
      ]),
    ])
    const countsByMilestone = new Map(counts.map((item) => [item._id.toString(), item]))
    res.json({
      tasks: { total: totalTasks, completed: completedTasks, overdue: overdueTasks },
      milestones: milestones.map((item) => {
        const count = countsByMilestone.get(item._id.toString())
        const total = count?.total ?? 0
        const completed = count?.done ?? 0
        return { id: item._id.toString(), title: item.title, dueAt: item.dueAt, totalTasks: total, completedTasks: completed, progressPercent: total ? Math.round(completed / total * 100) : 0 }
      }),
      upcomingTasks: upcoming.map((item) => ({ id: item._id.toString(), title: item.title, milestoneId: item.milestone.toString(), dueAt: item.dueAt })),
      focusMinutesLast7Days: Math.floor((focus[0]?.totalMs ?? 0) / 60_000),
    })
  })
  return router
}
