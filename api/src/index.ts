import mongoose from 'mongoose'
import { createApp } from './app.js'
import { loadConfig } from './config.js'

const config = loadConfig()

try {
  await mongoose.connect(config.MONGODB_URI)
  createApp(config).listen(config.PORT, config.HOST, () => {
    console.log(`API listening on ${config.HOST}:${config.PORT}`)
  })
} catch (error) {
  console.error('Could not start API', error)
  process.exitCode = 1
}
