import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import type { Server } from 'node:http'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { createApp } from '../src/app.js'
import type { Config } from '../src/config.js'
import type { Mailer } from '../src/lib/mailer.js'
import { User } from '../src/models/user.js'
import { FocusSession } from '../src/models/focus-session.js'

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
const verificationTokens = new Map<string, string>()

const mailer: Mailer = {
  async sendVerification(email, token) { verificationTokens.set(email, token) },
  async sendPasswordReset() {},
}

before(async () => {
  mongo = await MongoMemoryServer.create()
  await mongoose.connect(mongo.getUri())
  await User.init()
  await FocusSession.init()
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
  return { status: response.status, data: response.status === 204 ? null : await response.json() }
}

async function account(email: string): Promise<string> {
  const password = 'very-long-password-123'
  assert.equal((await request('/api/v1/auth/register', 'POST', { email, password })).status, 201)
  assert.equal((await request(`/api/v1/auth/verify-email?token=${verificationTokens.get(email)}`)).status, 200)
  const login = await request('/api/v1/auth/login', 'POST', { email, password })
  assert.equal(login.status, 200)
  return login.data.accessToken as string
}

test('milestones, tasks, and partial search stay scoped to their owner', async () => {
  const alice = await account('alice@example.com')
  const bob = await account('bob@example.com')
  const milestone = await request('/api/v1/milestones', 'POST', { title: 'Finish capstone' }, alice)
  assert.equal(milestone.status, 201)
  const milestoneId = milestone.data.id as string

  const task = await request('/api/v1/tasks', 'POST', { milestoneId, title: 'Write API endpoints' }, alice)
  assert.equal(task.status, 201)
  assert.equal((await request('/api/v1/tasks', 'POST', { milestoneId, title: 'Unauthorized' }, bob)).status, 404)
  assert.equal((await request(`/api/v1/milestones/${milestoneId}`, 'GET', undefined, bob)).status, 404)
  assert.equal((await request(`/api/v1/tasks/${task.data.id}`, 'GET', undefined, bob)).status, 404)

  const search = await request('/api/v1/search?q=api%20end', 'GET', undefined, alice)
  assert.equal(search.status, 200)
  assert.equal(search.data.tasks.length, 1)
  assert.equal((await request('/api/v1/search?q=api%20end', 'GET', undefined, bob)).data.tasks.length, 0)
  assert.equal((await request('/api/v1/search?q=api%20end', 'GET')).status, 401)
  assert.equal((await request('/api/v1/search?q=.%2A', 'GET', undefined, alice)).data.tasks.length, 0)

  const initialDashboard = await request('/api/v1/dashboard', 'GET', undefined, alice)
  assert.equal(initialDashboard.status, 200)
  assert.equal(initialDashboard.data.milestones[0].progressPercent, 0)
  assert.equal((await request('/api/v1/dashboard', 'GET', undefined, bob)).data.milestones.length, 0)

  const focus = await request('/api/v1/focus-sessions', 'POST', { taskId: task.data.id, targetSeconds: 1500 }, alice)
  assert.equal(focus.status, 201)
  assert.equal((await request('/api/v1/focus-sessions', 'POST', { targetSeconds: 1500 }, alice)).status, 409)
  assert.equal((await request(`/api/v1/focus-sessions/${focus.data.id}`, 'PATCH', { action: 'pause' }, bob)).status, 404)
  assert.equal((await request(`/api/v1/focus-sessions/${focus.data.id}`, 'PATCH', { action: 'pause' }, alice)).data.status, 'paused')
  assert.equal((await request(`/api/v1/focus-sessions/${focus.data.id}`, 'PATCH', { action: 'resume' }, alice)).data.status, 'running')
  assert.equal((await request(`/api/v1/focus-sessions/${focus.data.id}`, 'PATCH', { action: 'complete' }, alice)).data.status, 'completed')
  assert.equal((await request('/api/v1/focus-sessions/active', 'GET', undefined, alice)).data.session, null)

  const completed = await request(`/api/v1/tasks/${task.data.id}`, 'PATCH', { status: 'done' }, alice)
  assert.equal(completed.status, 200)
  assert(completed.data.completedAt)
  assert.equal((await request('/api/v1/dashboard', 'GET', undefined, alice)).data.milestones[0].progressPercent, 100)
  assert.equal((await request(`/api/v1/tasks/${task.data.id}`, 'DELETE', undefined, bob)).status, 404)
  assert.equal((await request(`/api/v1/milestones/${milestoneId}`, 'DELETE', undefined, alice)).status, 204)
  assert.equal((await request(`/api/v1/tasks/${task.data.id}`, 'GET', undefined, alice)).status, 404)
})
