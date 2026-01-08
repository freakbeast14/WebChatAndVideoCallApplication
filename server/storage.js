import fs from 'fs/promises'
import { createClient } from '@supabase/supabase-js'
import {
  supabaseBucket,
  supabaseServiceKey,
  supabaseUrl,
  useSupabaseStorage,
} from './config.js'

const client = useSupabaseStorage
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null

export const uploadToStorage = async ({ filePath, key, contentType }) => {
  if (!client) {
    throw new Error('Supabase storage is not configured')
  }
  const fileBuffer = await fs.readFile(filePath)
  const { error } = await client.storage
    .from(supabaseBucket)
    .upload(key, fileBuffer, { contentType, upsert: true })
  if (error) {
    throw error
  }
}

export const deleteFromStorage = async (keys) => {
  if (!client || !keys.length) return
  const { error } = await client.storage.from(supabaseBucket).remove(keys)
  if (error) {
    throw error
  }
}

export const getSignedUrl = async (key, expiresIn = 600) => {
  if (!client) {
    throw new Error('Supabase storage is not configured')
  }
  const { data, error } = await client.storage
    .from(supabaseBucket)
    .createSignedUrl(key, expiresIn)
  if (error) {
    throw error
  }
  return data.signedUrl
}
