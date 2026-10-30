import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import type { Config } from './config.js'

export function createApp(config: Config) {
  const app = express()
  app.disable('x-powered-by')
  app.use(helmet())
  app.use(cors({ origin: config.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean) }))
  app.use(express.json({ limit: '32kb' }))

  app.get('/api/v1/health', (_req, res) => {
    res.json({ status: 'ok' })
  })

  return app
}
