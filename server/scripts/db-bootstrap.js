import 'dotenv/config'
import { pool } from '../db.js'

const run = async () => {
  await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";')
  await pool.query(
    `CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL UNIQUE
    )`
  )
  await pool.query(
    `INSERT INTO roles (id, name)
     VALUES (1, 'user'), (2, 'admin')
     ON CONFLICT (id) DO NOTHING`
  )
  await pool.end()
  console.log('DB bootstrap complete.')
}

run().catch((error) => {
  console.error('DB bootstrap failed:', error)
  process.exit(1)
})
