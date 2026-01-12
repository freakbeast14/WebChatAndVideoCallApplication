import 'dotenv/config'
import { pool } from '../db.js'

const run = async () => {
  await pool.query(
    `INSERT INTO roles (id, name)
     VALUES (1, 'user'), (2, 'admin')
     ON CONFLICT (id) DO NOTHING`
  )
  await pool.query(
    `UPDATE users
     SET role_id = 1
     WHERE role_id IS NULL`
  )
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
