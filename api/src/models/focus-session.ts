import { Schema, Types, model } from 'mongoose'

export type FocusStatus = 'running' | 'paused' | 'completed' | 'cancelled'

export interface FocusSessionRecord {
  owner: Types.ObjectId
  task: Types.ObjectId | null
  status: FocusStatus
  active: boolean
  targetSeconds: number
  accumulatedMs: number
  lastStartedAt: Date | null
  completedAt: Date | null
}

const focusSessionSchema = new Schema<FocusSessionRecord>(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    task: { type: Schema.Types.ObjectId, ref: 'Task', default: null },
    status: { type: String, enum: ['running', 'paused', 'completed', 'cancelled'], required: true },
    active: { type: Boolean, required: true },
    targetSeconds: { type: Number, required: true, min: 60, max: 14400 },
    accumulatedMs: { type: Number, default: 0, min: 0 },
    lastStartedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true, optimisticConcurrency: true },
)

focusSessionSchema.index({ owner: 1, active: 1 }, { unique: true, partialFilterExpression: { active: true } })
focusSessionSchema.index({ owner: 1, completedAt: -1 })

export const FocusSession = model<FocusSessionRecord>('FocusSession', focusSessionSchema)
