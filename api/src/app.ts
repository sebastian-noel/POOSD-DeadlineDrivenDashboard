import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import type { Config } from './config.js'
import { z } from 'zod'
import { requireAuth } from './lib/auth.js'
import { createMailer, type Mailer } from './lib/mailer.js'
import { authRoutes } from './routes/auth.js'
import { milestoneRoutes } from './routes/milestones.js'
import { taskRoutes } from './routes/tasks.js'
import { searchRoutes } from './routes/search.js'
import { dashboardRoutes } from './routes/dashboard.js'
import { focusSessionRoutes } from './routes/focus-sessions.js'
import { User } from './models/user.js'
import mongoose from 'mongoose'

export function createApp(config: Config, mailer: Mailer = createMailer(config)) {
  const app = express()
  app.disable('x-powered-by')
  app.set('trust proxy', 'loopback')
  app.use(helmet())
  app.use(cors({ origin: config.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean) }))
  app.use(express.json({ limit: '32kb' }))

  app.get('/api/v1/health', (_req, res) => {
    if (mongoose.connection.readyState !== 1) {
      res.status(503).json({ status: 'unavailable' })
      return
    }
    res.json({ status: 'ok' })
  })

  app.use('/api/v1/auth', authRoutes(config, mailer))
  app.get('/api/v1/me', requireAuth(config), (req, res) => {
    res.json({ id: req.userId, email: req.userEmail, displayName: req.userDisplayName })
  })
  app.patch('/api/v1/me', requireAuth(config), async (req, res) => {
    const parsed = z.object({ displayName: z.string().trim().min(1).max(80) }).strict().safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() })
      return
    }
    const user = await User.findByIdAndUpdate(req.userId, { $set: parsed.data }, { new: true, runValidators: true })
    res.json({ id: user?._id.toString(), email: user?.email, displayName: user?.displayName })
  })
  app.use('/api/v1/milestones', requireAuth(config), milestoneRoutes())
  app.use('/api/v1/tasks', requireAuth(config), taskRoutes())
  app.use('/api/v1/search', requireAuth(config), searchRoutes())
  app.use('/api/v1/dashboard', requireAuth(config), dashboardRoutes())
  app.use('/api/v1/focus-sessions', requireAuth(config), focusSessionRoutes())

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (typeof error === 'object' && error && 'code' in error && error.code === 11000) {
      res.status(409).json({ error: 'CONFLICT' })
      return
    }
    if (typeof error === 'object' && error && 'name' in error && error.name === 'VersionError') {
      res.status(409).json({ error: 'CONFLICT' })
      return
    }
    console.error(error)
    res.status(500).json({ error: 'INTERNAL_ERROR' })
  })

  return app
}
