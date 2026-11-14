import { Schema, model } from 'mongoose'
import { SETTINGS_DEFAULTS, type AccountSettings } from '../lib/settings.js'

export interface UserRecord {
  settings: AccountSettings
  email: string
  displayName: string
  passwordHash: string
  emailVerifiedAt: Date | null
  verificationTokenHash: string | null
  verificationExpiresAt: Date | null
  resetTokenHash: string | null
  resetExpiresAt: Date | null
  tokenVersion: number
}

const userSchema = new Schema<UserRecord>(
  {
    settings: { type: new Schema(Object.fromEntries(
      Object.entries(SETTINGS_DEFAULTS).map(([key, value]) => [key, {
        type: typeof value === 'number' ? Number : typeof value === 'boolean' ? Boolean : String,
        default: value,
      }]),
    ), { _id: false }), default: () => ({}) },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    displayName: { type: String, default: '', maxlength: 80 },
    passwordHash: { type: String, required: true },
    emailVerifiedAt: { type: Date, default: null },
    verificationTokenHash: { type: String, default: null },
    verificationExpiresAt: { type: Date, default: null },
    resetTokenHash: { type: String, default: null },
    resetExpiresAt: { type: Date, default: null },
    tokenVersion: { type: Number, default: 0 },
  },
  { timestamps: true },
)

userSchema.index({ verificationTokenHash: 1 }, { sparse: true })
userSchema.index({ resetTokenHash: 1 }, { sparse: true })

export const User = model<UserRecord>('User', userSchema)
