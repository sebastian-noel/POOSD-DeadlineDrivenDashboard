import nodemailer from 'nodemailer'
import type { Config } from '../config.js'
import { passwordResetLink, verificationLink } from './links.js'

export interface ContactMessageInput {
  email: string
  subject: string
  message: string
}

export interface Mailer {
  sendVerification(email: string, token: string): Promise<void>
  sendPasswordReset(email: string, token: string): Promise<void>
  /** Forwards a contact-form message to `CONTACT_TO`. No-op when that is not configured. */
  sendContactMessage(input: ContactMessageInput): Promise<void>
}

interface MailMessage {
  from: string
  to: string
  replyTo?: string
  subject: string
  text: string
}

interface Transport {
  sendMail(message: MailMessage): Promise<unknown>
}

function createTransport(config: Config): Transport {
  if (config.MAIL_TRANSPORT === 'console') {
    return {
      async sendMail(message) {
        const line = '─'.repeat(60)
        const body = message.text.split('\n').map((l) => `[mail] ${l}`).join('\n')
        console.log(`\n[mail] ${line}\n[mail] To:      ${message.to}\n[mail] Subject: ${message.subject}\n[mail]\n${body}\n[mail] ${line}\n`)
      },
    }
  }
  return nodemailer.createTransport({
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
}

export function createMailer(config: Config): Mailer {
  const transport = createTransport(config)

  return {
    async sendVerification(email, token) {
      await transport.sendMail({
        from: config.MAIL_FROM,
        to: email,
        subject: 'Verify your Erm Actually account',
        text: `Welcome to Erm Actually!\n\nOpen this link to verify your email and activate your account:\n${verificationLink(config, token)}\n\nThis link expires in 24 hours. If you did not sign up, you can ignore this email.`,
      })
    },
    async sendPasswordReset(email, token) {
      const link = passwordResetLink(config, token)
      const instructions = link
        ? `Open this link to choose a new password:\n${link}`
        : `Your password reset token is: ${token}\nSubmit it with a new password to POST /api/v1/auth/reset-password.`
      await transport.sendMail({
        from: config.MAIL_FROM,
        to: email,
        subject: 'Reset your Erm Actually password',
        text: `${instructions}\n\nThis link expires in one hour. If you did not request a reset, you can ignore this email.`,
      })
    },
    async sendContactMessage({ email, subject, message }) {
      if (!config.CONTACT_TO) return
      await transport.sendMail({
        from: config.MAIL_FROM,
        to: config.CONTACT_TO,
        replyTo: email,
        subject: `[Contact form] ${subject}`,
        text: `From: ${email}\n\n${message}`,

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
