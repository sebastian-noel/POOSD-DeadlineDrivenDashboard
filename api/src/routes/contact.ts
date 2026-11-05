import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { z } from 'zod'
import type { Mailer } from '../lib/mailer.js'
import { validationError } from '../lib/route-helpers.js'
import { ContactMessage } from '../models/contact-message.js'

const contactSchema = z
  .object({
    email: z.email('Enter a valid email address').max(254),
    subject: z.string().trim().min(1, 'Subject is required').max(150, 'Subject must be at most 150 characters'),
    message: z.string().trim().min(1, 'Message is required').max(4000, 'Message must be at most 4000 characters'),
  })
  .strict()

/** Public contact form. Messages are always stored; they are also emailed when `CONTACT_TO` is configured. */
export function contactRoutes(mailer: Mailer) {
  const router = Router()
  router.use(rateLimit({ windowMs: 15 * 60_000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false }))

  router.post('/', async (req, res) => {
    const parsed = contactSchema.safeParse(req.body)
    if (!parsed.success) {
      validationError(res, parsed.error)
      return
    }
    const saved = await ContactMessage.create(parsed.data)
    try {
      await mailer.sendContactMessage(parsed.data)
    } catch (error) {
      console.error('Contact email failed (message stored)', error)
    }
    res.status(202).json({ id: saved.id, message: 'Message received. We will reach out soon.' })
  })

  return router
}
