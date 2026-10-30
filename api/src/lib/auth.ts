import type { RequestHandler } from 'express'
import jwt from 'jsonwebtoken'
import { isValidObjectId } from 'mongoose'
import type { Config } from '../config.js'
import { User } from '../models/user.js'

export function requireAuth(config: Config): RequestHandler {
  return async (req, res, next) => {
    const header = req.header('authorization')
    if (!header?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'UNAUTHORIZED', message: 'Bearer token required' })
      return
    }

    try {
      const payload = jwt.verify(header.slice(7), config.JWT_SECRET)
      if (typeof payload === 'string' || !isValidObjectId(payload.sub) || typeof payload.ver !== 'number') {
        throw new Error('Invalid token payload')
      }
      const user = await User.findById(payload.sub)
      if (!user || user.tokenVersion !== payload.ver || !user.emailVerifiedAt) {
        res.status(401).json({ error: 'UNAUTHORIZED', message: 'Invalid or expired token' })
        return
      }
      req.userId = user.id as string
      req.userEmail = user.email
      next()
    } catch {
      res.status(401).json({ error: 'UNAUTHORIZED', message: 'Invalid or expired token' })
    }
  }
}
