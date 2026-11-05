import { Schema, Types, model } from 'mongoose'

export type TaskStatus = 'todo' | 'in_progress' | 'done'

export interface TaskRecord {
  owner: Types.ObjectId
  milestone: Types.ObjectId
  title: string
  notes: string
  status: TaskStatus
  dueAt: Date | null
  completedAt: Date | null
}

const taskSchema = new Schema<TaskRecord>(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    milestone: { type: Schema.Types.ObjectId, ref: 'Milestone', required: true },
    title: { type: String, required: true, maxlength: 120 },
    notes: { type: String, default: '', maxlength: 2000 },
    status: { type: String, enum: ['todo', 'in_progress', 'done'], default: 'todo' },
    dueAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true },
)

taskSchema.index({ owner: 1, milestone: 1 })
taskSchema.index({ owner: 1, status: 1, dueAt: 1 })

export const Task = model<TaskRecord>('Task', taskSchema)
