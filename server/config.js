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
export const useSupabaseStorage =
  process.env.USE_SUPABASE_STORAGE === 'true' || process.env.NODE_ENV === 'production'
export const supabaseUrl = process.env.SUPABASE_URL || ''
export const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
export const supabaseBucket = process.env.SUPABASE_BUCKET || 'chatapp-files'
