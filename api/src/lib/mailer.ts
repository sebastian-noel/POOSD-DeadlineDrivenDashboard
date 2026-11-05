import nodemailer from 'nodemailer'
import type { Config } from '../config.js'

export interface Mailer {
  sendVerification(email: string, token: string): Promise<void>
  sendPasswordReset(email: string, token: string): Promise<void>
}

export function createMailer(config: Config): Mailer {
  const transport = nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    secure: config.SMTP_PORT === 465,
    auth: { user: config.SMTP_USER, pass: config.SMTP_PASSWORD },
    disableFileAccess: true,
    disableUrlAccess: true,
  })

  return {
    async sendVerification(email, token) {
      const url = new URL('/api/v1/auth/verify-email', config.API_PUBLIC_URL)
      url.searchParams.set('token', token)
      await transport.sendMail({
        from: config.MAIL_FROM,
        to: email,
        subject: 'Verify your Deadline Dashboard email',
        text: `Open this link to verify your email: ${url.toString()}\nThis link expires in 24 hours.`,
      })
    },
    async sendPasswordReset(email, token) {
      await transport.sendMail({
        from: config.MAIL_FROM,
        to: email,
        subject: 'Reset your Deadline Dashboard password',
        text: `Your password reset token is: ${token}\nSubmit it with a new password to POST /api/v1/auth/reset-password. It expires in one hour.`,
      })
    },
  }
}
