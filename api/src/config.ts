import 'dotenv/config'
import { z } from 'zod'

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
  return schema.parse(process.env)
}
