import 'dotenv/config'
import express from 'express'
import crypto from 'crypto'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import multer from 'multer'
import fs from 'fs/promises'
import path from 'path'
import { createServer } from 'http'
import { Server } from 'socket.io'
import {
  jwtSecret,
  retentionDays,
  retentionMs,
  tokenExpiresIn,
  uploadsDir,
  useSupabaseStorage,
} from './config.js'
import { pool } from './db.js'
import { sendPasswordResetEmail, sendVerificationEmail } from './email.js'
import { deleteFromStorage, getSignedUrl, uploadToStorage } from './storage.js'

const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173'
const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: { origin: clientOrigin },
})
const upload = multer({ dest: uploadsDir })

app.use(cors({ origin: clientOrigin }))
app.use(express.json())

const ensureUploadsDir = async () => {
  await fs.mkdir(uploadsDir, { recursive: true })
}

const onlineUsers = new Map()

const sanitizeUser = (user) => ({
  id: user.id,
  email: user.email,
  displayName: user.display_name,
  avatarUrl: user.avatar_url,
  emailVerified: user.email_verified,
  createdAt: user.created_at,
})

const issueToken = (userId) =>
  jwt.sign({ userId }, jwtSecret, { expiresIn: tokenExpiresIn })

const requireEmailVerification = process.env.REQUIRE_EMAIL_VERIFICATION === 'true'

const purgeExpired = async () => {
  const now = new Date()
  const cutoff = new Date(Date.now() - retentionMs)
  const expiredFiles = await pool.query(
    'SELECT id, filename FROM files WHERE expires_at <= $1',
    [now]
  )
  if (useSupabaseStorage) {
    const keys = expiredFiles.rows.map((file) => file.filename).filter(Boolean)
    try {
      await deleteFromStorage(keys)
    } catch {
      // Ignore storage cleanup failures.
    }
  }
  for (const file of expiredFiles.rows) {
    if (!useSupabaseStorage) {
      const filePath = path.join(uploadsDir, file.filename)
      try {
        await fs.unlink(filePath)
      } catch {
        // Ignore missing files during cleanup.
      }
    }
  }
  if (expiredFiles.rows.length > 0) {
    await pool.query('DELETE FROM files WHERE expires_at <= $1', [now])
  }
  await pool.query('DELETE FROM messages WHERE created_at <= $1', [cutoff])
}

const auth = async (req, res, next) => {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing token' })
  }
  try {
    const token = header.slice(7)
    const payload = jwt.verify(token, jwtSecret)
    req.userId = payload.userId
    await purgeExpired()
    return next()
  } catch {
    return res.status(401).json({ error: 'Invalid token' })
  }
}

const isMember = async (conversationId, userId) => {
  const result = await pool.query(
    'SELECT 1 FROM conversation_members WHERE conversation_id = $1 AND user_id = $2',
    [conversationId, userId]
  )
  return result.rowCount > 0
}

const getConversationIdsForUser = async (userId) => {
  const result = await pool.query(
    'SELECT conversation_id FROM conversation_members WHERE user_id = $1',
    [userId]
  )
  return result.rows.map((row) => row.conversation_id)
}

io.use((socket, next) => {
  const token = socket.handshake.auth?.token
  if (!token) {
    return next(new Error('Unauthorized'))
  }
  try {
    const payload = jwt.verify(token, jwtSecret)
    socket.data.userId = payload.userId
    return next()
  } catch {
    return next(new Error('Unauthorized'))
  }
})

