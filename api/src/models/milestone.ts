import { Schema, Types, model } from 'mongoose'

export interface MilestoneRecord {
  owner: Types.ObjectId
  title: string
  description: string
  dueAt: Date | null
}

const milestoneSchema = new Schema<MilestoneRecord>(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, maxlength: 120 },
    description: { type: String, default: '', maxlength: 2000 },
    dueAt: { type: Date, default: null },
  },
  { timestamps: true },
)

milestoneSchema.index({ owner: 1, dueAt: 1 })

export const Milestone = model<MilestoneRecord>('Milestone', milestoneSchema)
