import 'dotenv/config'
import { pool } from '../db.js'

const run = async () => {
  await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";')
  await pool.end()
  console.log('DB bootstrap complete.')
}

run().catch((error) => {
  console.error('DB bootstrap failed:', error)
  process.exit(1)
})
