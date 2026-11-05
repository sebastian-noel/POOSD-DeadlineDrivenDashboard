import { Router } from 'express'
import { Types } from 'mongoose'
import { z } from 'zod'
import { FocusSession } from '../models/focus-session.js'
import { Milestone } from '../models/milestone.js'
import { Task } from '../models/task.js'

const querySchema = z.object({ limit: z.coerce.number().int().min(1).max(100).default(50) })
const WEEK_MS = 7 * 24 * 60 * 60_000

async function focusMinutes(owner: Types.ObjectId, from: Date, to: Date): Promise<number> {
  const rows = await FocusSession.aggregate<{ _id: null; totalMs: number }>([
    { $match: { owner, status: 'completed', completedAt: { $gte: from, $lt: to } } },
    { $group: { _id: null, totalMs: { $sum: '$accumulatedMs' } } },
  ])
  return Math.floor((rows[0]?.totalMs ?? 0) / 60_000)
}

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
    const sevenDaysAgo = new Date(now.getTime() - WEEK_MS)
    const fourteenDaysAgo = new Date(now.getTime() - 2 * WEEK_MS)
    const sevenDaysAhead = new Date(now.getTime() + WEEK_MS)
    const [milestones, counts, totalTasks, completedTasks, completedLast7Days, completedPrevious7Days, overdueTasks, dueNext7Days, upcoming, focusLast7Days, focusPrevious7Days] =
      await Promise.all([
        Milestone.find({ owner }).sort({ dueAt: 1, _id: 1 }).limit(parsed.data.limit),
        Task.aggregate<{ _id: Types.ObjectId; total: number; done: number }>([
          { $match: { owner } },
          { $group: { _id: '$milestone', total: { $sum: 1 }, done: { $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] } } } },
        ]),
        Task.countDocuments({ owner }),
        Task.countDocuments({ owner, status: 'done' }),
        Task.countDocuments({ owner, status: 'done', completedAt: { $gte: sevenDaysAgo } }),
        Task.countDocuments({ owner, status: 'done', completedAt: { $gte: fourteenDaysAgo, $lt: sevenDaysAgo } }),
        Task.countDocuments({ owner, status: { $ne: 'done' }, dueAt: { $lt: now, $ne: null } }),
        Task.countDocuments({ owner, status: { $ne: 'done' }, dueAt: { $gte: now, $lt: sevenDaysAhead } }),
        Task.find({ owner, status: { $ne: 'done' }, dueAt: { $gte: now } }).sort({ dueAt: 1 }).limit(5),
        focusMinutes(owner, sevenDaysAgo, new Date(now.getTime() + 60_000)),
        focusMinutes(owner, fourteenDaysAgo, sevenDaysAgo),
      ])
    const countsByMilestone = new Map(counts.map((item) => [item._id.toString(), item]))
    res.json({
      tasks: { total: totalTasks, completed: completedTasks, completedLast7Days, completedPrevious7Days, overdue: overdueTasks, dueNext7Days },
      milestones: milestones.map((item) => {
        const count = countsByMilestone.get(item._id.toString())
        const total = count?.total ?? 0
        const completed = count?.done ?? 0
        return {
          id: item._id.toString(),
          title: item.title,
          dueAt: item.dueAt,
          totalTasks: total,
          completedTasks: completed,
          progressPercent: total ? Math.round((completed / total) * 100) : 0,
        }
      }),
      upcomingTasks: upcoming.map((item) => ({ id: item._id.toString(), title: item.title, milestoneId: item.milestone.toString(), dueAt: item.dueAt })),
      focusMinutesLast7Days: focusLast7Days,
      focusMinutesPrevious7Days: focusPrevious7Days,
    })
  })
  return router
}
