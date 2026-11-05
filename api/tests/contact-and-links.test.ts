import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import type { Server } from 'node:http'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { createApp } from '../src/app.js'
import type { Config } from '../src/config.js'
import { passwordResetLink, verificationLink } from '../src/lib/links.js'
import type { ContactMessageInput, Mailer } from '../src/lib/mailer.js'
import { ContactMessage } from '../src/models/contact-message.js'
import { User } from '../src/models/user.js'

const config: Config = {
  PORT: 3001,
  HOST: '127.0.0.1',
  MONGODB_URI: 'unused',
  JWT_SECRET: 'test-secret-must-be-at-least-32-characters-long',
  JWT_TTL_SECONDS: 3600,
  API_PUBLIC_URL: 'https://api.example.com',
  WEB_APP_URL: 'https://app.example.com',
  CORS_ORIGINS: '',
  MAIL_TRANSPORT: 'console',
  SMTP_PORT: 587,
  MAIL_FROM: 'test@example.com',
  CONTACT_TO: 'team@example.com',
}

let mongo: MongoMemoryServer
let server: Server
let baseUrl: string
let verificationToken = ''
let resetToken = ''
const contactMessages: ContactMessageInput[] = []

const mailer: Mailer = {
  async sendVerification(_email, token) { verificationToken = token },
  async sendPasswordReset(_email, token) { resetToken = token },
  async sendContactMessage(input) { contactMessages.push(input) },
}

before(async () => {
  mongo = await MongoMemoryServer.create()
  await mongoose.connect(mongo.getUri())
  await User.init()
  server = createApp(config, mailer).listen(0)
  await new Promise<void>((resolve) => server.once('listening', resolve))
  const address = server.address()
  assert(address && typeof address !== 'string')
  baseUrl = `http://127.0.0.1:${address.port}`
})

after(async () => {
  await new Promise<void>((resolve) => server?.close(() => resolve()))
  await mongoose.disconnect()
  await mongo?.stop()
})

async function request(path: string, method = 'GET', body?: object) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    redirect: 'manual',
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await response.text()
  const isJson = response.headers.get('content-type')?.includes('application/json') ?? false
  return { status: response.status, location: response.headers.get('location'), data: isJson && text ? JSON.parse(text) : null }
}

test('contact form stores the message and forwards it', async () => {
  const bad = await request('/api/v1/contact', 'POST', { email: 'not-an-email', subject: '', message: 'hi' })
  assert.equal(bad.status, 400)
  assert.equal(typeof bad.data.message, 'string')

  const ok = await request('/api/v1/contact', 'POST', { email: 'student@ucf.edu', subject: 'Hello', message: 'Love the cat.' })
  assert.equal(ok.status, 202)
  assert.equal(contactMessages.length, 1)
  assert.equal(contactMessages[0]?.subject, 'Hello')
  assert.equal(await ContactMessage.countDocuments({ email: 'student@ucf.edu' }), 1)
})

test('email links point at the web app and verification redirects there', async () => {
  assert.equal(verificationLink(config, 'abc'), 'https://api.example.com/api/v1/auth/verify-email?token=abc')
  assert.equal(passwordResetLink(config, 'abc'), 'https://app.example.com/?reset=abc')

  const email = 'links@example.com'
  const password = 'password123'
  assert.equal((await request('/api/v1/auth/register', 'POST', { email, password })).status, 201)
  assert.equal((await request('/api/v1/auth/register', 'POST', { email, password: 'short' })).data.message, 'Password must be at least 8 characters')

  const verified = await request(`/api/v1/auth/verify-email?token=${verificationToken}`)
  assert.equal(verified.status, 302)
  assert.equal(verified.location, 'https://app.example.com/?verified=1')
  // A repeat visit (link scanner, second device) still lands on "verified"; a bad token does not.
  const again = await request(`/api/v1/auth/verify-email?token=${verificationToken}`)
  assert.equal(again.status, 302)
  assert.equal(again.location, 'https://app.example.com/?verified=1')
  const bad = await request(`/api/v1/auth/verify-email?token=${'0'.repeat(64)}`)
  assert.equal(bad.status, 302)
  assert.equal(bad.location, 'https://app.example.com/?verified=0')

  const login = await request('/api/v1/auth/login', 'POST', { email, password })
  assert.equal(login.status, 200)
  assert.equal(login.data.expiresIn, 3600)
  assert.equal(login.data.user.email, email)

  assert.equal((await request('/api/v1/auth/forgot-password', 'POST', { email })).status, 202)
  assert.match(resetToken, /^[a-f0-9]{64}$/)
  assert.equal((await request('/api/v1/auth/reset-password', 'POST', { token: resetToken, password: 'newpassword1' })).status, 200)
  assert.equal((await request('/api/v1/auth/login', 'POST', { email, password: 'newpassword1' })).status, 200)
  assert.equal((await request('/api/v1/nope')).status, 404)
})
