import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import type { Server } from 'node:http'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { createApp } from '../src/app.js'
import type { Config } from '../src/config.js'
import type { Mailer } from '../src/lib/mailer.js'
import { User } from '../src/models/user.js'

const config: Config = {
  PORT: 3001,
  MONGODB_URI: 'unused',
  JWT_SECRET: 'test-secret-must-be-at-least-32-characters-long',
  API_PUBLIC_URL: 'https://api.example.com',
  CORS_ORIGINS: '',
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

  assert.equal((await request('/api/v1/auth/forgot-password', 'POST', { email })).status, 202)
  assert.equal((await request('/api/v1/auth/reset-password', 'POST', { token: resetToken, password: 'new-long-password-123' })).status, 200)
  assert.equal((await request('/api/v1/me', 'GET', undefined, accessToken)).status, 401)
  assert.equal((await request('/api/v1/auth/login', 'POST', { email, password })).status, 401)
  assert.equal((await request('/api/v1/auth/login', 'POST', { email, password: 'new-long-password-123' })).status, 200)
})
