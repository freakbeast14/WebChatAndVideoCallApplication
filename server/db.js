import pg from 'pg'
import { databaseUrl } from './config.js'

const { Pool } = pg

export const pool = new Pool({ connectionString: databaseUrl })