io.on('connection', async (socket) => {
  const userId = socket.data.userId
  onlineUsers.set(userId, socket.id)
  socket.join(`user:${userId}`)
  const rooms = await getConversationIdsForUser(userId)
  rooms.forEach((roomId) => socket.join(roomId))
  socket.emit('presence:state', {
    online: Array.from(onlineUsers.keys()),
  })
  io.emit('presence:update', { userId, online: true })

  socket.on('conversation:join', async (conversationId) => {
    if (await isMember(conversationId, userId)) {
      socket.join(conversationId)
    }
  })

  socket.on('typing:start', async (payload) => {
    if (await isMember(payload.conversationId, userId)) {
      socket.to(payload.conversationId).emit('typing:start', {
        conversationId: payload.conversationId,
        userId,
      })
    }
  })

  socket.on('typing:stop', async (payload) => {
    if (await isMember(payload.conversationId, userId)) {
      socket.to(payload.conversationId).emit('typing:stop', {
        conversationId: payload.conversationId,
        userId,
      })
    }
  })

  socket.on('call:offer', async (payload) => {
    if (await isMember(payload.conversationId, userId)) {
      socket.to(payload.conversationId).emit('call:offer', {
        ...payload,
        from: userId,
      })
    }
  })

  socket.on('call:answer', async (payload) => {
    if (await isMember(payload.conversationId, userId)) {
      socket.to(payload.conversationId).emit('call:answer', {
        ...payload,
        from: userId,
      })
    }
  })

  socket.on('call:ice', async (payload) => {
    if (await isMember(payload.conversationId, userId)) {
      socket.to(payload.conversationId).emit('call:ice', {
        ...payload,
        from: userId,
      })
    }
  })

  socket.on('call:camera', async (payload) => {
    if (await isMember(payload.conversationId, userId)) {
      socket.to(payload.conversationId).emit('call:camera', {
        ...payload,
        from: userId,
      })
    }
  })

  socket.on('call:end', async (payload) => {
    if (await isMember(payload.conversationId, userId)) {
      socket.to(payload.conversationId).emit('call:end', {
        ...payload,
        from: userId,
      })
    }
  })

  socket.on('disconnect', () => {
    onlineUsers.delete(userId)
    io.emit('presence:update', { userId, online: false })
  })
})

