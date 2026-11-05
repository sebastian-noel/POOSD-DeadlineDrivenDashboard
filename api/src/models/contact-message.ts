import { Schema, model } from 'mongoose'

export interface ContactMessageRecord {
  email: string
  subject: string
  message: string
}

const contactMessageSchema = new Schema<ContactMessageRecord>(
  {
    email: { type: String, required: true, lowercase: true, trim: true, maxlength: 254 },
    subject: { type: String, required: true, trim: true, maxlength: 150 },
    message: { type: String, required: true, trim: true, maxlength: 4000 },
  },
  { timestamps: true },
)

export const ContactMessage = model<ContactMessageRecord>('ContactMessage', contactMessageSchema)
