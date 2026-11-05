import 'dotenv/config'
import { z } from 'zod'

const emptyToUndefined = (value: unknown) => (value === '' ? undefined : value)

const schema = z
  .object({
    PORT: z.coerce.number().int().min(1).max(65535).default(3001),
    HOST: z.string().min(1).default('127.0.0.1'),
    MONGODB_URI: z.string().min(1),
    JWT_SECRET: z.string().min(32),
    /** How long a login token stays valid. Default 12 hours. */
    JWT_TTL_SECONDS: z.coerce.number().int().min(60).max(30 * 24 * 3600).default(12 * 3600),
    /** Public HTTPS origin of this API; used to build the verification link in emails. */
    API_PUBLIC_URL: z.url(),
    /** Public origin of the React app. When set, verification links redirect here and reset emails link here. */
    WEB_APP_URL: z.preprocess(emptyToUndefined, z.url().optional()),
    CORS_ORIGINS: z.string().default(''),
    /** `smtp` sends real email; `console` prints the email (and its links) to the API log for local development. */
    MAIL_TRANSPORT: z.enum(['smtp', 'console']).default('smtp'),
    SMTP_HOST: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
    SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
    SMTP_USER: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
    SMTP_PASSWORD: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
    MAIL_FROM: z.string().min(1).default('Erm Actually <no-reply@example.com>'),
    /** Where contact-form messages are emailed. Messages are stored in MongoDB either way. */
    CONTACT_TO: z.preprocess(emptyToUndefined, z.email().optional()),
  })
  .refine((c) => c.MAIL_TRANSPORT === 'console' || (c.SMTP_HOST && c.SMTP_USER && c.SMTP_PASSWORD), {
    message: 'SMTP_HOST, SMTP_USER, and SMTP_PASSWORD are required unless MAIL_TRANSPORT=console',
    path: ['SMTP_HOST'],
  })
const schema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  HOST: z.string().min(1).default('127.0.0.1'),
  MONGODB_URI: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  API_PUBLIC_URL: z.url(),
  CORS_ORIGINS: z.string().default(''),
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
  SMTP_USER: z.string().min(1),
  SMTP_PASSWORD: z.string().min(1),
  MAIL_FROM: z.string().min(1),
})

export type Config = z.infer<typeof schema>

export function loadConfig(): Config {
  const parsed = schema.safeParse(process.env)
  if (!parsed.success) {
    const problems = parsed.error.issues.map((issue) => `  ${issue.path.join('.') || '(root)'}: ${issue.message}`).join('\n')
    throw new Error(`Invalid environment configuration (see api/.env.example):\n${problems}`)
  }
  return parsed.data
  return schema.parse(process.env)
}
