import 'dotenv/config'
import { pool } from '../db.js'

const run = async () => {
  await pool.query(
    `UPDATE users
     SET email_verified = TRUE
     WHERE email_verified = FALSE AND verification_token IS NULL`
  )
  await pool.end()
  console.log('DB backfill complete.')
}

run().catch((error) => {
  console.error('DB backfill failed:', error)
  process.exit(1)
})
