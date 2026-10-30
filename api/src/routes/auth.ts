import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import type { Config } from '../config.js'
import type { Mailer } from '../lib/mailer.js'
import { hashToken, newOpaqueToken } from '../lib/tokens.js'
import { User } from '../models/user.js'

const emailSchema = z.email().max(254)
const passwordSchema = z.string().min(12).max(128)
const credentialsSchema = z.object({ email: emailSchema, password: passwordSchema })
const emailOnlySchema = z.object({ email: emailSchema })
const tokenSchema = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/) })
const resetSchema = tokenSchema.extend({ password: passwordSchema })

export function authRoutes(config: Config, mailer: Mailer) {
  const router = Router()
  const limiter = rateLimit({ windowMs: 15 * 60_000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false })
  router.use(limiter)

  router.post('/register', async (req, res) => {
    const parsed = credentialsSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() })
      return
    }
    const email = parsed.data.email.toLowerCase().trim()
    if (await User.exists({ email })) {
      res.status(409).json({ error: 'EMAIL_IN_USE', message: 'Email is already registered' })
      return
    }

    const token = newOpaqueToken()
    const user = await User.create({
      email,
      passwordHash: await bcrypt.hash(parsed.data.password, 12),
      verificationTokenHash: hashToken(token),
      verificationExpiresAt: new Date(Date.now() + 24 * 60 * 60_000),
    })
    try {
      await mailer.sendVerification(email, token)
    } catch {
      res.status(503).json({ error: 'EMAIL_UNAVAILABLE', message: 'Account created, but email could not be sent. Try resend-verification.' })
      return
    }
    res.status(201).json({ id: user.id, email: user.email, emailVerified: false })
  })

  router.post('/resend-verification', async (req, res) => {
    const parsed = emailOnlySchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'VALIDATION_ERROR' })
      return
    }
    const user = await User.findOne({ email: parsed.data.email.toLowerCase().trim(), emailVerifiedAt: null })
    if (user) {
      const token = newOpaqueToken()
      user.verificationTokenHash = hashToken(token)
      user.verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60_000)
      await user.save()
      await mailer.sendVerification(user.email, token)
    }
    res.status(202).json({ message: 'If the account needs verification, an email has been sent.' })
  })

  router.get('/verify-email', async (req, res) => {
    const parsed = tokenSchema.safeParse(req.query)
    if (!parsed.success) {
      res.status(400).json({ error: 'INVALID_TOKEN' })
      return
    }
    const user = await User.findOneAndUpdate(
      { verificationTokenHash: hashToken(parsed.data.token), verificationExpiresAt: { $gt: new Date() }, emailVerifiedAt: null },
      { $set: { emailVerifiedAt: new Date(), verificationTokenHash: null, verificationExpiresAt: null } },
      { new: true },
    )
    if (!user) {
      res.status(400).json({ error: 'INVALID_TOKEN', message: 'Verification link is invalid or expired' })
      return
    }
    res.json({ email: user.email, emailVerified: true })
  })

  router.post('/login', async (req, res) => {
    const parsed = credentialsSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() })
      return
    }
    const user = await User.findOne({ email: parsed.data.email.toLowerCase().trim() })
    if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
      res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect' })
      return
    }
    if (!user.emailVerifiedAt) {
      res.status(403).json({ error: 'EMAIL_NOT_VERIFIED', message: 'Verify your email before logging in' })
      return
    }
    const accessToken = jwt.sign({ ver: user.tokenVersion }, config.JWT_SECRET, { subject: user.id as string, expiresIn: '1h' })
    res.json({ accessToken, tokenType: 'Bearer', expiresIn: 3600, user: { id: user.id, email: user.email } })
  })

  router.post('/forgot-password', async (req, res) => {
    const parsed = emailOnlySchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'VALIDATION_ERROR' })
      return
    }
    const user = await User.findOne({ email: parsed.data.email.toLowerCase().trim() })
    if (user) {
      const token = newOpaqueToken()
      user.resetTokenHash = hashToken(token)
      user.resetExpiresAt = new Date(Date.now() + 60 * 60_000)
      await user.save()
      await mailer.sendPasswordReset(user.email, token)
    }
    res.status(202).json({ message: 'If the account exists, a reset email has been sent.' })
  })

  router.post('/reset-password', async (req, res) => {
    const parsed = resetSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'VALIDATION_ERROR' })
      return
    }
    const user = await User.findOneAndUpdate(
      { resetTokenHash: hashToken(parsed.data.token), resetExpiresAt: { $gt: new Date() } },
      {
        $set: { passwordHash: await bcrypt.hash(parsed.data.password, 12), resetTokenHash: null, resetExpiresAt: null },
        $inc: { tokenVersion: 1 },
      },
      { new: true },
    )
    if (!user) {
      res.status(400).json({ error: 'INVALID_TOKEN', message: 'Reset token is invalid or expired' })
      return
    }
    res.json({ message: 'Password updated' })
  })

  return router
}
