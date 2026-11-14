// Isolated test server. Never loads .env or connects to the team's Atlas cluster.
import { createRequire } from 'node:module';
import { FocusSession } from '../../../api/dist/models/focus-session.js';
import { User } from '../../../api/dist/models/user.js';
import { createApp } from '../../../api/dist/app.js';

const requireApi = createRequire(new URL('../../../api/package.json', import.meta.url));
const mongoose = requireApi('mongoose');
const bcrypt = requireApi('bcryptjs');
const { MongoMemoryServer } = requireApi('mongodb-memory-server');
const mongo = await MongoMemoryServer.create();
await mongoose.connect(mongo.getUri(), { dbName: 'planner_browser_tests' });
const mailer = { async sendVerification() {}, async sendPasswordReset() {}, async sendContactMessage() {} };
const app = createApp({
  PORT: 4301, HOST: '127.0.0.1', MONGODB_URI: mongo.getUri(),
  JWT_SECRET: 'isolated-browser-test-secret-at-least-32-characters', JWT_TTL_SECONDS: 3600,
  API_PUBLIC_URL: 'http://127.0.0.1:4301', WEB_APP_URL: 'http://127.0.0.1:5178',
  CORS_ORIGINS: '', MAIL_TRANSPORT: 'console', SMTP_PORT: 587, MAIL_FROM: 'test@example.com',
}, mailer);
const passwordHash = await bcrypt.hash('BrowserTestPassword123!', 4);
app.post('/__test/reset', async (_req, res) => {
  for (const collection of Object.values(mongoose.connection.collections)) await collection.deleteMany({});
  await mongoose.connection.collection('users').insertMany(['alice', 'bob'].map((name) => ({
    email: `${name}@example.com`, displayName: name, passwordHash,
    emailVerifiedAt: new Date(), tokenVersion: 0,
  })));
  res.json({ ok: true });
});
// Seed elapsed time only inside the temporary test database; production has no such route.
app.post('/__test/focus', async (req, res) => {
  const user = await User.findOne({ email: req.body.email ?? 'alice@example.com' });
  if (!user) return res.status(404).json({ error: 'TEST_USER_NOT_FOUND' });
  const status = req.body.status ?? 'running';
  const elapsedMs = (req.body.elapsedSeconds ?? 0) * 1000;
  const session = await FocusSession.create({
    owner: user._id, task: req.body.taskId ?? null, status,
    targetSeconds: req.body.targetSeconds ?? 60,
    active: status === 'running' || status === 'paused',
    accumulatedMs: status === 'running' ? 0 : elapsedMs,
    lastStartedAt: status === 'running' ? new Date(Date.now() - elapsedMs) : null,
    completedAt: status === 'completed' ? new Date() : null,
  });
  res.status(201).json({ id: session.id });
});
await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
const server = app.listen(4301, '127.0.0.1');
async function stop() {
  await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();
  await mongo.stop();
  process.exit(0);
}
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
