# SafeChat

Privacy-first messaging with expiring history, file sharing, and real-time calls.
SafeChat keeps conversations lightweight by auto-expiring messages and files after
7 days, while still delivering a modern, WhatsApp-style web experience.

## Overview

SafeChat is designed for small teams and families who want:
- Real-time chat with read receipts and typing indicators
- Friends and groups with simple member management
- File and image sharing with previews
- Audio and video calling with live controls
- Message history that expires after 7 days

## Usage

- Sign up, verify email, and start chatting.
- Add friends, create groups, and reply/edit/delete messages.
- Share images and files; previews show before sending.
- Start audio or video calls with WebRTC.
- Messages and files auto-expire after 7 days.

## Website

- Local: http://localhost:5173
- Production: set to your deployed frontend URL

## Architecture

```mermaid
flowchart LR
    A["Client<br>(React + Vite)"] -- "REST + Socket.IO" --> B["Server<br>(Node + Express)"]
    B -- Users, Chats, Reads --> C[("Postgres DB")]
    B -- Local uploads or Supabase --> D[("File Storage")]
    B -- Email verification + reset --> E["SendGrid or SMTP"]
    A -- WebRTC --> F["Calls (WebRTC)"]
    F -- TURN/STUN --> G["Relay Provider<br>(Metered.ca)"]
```

## Tech Stack

- Frontend: React, TypeScript, Vite, Tailwind, shadcn/ui, lucide-react
- Backend: Node.js, Express, Socket.IO, Drizzle ORM
- DB: PostgreSQL (local or hosted)
- File Storage: Local uploads or Supabase Storage
- Email: SendGrid (recommended) or SMTP fallback
- Calls: WebRTC (TURN/STUN via provider)

## Local Setup (Brief)

1) Install dependencies
```bash
npm install
```

2) Configure env vars
```bash
# .env (do not commit secrets)
DATABASE_URL=postgresql://user:pass@localhost:5432/chatapp_db
VITE_API_BASE=http://localhost:3001
CLIENT_ORIGIN=http://localhost:5173
JWT_SECRET=your_secret_here
SERVER_BASE_URL=http://localhost:3001

# Email (SendGrid recommended)
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=your_sendgrid_key
SENDGRID_FROM_EMAIL=your_email@example.com
SENDGRID_FROM_NAME=SafeChat
SENDGRID_REPLY_TO=your_email@example.com

# SMTP fallback (optional)
GMAIL_SMTP_USER=your_email@gmail.com
GMAIL_SMTP_PASS=your_app_password
```

3) Run API and client
```bash
npm run dev:server
npm run dev
```

4) Create schema and backfill
```bash
npm run db:push
```

## Key User Flows

- Auth: register -> verify email -> login -> chat
- Friends: add, accept, and start direct chats
- Groups: create group, add/remove members
- Messages: reply, edit, delete; read receipts and typing indicators
- Media: image previews, file attachments, downloads
- Calls: audio/video with live controls

## Notes

- Messages and files are purged after 7 days.
- SendGrid is recommended for production email delivery.
- Update `CLIENT_ORIGIN` and `SERVER_BASE_URL` for your deployment.

---

Last Updated: January 10, 2026
Version: 1.0.0
