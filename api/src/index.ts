import mongoose from 'mongoose'
import { createApp } from './app.js'
import { loadConfig } from './config.js'

const config = loadConfig()

try {
  await mongoose.connect(config.MONGODB_URI)
  createApp(config).listen(config.PORT, () => {
    console.log(`API listening on port ${config.PORT}`)
  })
} catch (error) {
  console.error('Could not start API', error)
  process.exitCode = 1
}