app.post('/api/auth/register', async (req, res) => {
  const { email, password, displayName } = req.body ?? {}
  if (!email || !password || !displayName) {
    return res.status(400).json({ error: 'Missing fields' })
  }
  const passwordRule = /^(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}$/
  if (!passwordRule.test(password)) {
    return res.status(400).json({
      error:
        'Password must be 8+ characters with at least 1 number and 1 special character',
    })
  }
  const existing = await pool.query('SELECT 1 FROM users WHERE email = $1', [
    email.toLowerCase(),
  ])
  if (existing.rowCount > 0) {
    return res.status(409).json({ error: 'Email already registered' })
  }
  const passwordHash = await bcrypt.hash(password, 10)
  const verificationToken = requireEmailVerification
    ? crypto.randomBytes(32).toString('hex')
    : null
  const verificationExpires = requireEmailVerification
    ? new Date(Date.now() + 24 * 60 * 60 * 1000)
    : null
  const result = await pool.query(
    `INSERT INTO users (email, display_name, password_hash, email_verified, verification_token, verification_expires)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      email.toLowerCase(),
      displayName,
      passwordHash,
      requireEmailVerification ? false : true,
      verificationToken,
      verificationExpires,
    ]
  )
  const user = result.rows[0]
  if (requireEmailVerification) {
    try {
      await sendVerificationEmail({
        to: user.email,
        displayName: user.display_name,
        token: verificationToken,
      })
    } catch (error) {
      console.error('Verification email failed:', error)
      return res.status(500).json({ error: 'Failed to send verification email' })
    }
  }
  return res.json({ token: issueToken(user.id), user: sanitizeUser(user) })
})

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body ?? {}
  const result = await pool.query('SELECT * FROM users WHERE email = $1', [
    email?.toLowerCase(),
  ])
  const user = result.rows[0]
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }
  if (requireEmailVerification && !user.email_verified) {
    return res.status(403).json({ error: 'Email not verified' })
  }
  const ok = await bcrypt.compare(password ?? '', user.password_hash)
  if (!ok) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }
  return res.json({ token: issueToken(user.id), user: sanitizeUser(user) })
})

app.post('/api/auth/forgot', async (req, res) => {
  const { email } = req.body ?? {}
  if (!email) {
    return res.status(400).json({ error: 'Missing email' })
  }
  const result = await pool.query('SELECT * FROM users WHERE email = $1', [
    email.toLowerCase(),
  ])
  const user = result.rows[0]
  if (!user) {
    return res.json({ ok: true })
  }
  const resetToken = crypto.randomBytes(32).toString('hex')
  const resetExpires = new Date(Date.now() + 30 * 60 * 1000)
  await pool.query(
    `UPDATE users
     SET reset_token = $1, reset_expires = $2
     WHERE id = $3`,
    [resetToken, resetExpires, user.id]
  )
  await sendPasswordResetEmail({
    to: user.email,
    displayName: user.display_name,
    token: resetToken,
  })
  return res.json({ ok: true })
})

app.post('/api/auth/reset', async (req, res) => {
  const { token, password } = req.body ?? {}
  if (!token || !password) {
    return res.status(400).json({ error: 'Missing reset data' })
  }
  const passwordRule = /^(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}$/
  if (!passwordRule.test(password)) {
    return res.status(400).json({
      error:
        'Password must be 8+ characters with at least 1 number and 1 special character',
    })
  }
  const result = await pool.query(
    `SELECT * FROM users
     WHERE reset_token = $1 AND reset_expires > now()`,
    [token]
  )
  const user = result.rows[0]
  if (!user) {
    return res.status(400).json({ error: 'Reset link is invalid or expired' })
  }
  const passwordHash = await bcrypt.hash(password, 10)
  await pool.query(
    `UPDATE users
     SET password_hash = $1, reset_token = NULL, reset_expires = NULL
     WHERE id = $2`,
    [passwordHash, user.id]
  )
  return res.json({ ok: true })
})

app.get('/api/auth/reset', async (req, res) => {
  const token = String(req.query.token || '')
  const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173'
  if (!token) {
    return res.redirect(`${clientOrigin}/?reset=error`)
  }
  return res.redirect(`${clientOrigin}/?reset=${encodeURIComponent(token)}`)
})

app.get('/api/auth/verify', async (req, res) => {
  const token = String(req.query.token || '')
  const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173'
  if (!token) {
    return res.redirect(`${clientOrigin}/?verified=error`)
  }
  const result = await pool.query(
    `SELECT * FROM users
     WHERE verification_token = $1 AND verification_expires > now()`,
    [token]
  )
  const user = result.rows[0]
  if (!user) {
    return res.redirect(`${clientOrigin}/?verified=error`)
  }
  await pool.query(
    `UPDATE users
     SET email_verified = true, verification_token = NULL, verification_expires = NULL
     WHERE id = $1`,
    [user.id]
  )
  return res.redirect(`${clientOrigin}/?verified=success`)
})

app.post('/api/auth/verify/resend', async (req, res) => {
  const { email } = req.body ?? {}
  if (!email) {
    return res.status(400).json({ error: 'Missing email' })
  }
  const result = await pool.query('SELECT * FROM users WHERE email = $1', [
    email.toLowerCase(),
  ])
  const user = result.rows[0]
  if (!user) {
    return res.status(404).json({ error: 'User not found' })
  }
  if (user.email_verified) {
    return res.json({ ok: true })
  }
  const verificationToken = crypto.randomBytes(32).toString('hex')
  const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000)
  await pool.query(
    `UPDATE users
     SET verification_token = $1, verification_expires = $2
     WHERE id = $3`,
    [verificationToken, verificationExpires, user.id]
  )
  await sendVerificationEmail({
    to: user.email,
    displayName: user.display_name,
    token: verificationToken,
  })
  return res.json({ ok: true })
})

app.get('/api/users/me', auth, async (req, res) => {
  const result = await pool.query('SELECT * FROM users WHERE id = $1', [
    req.userId,
  ])
  const user = result.rows[0]
  if (!user) {
    return res.status(404).json({ error: 'User not found' })
  }
  if (requireEmailVerification && !user.email_verified) {
    return res.status(403).json({ error: 'Email not verified' })
  }
  return res.json({ user: sanitizeUser(user) })
})

app.get('/api/users/avatar/:id', async (req, res) => {
  const result = await pool.query('SELECT avatar_url FROM users WHERE id = $1', [
    req.params.id,
  ])
  const avatar = result.rows[0]?.avatar_url
  if (!avatar) {
    return res.status(404).json({ error: 'Avatar not found' })
  }
  if (useSupabaseStorage) {
    try {
      const url = await getSignedUrl(avatar, 600)
      return res.redirect(url)
    } catch {
      return res.status(404).json({ error: 'Avatar not found' })
    }
  }
  const filePath = path.join(uploadsDir, avatar)
  return res.sendFile(filePath)
})

app.post('/api/users/avatar', auth, upload.single('avatar'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Missing file' })
  }
  const current = await pool.query('SELECT avatar_url FROM users WHERE id = $1', [
    req.userId,
  ])
  const previous = current.rows[0]?.avatar_url
  const ext = path.extname(req.file.originalname) || '.png'
  const filename = `avatars/avatar-${req.userId}-${Date.now()}${ext}`
  if (useSupabaseStorage) {
    await uploadToStorage({
      filePath: req.file.path,
      key: filename,
      contentType: req.file.mimetype,
    })
    await fs.unlink(req.file.path)
  } else {
    await fs.rename(req.file.path, path.join(uploadsDir, filename))
  }
  await pool.query('UPDATE users SET avatar_url = $1 WHERE id = $2', [
    filename,
    req.userId,
  ])
  if (previous) {
    if (useSupabaseStorage) {
      try {
        await deleteFromStorage([previous])
      } catch {
        // Ignore missing old avatar.
      }
    } else {
      try {
        await fs.unlink(path.join(uploadsDir, previous))
      } catch {
        // Ignore missing old avatar.
      }
    }
  }
  const result = await pool.query('SELECT * FROM users WHERE id = $1', [
    req.userId,
  ])
  return res.json({ user: sanitizeUser(result.rows[0]) })
})

app.patch('/api/users/me', auth, async (req, res) => {
  const { email, displayName } = req.body ?? {}
  if (!email || !displayName) {
    return res.status(400).json({ error: 'Missing fields' })
  }
  const existing = await pool.query(
    'SELECT 1 FROM users WHERE email = $1 AND id != $2',
    [email.toLowerCase(), req.userId]
  )
  if (existing.rowCount > 0) {
    return res.status(409).json({ error: 'Email already registered' })
  }
  const result = await pool.query(
    `UPDATE users
     SET email = $1, display_name = $2
     WHERE id = $3
     RETURNING *`,
    [email.toLowerCase(), displayName, req.userId]
  )
  return res.json({ user: sanitizeUser(result.rows[0]) })
})

app.patch('/api/users/password', auth, async (req, res) => {
  const { currentPassword, newPassword } = req.body ?? {}
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Missing fields' })
  }
  const result = await pool.query('SELECT * FROM users WHERE id = $1', [
    req.userId,
  ])
  const user = result.rows[0]
  if (!user) {
    return res.status(404).json({ error: 'User not found' })
  }
  const ok = await bcrypt.compare(currentPassword, user.password_hash)
  if (!ok) {
    return res.status(401).json({ error: 'Invalid password' })
  }
  const passwordHash = await bcrypt.hash(newPassword, 10)
  await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [
    passwordHash,
    req.userId,
  ])
  return res.json({ ok: true })
})

app.get('/api/users/search', auth, async (req, res) => {
  const query = String(req.query.q ?? '').toLowerCase()
  const result = await pool.query(
    `SELECT * FROM users
     WHERE id != $1 AND (lower(display_name) LIKE $2 OR lower(email) LIKE $2)
     ORDER BY display_name ASC
     LIMIT 20`,
    [req.userId, `%${query}%`]
  )
  return res.json({ users: result.rows.map(sanitizeUser) })
})

app.post('/api/friends/request', auth, async (req, res) => {
  const { toUserId } = req.body ?? {}
  if (!toUserId) {
    return res.status(400).json({ error: 'Missing user' })
  }
  if (toUserId === req.userId) {
    return res.status(400).json({ error: 'Cannot friend yourself' })
  }
  const target = await pool.query('SELECT 1 FROM users WHERE id = $1', [
    toUserId,
  ])
  if (target.rowCount === 0) {
    return res.status(404).json({ error: 'User not found' })
  }
  const alreadyFriends = await pool.query(
    'SELECT 1 FROM friends WHERE user_id = $1 AND friend_id = $2',
    [req.userId, toUserId]
  )
  if (alreadyFriends.rowCount > 0) {
    return res.status(409).json({ error: 'Already friends' })
  }
  const existingRequest = await pool.query(
    'SELECT 1 FROM friend_requests WHERE from_user_id = $1 AND to_user_id = $2',
    [req.userId, toUserId]
  )
  if (existingRequest.rowCount > 0) {
    return res.status(409).json({ error: 'Request already sent' })
  }
  const result = await pool.query(
    `INSERT INTO friend_requests (from_user_id, to_user_id)
     VALUES ($1, $2)
     RETURNING *`,
    [req.userId, toUserId]
  )
  return res.json({ request: result.rows[0] })
})

app.post('/api/friends/accept', auth, async (req, res) => {
  const { requestId } = req.body ?? {}
  const result = await pool.query(
    'SELECT * FROM friend_requests WHERE id = $1',
    [requestId]
  )
  const request = result.rows[0]
  if (!request || request.to_user_id !== req.userId) {
    return res.status(404).json({ error: 'Request not found' })
  }
  await pool.query('DELETE FROM friend_requests WHERE id = $1', [requestId])
  await pool.query(
    `INSERT INTO friends (user_id, friend_id)
     VALUES ($1, $2), ($2, $1)
     ON CONFLICT DO NOTHING`,
    [request.from_user_id, request.to_user_id]
  )
  return res.json({ ok: true })
})

app.post('/api/friends/reject', auth, async (req, res) => {
  const { requestId } = req.body ?? {}
  const result = await pool.query(
    'SELECT * FROM friend_requests WHERE id = $1',
    [requestId]
  )
  const request = result.rows[0]
  if (!request || request.to_user_id !== req.userId) {
    return res.status(404).json({ error: 'Request not found' })
  }
  await pool.query('DELETE FROM friend_requests WHERE id = $1', [requestId])
  return res.json({ ok: true })
})

app.get('/api/friends/requests', auth, async (req, res) => {
  const direction = String(req.query.direction ?? 'all')
  const incoming =
    direction === 'out'
      ? []
      : await pool.query(
          `SELECT fr.*, u.id as user_id, u.email, u.display_name, u.avatar_url
           FROM friend_requests fr
           JOIN users u ON u.id = fr.from_user_id
           WHERE fr.to_user_id = $1
           ORDER BY fr.created_at DESC`,
          [req.userId]
        )
  const outgoing =
    direction === 'in'
      ? []
      : await pool.query(
          `SELECT fr.*, u.id as user_id, u.email, u.display_name, u.avatar_url
           FROM friend_requests fr
           JOIN users u ON u.id = fr.to_user_id
           WHERE fr.from_user_id = $1
           ORDER BY fr.created_at DESC`,
          [req.userId]
        )
  return res.json({
    incoming: incoming.rows?.map((row) => ({
      id: row.id,
      createdAt: row.created_at,
      user: {
        id: row.user_id,
        email: row.email,
        displayName: row.display_name,
        avatarUrl: row.avatar_url,
      },
    })),
    outgoing: outgoing.rows?.map((row) => ({
      id: row.id,
      createdAt: row.created_at,
      user: {
        id: row.user_id,
        email: row.email,
        displayName: row.display_name,
        avatarUrl: row.avatar_url,
      },
    })),
  })
})

app.get('/api/friends', auth, async (req, res) => {
  const result = await pool.query(
    `SELECT DISTINCT ON (u.id) u.* FROM friends f
     JOIN users u ON u.id = f.friend_id
     WHERE f.user_id = $1
     ORDER BY u.id, u.display_name ASC`,
    [req.userId]
  )
  return res.json({ friends: result.rows.map(sanitizeUser) })
})

app.post('/api/conversations', auth, async (req, res) => {
  const { type, memberIds, name } = req.body ?? {}
  const members = Array.from(new Set([...(memberIds ?? []), req.userId]))
  if (type === 'direct' && members.length !== 2) {
    return res.status(400).json({ error: 'Direct chat needs 2 members' })
  }
  if (type === 'group' && !name) {
    return res.status(400).json({ error: 'Group name required' })
  }
  if (type === 'direct') {
    const existing = await pool.query(
      `SELECT c.* FROM conversations c
       JOIN conversation_members cm ON cm.conversation_id = c.id
       WHERE c.type = 'direct'
       GROUP BY c.id
       HAVING array_agg(cm.user_id ORDER BY cm.user_id) = $1`,
      [[...members].sort()]
    )
    if (existing.rowCount > 0) {
      return res.json({ conversation: existing.rows[0] })
    }
  }
  const conversationResult = await pool.query(
    `INSERT INTO conversations (type, name)
     VALUES ($1, $2)
     RETURNING *`,
    [type, type === 'group' ? name : null]
  )
  const conversation = conversationResult.rows[0]
  const values = members
    .map(
      (memberId, index) =>
        `($${index * 2 + 1}, $${index * 2 + 2}, 'member')`
    )
    .join(', ')
  const params = members.flatMap((memberId) => [conversation.id, memberId])
  await pool.query(
    `INSERT INTO conversation_members (conversation_id, user_id, role)
     VALUES ${values}`,
    params
  )
  members.forEach((memberId) => {
    io.to(`user:${memberId}`).emit('conversation:refresh', {
      conversationId: conversation.id,
    })
  })
  return res.json({ conversation })
})

app.post('/api/conversations/:id/members', auth, async (req, res) => {
  const conversationId = req.params.id
  const { memberIds } = req.body ?? {}
  if (!(await isMember(conversationId, req.userId))) {
    return res.status(404).json({ error: 'Conversation not found' })
  }
  const convo = await pool.query('SELECT * FROM conversations WHERE id = $1', [
    conversationId,
  ])
  if (convo.rows[0]?.type !== 'group') {
    return res.status(400).json({ error: 'Not a group conversation' })
  }
  const members = Array.from(new Set(memberIds ?? [])).filter(
    (id) => id !== req.userId
  )
  if (members.length === 0) {
    return res.json({ ok: true })
  }
  const values = members
    .map(
      (memberId, index) =>
        `($${index * 2 + 1}, $${index * 2 + 2}, 'member')`
    )
    .join(', ')
  const params = members.flatMap((memberId) => [conversationId, memberId])
  await pool.query(
    `INSERT INTO conversation_members (conversation_id, user_id, role)
     VALUES ${values}
     ON CONFLICT DO NOTHING`,
    params
  )
  members.forEach((memberId) => {
    io.to(`user:${memberId}`).emit('conversation:refresh', {
      conversationId,
    })
  })
  return res.json({ ok: true })
})

app.delete('/api/conversations/:id/members/:userId', auth, async (req, res) => {
  const conversationId = req.params.id
  const targetUserId = req.params.userId
  if (!(await isMember(conversationId, req.userId))) {
    return res.status(404).json({ error: 'Conversation not found' })
  }
  const convo = await pool.query('SELECT * FROM conversations WHERE id = $1', [
    conversationId,
  ])
  if (convo.rows[0]?.type !== 'group') {
    return res.status(400).json({ error: 'Not a group conversation' })
  }
  await pool.query(
    'DELETE FROM conversation_members WHERE conversation_id = $1 AND user_id = $2',
    [conversationId, targetUserId]
  )
  return res.json({ ok: true })
})

app.get('/api/conversations', auth, async (req, res) => {
  const result = await pool.query(
    `SELECT c.*,
        (
          SELECT row_to_json(m) FROM (
            SELECT id, sender_id, type, text, file_id, created_at
            FROM messages
            WHERE conversation_id = c.id
            ORDER BY created_at DESC
            LIMIT 1
          ) m
        ) AS last_message,
        json_agg(
          json_build_object(
            'id', u.id,
            'email', u.email,
            'displayName', u.display_name,
            'avatarUrl', u.avatar_url
          )
          ORDER BY u.display_name
        ) AS members
     FROM conversations c
     JOIN conversation_members cm ON cm.conversation_id = c.id
     JOIN users u ON u.id = cm.user_id
     WHERE c.id IN (
       SELECT conversation_id FROM conversation_members WHERE user_id = $1
     )
     GROUP BY c.id
     ORDER BY c.created_at DESC`,
    [req.userId]
  )
  return res.json({ conversations: result.rows })
})

app.get('/api/conversations/:id/messages', auth, async (req, res) => {
  const conversationId = req.params.id
  if (!(await isMember(conversationId, req.userId))) {
    return res.status(404).json({ error: 'Conversation not found' })
  }
  const readResult = await pool.query(
    `INSERT INTO message_reads (message_id, user_id)
     SELECT m.id, $2
     FROM messages m
     WHERE m.conversation_id = $1 AND m.sender_id != $2
     ON CONFLICT DO NOTHING
     RETURNING message_id, read_at`,
    [conversationId, req.userId]
  )
  if (readResult.rows.length > 0) {
    io.to(conversationId).emit('message:read', {
      userId: req.userId,
      messageIds: readResult.rows.map((row) => row.message_id),
      readAt: readResult.rows[readResult.rows.length - 1]?.read_at,
    })
  }
  const result = await pool.query(
    `SELECT m.*, f.id as file_id, f.original_name, f.filename, f.mime_type, f.size,
            f.created_at as file_created_at,
            array_remove(array_agg(mr.user_id), NULL) as read_by,
            max(mr.read_at) as read_at
     FROM messages m
     LEFT JOIN files f ON f.id = m.file_id
     LEFT JOIN message_reads mr ON mr.message_id = m.id
     WHERE m.conversation_id = $1
     GROUP BY m.id, f.id
     ORDER BY m.created_at ASC`,
    [conversationId]
  )
  const messages = result.rows.map((row) => ({
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    type: row.type,
    text: row.text,
    createdAt: row.created_at,
    readBy: row.read_by ?? [],
    readAt: row.read_at ?? null,
    file: row.file_id
      ? {
          id: row.file_id,
          originalName: row.original_name,
          filename: row.filename,
          mimeType: row.mime_type,
          size: row.size,
          createdAt: row.file_created_at,
        }
      : null,
  }))
  return res.json({ messages })
})

app.post('/api/conversations/:id/read', auth, async (req, res) => {
  const conversationId = req.params.id
  if (!(await isMember(conversationId, req.userId))) {
    return res.status(404).json({ error: 'Conversation not found' })
  }
  const readResult = await pool.query(
    `INSERT INTO message_reads (message_id, user_id)
     SELECT m.id, $2
     FROM messages m
     WHERE m.conversation_id = $1 AND m.sender_id != $2
     ON CONFLICT DO NOTHING
     RETURNING message_id, read_at`,
    [conversationId, req.userId]
  )
  if (readResult.rows.length > 0) {
    io.to(conversationId).emit('message:read', {
      userId: req.userId,
      messageIds: readResult.rows.map((row) => row.message_id),
      readAt: readResult.rows[readResult.rows.length - 1]?.read_at,
    })
  }
  return res.json({
    messageIds: readResult.rows.map((row) => row.message_id),
    readAt: readResult.rows[readResult.rows.length - 1]?.read_at ?? null,
  })
})

app.post('/api/conversations/:id/messages', auth, async (req, res) => {
  const conversationId = req.params.id
  if (!(await isMember(conversationId, req.userId))) {
    return res.status(404).json({ error: 'Conversation not found' })
  }
  const { text } = req.body ?? {}
  if (!text) {
    return res.status(400).json({ error: 'Missing text' })
  }
  const result = await pool.query(
    `INSERT INTO messages (conversation_id, sender_id, type, text)
     VALUES ($1, $2, 'text', $3)
     RETURNING *`,
    [conversationId, req.userId, text]
  )
  const message = result.rows[0]
  io.to(conversationId).emit('message:new', {
    ...message,
    conversationId,
    read_by: [],
  })
  return res.json({ message })
})

app.post(
  '/api/conversations/:id/files',
  auth,
  upload.single('file'),
  async (req, res) => {
    const conversationId = req.params.id
    if (!(await isMember(conversationId, req.userId))) {
      return res.status(404).json({ error: 'Conversation not found' })
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Missing file' })
    }
    const storageKey = useSupabaseStorage
      ? `files/${conversationId}/${Date.now()}-${req.file.originalname}`
      : req.file.filename
    if (useSupabaseStorage) {
      await uploadToStorage({
        filePath: req.file.path,
        key: storageKey,
        contentType: req.file.mimetype,
      })
      await fs.unlink(req.file.path)
    }
    const fileResult = await pool.query(
      `INSERT INTO files
       (conversation_id, uploaded_by, original_name, filename, mime_type, size, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, now() + ($7 || ' days')::interval)
       RETURNING *`,
      [
        conversationId,
        req.userId,
        req.file.originalname,
        storageKey,
        req.file.mimetype,
        req.file.size,
        retentionDays,
      ]
    )
    const file = fileResult.rows[0]
    const messageResult = await pool.query(
      `INSERT INTO messages (conversation_id, sender_id, type, file_id)
       VALUES ($1, $2, 'file', $3)
       RETURNING *`,
      [conversationId, req.userId, file.id]
    )
    const message = { ...messageResult.rows[0], file }
    io.to(conversationId).emit('message:new', {
      ...messageResult.rows[0],
      conversationId,
      file,
      read_by: [],
    })
    return res.json({ message })
  }
)

app.get('/api/files/:id', auth, async (req, res) => {
  const result = await pool.query('SELECT * FROM files WHERE id = $1', [
    req.params.id,
  ])
  const file = result.rows[0]
  if (!file || new Date(file.expires_at) <= new Date()) {
    return res.status(404).json({ error: 'File not found' })
  }
  if (!(await isMember(file.conversation_id, req.userId))) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  if (useSupabaseStorage) {
    try {
      const url = await getSignedUrl(file.filename, 600)
      return res.redirect(url)
    } catch {
      return res.status(404).json({ error: 'File not found' })
    }
  }
  const filePath = path.join(uploadsDir, file.filename)
  return res.sendFile(filePath)
})

const start = async () => {
  await ensureUploadsDir()
  await purgeExpired()
  setInterval(async () => {
    await purgeExpired()
  }, 60 * 60 * 1000)
  const port = process.env.PORT || 3001
  httpServer.listen(port, () => {
    console.log(`API running on http://localhost:${port}`)
  })
}

start()
