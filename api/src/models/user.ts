import { Schema, model } from 'mongoose'

export interface UserRecord {
  email: string
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
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
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
