import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import type { Config } from './config.js'
import { requireAuth } from './lib/auth.js'
import { createMailer, type Mailer } from './lib/mailer.js'
import { authRoutes } from './routes/auth.js'

export function createApp(config: Config, mailer: Mailer = createMailer(config)) {
  const app = express()
  app.disable('x-powered-by')
  app.use(helmet())
  app.use(cors({ origin: config.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean) }))
  app.use(express.json({ limit: '32kb' }))

  app.get('/api/v1/health', (_req, res) => {
    res.json({ status: 'ok' })
  })

  app.use('/api/v1/auth', authRoutes(config, mailer))
  app.get('/api/v1/me', requireAuth(config), (req, res) => {
    res.json({ id: req.userId, email: req.userEmail })
  })

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (typeof error === 'object' && error && 'code' in error && error.code === 11000) {
      res.status(409).json({ error: 'EMAIL_IN_USE' })
      return
    }
    console.error(error)
    res.status(500).json({ error: 'INTERNAL_ERROR' })
  })

  return app
}
