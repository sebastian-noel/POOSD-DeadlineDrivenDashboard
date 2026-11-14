import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import type { Server } from 'node:http'
import mongoose from 'mongoose'
import jwt from 'jsonwebtoken'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { createApp } from '../src/app.js'
import type { Config } from '../src/config.js'
import type { Mailer } from '../src/lib/mailer.js'
import { User } from '../src/models/user.js'

const config: Config = {
  PORT: 3001,
  HOST: '127.0.0.1',
  MONGODB_URI: 'unused',
  JWT_SECRET: 'test-secret-must-be-at-least-32-characters-long',
  API_PUBLIC_URL: 'https://api.example.com',
  JWT_TTL_SECONDS: 3600,
  CORS_ORIGINS: '',
  MAIL_TRANSPORT: 'smtp',
  SMTP_HOST: 'unused',
  SMTP_PORT: 587,
  SMTP_USER: 'unused',
  SMTP_PASSWORD: 'unused',
  MAIL_FROM: 'test@example.com',
}

let mongo: MongoMemoryServer
let server: Server
let baseUrl: string
let verificationToken = ''
let resetToken = ''

const mailer: Mailer = {
  async sendVerification(_email, token) { verificationToken = token },
  async sendPasswordReset(_email, token) { resetToken = token },
  async sendContactMessage() {},
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

async function request(path: string, method = 'GET', body?: object, token?: string) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  return { status: response.status, data: await response.json() }
}

test('register, verify, login, and reset password', async () => {
  assert.equal((await request('/api/v1/health')).status, 200)
  const email = 'test@example.com'
  const password = 'very-long-password-123'
  const registration = await request('/api/v1/auth/register', 'POST', { email, password })
  assert.equal(registration.status, 201)
  assert.equal(registration.data.email, email)
  assert.equal((await request('/api/v1/auth/register', 'POST', { email, password })).status, 409)
  assert.equal((await request('/api/v1/auth/login', 'POST', { email, password })).status, 403)
  assert.equal((await request('/api/v1/me')).status, 401)

  const verification = await request(`/api/v1/auth/verify-email?token=${verificationToken}`)
  assert.equal(verification.status, 200)
  assert.equal((await request(`/api/v1/auth/verify-email?token=${verificationToken}`)).status, 400)
  assert.equal((await request('/api/v1/auth/login', 'POST', { email, password: 'wrong-password-123' })).status, 401)

  const login = await request('/api/v1/auth/login', 'POST', { email, password })
  assert.equal(login.status, 200)
  assert.equal(login.data.tokenType, 'Bearer')
  const accessToken = login.data.accessToken as string
  assert.equal((await request('/api/v1/me', 'GET', undefined, accessToken)).status, 200)
  const profile = await request('/api/v1/me', 'PATCH', { displayName: 'Demo User' }, accessToken)
  assert.equal(profile.status, 200)
  assert.equal(profile.data.displayName, 'Demo User')

  assert.equal((await request('/api/v1/auth/forgot-password', 'POST', { email })).status, 202)
  assert.equal((await request('/api/v1/auth/reset-password', 'POST', { token: resetToken, password: 'new-long-password-123' })).status, 200)
  assert.equal((await request('/api/v1/me', 'GET', undefined, accessToken)).status, 401)
  assert.equal((await request('/api/v1/auth/login', 'POST', { email, password })).status, 401)
  assert.equal((await request('/api/v1/auth/login', 'POST', { email, password: 'new-long-password-123' })).status, 200)
})


test('profile preferences persist atomically, default legacy accounts, and remain private', async () => {
  // Insert a legacy document directly, without Mongoose applying new-account defaults.
  const id = new mongoose.Types.ObjectId()
  await User.collection.insertOne({ _id: id, email: 'legacy@example.com', displayName: '', passwordHash: 'unused', emailVerifiedAt: new Date(), tokenVersion: 0 })
  const token = jwt.sign({ ver: 0 }, config.JWT_SECRET, { subject: id.toString(), expiresIn: 3600 })
  const initial = await request('/api/v1/me', 'GET', undefined, token)
  assert.equal(initial.data.settings.focusMinutes, 25)
  assert.equal(initial.data.settings.weekStartsOn, 'Sunday')
  assert.equal('passwordHash' in initial.data, false)
  const saved = await request('/api/v1/me', 'PATCH', { displayName: '  Sebastian  ', settings: { focusMinutes: 45, weekStartsOn: 'Monday' } }, token)
  assert.equal(saved.status, 200)
  assert.equal(saved.data.displayName, 'Sebastian')
  assert.equal(saved.data.settings.focusMinutes, 45)
  assert.equal(saved.data.settings.shortBreakMinutes, 5)
  const partial = await request('/api/v1/me', 'PATCH', { settings: { shortBreakMinutes: 10 } }, token)
  assert.equal(partial.status, 200)
  assert.equal(partial.data.settings.focusMinutes, 45)
  assert.equal((await User.findById(id))?.settings.shortBreakMinutes, 10)
  for (const body of [
    {}, { settings: {} }, { email: 'new@example.com' }, { tokenVersion: 1 },
    { settings: { focusMinutes: 0 } }, { settings: { focusMinutes: 181 } },
    { settings: { focusMinutes: 1.5 } }, { settings: { focusMinutes: '30' } },
    { settings: { shortBreakMinutes: 61 } }, { settings: { longBreakMinutes: 121 } },
    { settings: { longBreakAfterSessions: 13 } }, { settings: { dailySummary: 'yes' } },
    { settings: { weekStartsOn: 'Tuesday' } }, { settings: { timeZone: 'invalid' } },
    { settings: { defaultCalendarView: 'Year' } }, { settings: { remindBefore: 'soon' } },
    { settings: { userId: id.toString() } }, { displayName: 'x'.repeat(81) },
    { displayName: 'Must not save', settings: { focusMinutes: 0 } },
  ]) assert.equal((await request('/api/v1/me', 'PATCH', body, token)).status, 400, JSON.stringify(body))
  const unchanged = await request('/api/v1/me', 'GET', undefined, token)
  assert.equal(unchanged.data.displayName, 'Sebastian')
  assert.equal(unchanged.data.settings.focusMinutes, 45)
  assert.equal(unchanged.data.email, 'legacy@example.com')
  assert.equal((await request('/api/v1/me', 'PATCH', { settings: { focusMinutes: 30 } })).status, 401)
  const other = await User.create({ email: 'other@example.com', passwordHash: 'unused', emailVerifiedAt: new Date() })
  const otherToken = jwt.sign({ ver: 0 }, config.JWT_SECRET, { subject: other._id.toString(), expiresIn: 3600 })
  assert.equal((await request('/api/v1/me', 'GET', undefined, otherToken)).data.settings.focusMinutes, 25)
  await request('/api/v1/me', 'PATCH', { settings: { focusMinutes: 15 } }, otherToken)
  assert.equal((await request('/api/v1/me', 'GET', undefined, token)).data.settings.focusMinutes, 45)
})
