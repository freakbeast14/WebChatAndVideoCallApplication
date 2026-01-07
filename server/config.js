import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const uploadsDir = path.join(__dirname, 'uploads')
export const retentionDays = 7
export const retentionMs = retentionDays * 24 * 60 * 60 * 1000
export const jwtSecret = process.env.JWT_SECRET || 'dev_secret_change_me'
export const tokenExpiresIn = '7d'
export const databaseUrl =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/chatapp'
