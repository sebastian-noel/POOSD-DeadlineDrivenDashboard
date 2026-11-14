import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import type { Config } from '../config.js'
import { webAppLink } from '../lib/links.js'
import type { Mailer } from '../lib/mailer.js'
import { validationError } from '../lib/route-helpers.js'
import { hashToken, newOpaqueToken } from '../lib/tokens.js'
import { User } from '../models/user.js'

const emailSchema = z.email('Enter a valid email address').max(254, 'Email is too long')
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')
const credentialsSchema = z.object({ email: emailSchema, password: passwordSchema })
const emailOnlySchema = z.object({ email: emailSchema })
const tokenSchema = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/, 'Invalid token') })
const resetSchema = tokenSchema.extend({ password: passwordSchema })

const VERIFICATION_TTL_MS = 24 * 60 * 60_000
const RESET_TTL_MS = 60 * 60_000

export function authRoutes(config: Config, mailer: Mailer) {
  const router = Router()
  const limiter = rateLimit({ windowMs: 15 * 60_000, limit: 100, standardHeaders: 'draft-8', legacyHeaders: false })
  router.use(limiter)

  router.post('/register', async (req, res) => {
    const parsed = credentialsSchema.safeParse(req.body)
    if (!parsed.success) {
      validationError(res, parsed.error)
      return
    }
    const email = parsed.data.email.toLowerCase().trim()
    if (await User.exists({ email })) {
      res.status(409).json({ error: 'EMAIL_IN_USE', message: 'An account with this email already exists' })
      return
    }

    const token = newOpaqueToken()
    const user = await User.create({
      email,
      passwordHash: await bcrypt.hash(parsed.data.password, 12),
      verificationTokenHash: hashToken(token),
      verificationExpiresAt: new Date(Date.now() + VERIFICATION_TTL_MS),
    })
    try {
      await mailer.sendVerification(email, token)
    } catch (error) {
      console.error('Verification email failed', error)
      res.status(503).json({
        error: 'EMAIL_UNAVAILABLE',
        message: 'Your account was created, but the verification email could not be sent. Use "Resend verification" to try again.',
      })
      return
    }
    res.status(201).json({
      id: user.id,
      email: user.email,
      emailVerified: false,
      message: 'Account created. Check your email for a verification link before logging in.',
    })
  })

  router.post('/resend-verification', async (req, res) => {
    const parsed = emailOnlySchema.safeParse(req.body)
    if (!parsed.success) {
      validationError(res, parsed.error)
      return
    }
    const user = await User.findOne({ email: parsed.data.email.toLowerCase().trim(), emailVerifiedAt: null })
    if (user) {
      const token = newOpaqueToken()
      user.verificationTokenHash = hashToken(token)
      user.verificationExpiresAt = new Date(Date.now() + VERIFICATION_TTL_MS)
      await user.save()
      await mailer.sendVerification(user.email, token)
    }
    res.status(202).json({ message: 'If that account still needs verification, a new email has been sent.' })
  })

  /**
   * Target of the emailed link. Redirects to the web app when `WEB_APP_URL` is configured, otherwise answers with JSON.
   * The link keeps working until it expires: mail clients and link scanners often fetch it before the person does,
   * and people open the same email on more than one device. A repeat visit must land on "verified", not on an error.
   */
  router.get('/verify-email', async (req, res) => {
    const parsed = tokenSchema.safeParse(req.query)
    const user = parsed.success
      ? await User.findOne({ verificationTokenHash: hashToken(parsed.data.token), verificationExpiresAt: { $gt: new Date() } })
      : null
    if (user && !user.emailVerifiedAt) {
      user.emailVerifiedAt = new Date()
      await user.save()
    }
    const redirect = webAppLink(config, { verified: user ? '1' : '0' })
    if (redirect) {
      res.redirect(302, redirect)
      return
    }
    if (!user) {
      res.status(400).json({ error: 'INVALID_TOKEN', message: 'Verification link is invalid, expired, or already used' })
      return
    }
    res.json({ email: user.email, emailVerified: true })
  })

  router.post('/login', async (req, res) => {
    const parsed = credentialsSchema.safeParse(req.body)
    if (!parsed.success) {
      validationError(res, parsed.error)
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
    const accessToken = jwt.sign({ ver: user.tokenVersion }, config.JWT_SECRET, {
      subject: user.id as string,
      expiresIn: config.JWT_TTL_SECONDS,
    })
    res.json({
      accessToken,
      tokenType: 'Bearer',
      expiresIn: config.JWT_TTL_SECONDS,
      user: { id: user.id, email: user.email, displayName: user.displayName },
    })
  })

  router.post('/forgot-password', async (req, res) => {
    const parsed = emailOnlySchema.safeParse(req.body)
    if (!parsed.success) {
      validationError(res, parsed.error)
      return
    }
    const user = await User.findOne({ email: parsed.data.email.toLowerCase().trim() })
    if (user) {
      const token = newOpaqueToken()
      user.resetTokenHash = hashToken(token)
      user.resetExpiresAt = new Date(Date.now() + RESET_TTL_MS)
      await user.save()
      await mailer.sendPasswordReset(user.email, token)
    }
    res.status(202).json({ message: 'If an account exists for that email, a reset link has been sent.' })
  })

  router.post('/reset-password', async (req, res) => {
    const parsed = resetSchema.safeParse(req.body)
    if (!parsed.success) {
      validationError(res, parsed.error)
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
      res.status(400).json({ error: 'INVALID_TOKEN', message: 'This reset link is invalid or has expired. Request a new one.' })
      return
    }
    res.json({ message: 'Password updated. You can log in with your new password.' })
  })

  return router
}
