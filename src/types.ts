export type User = {
  id: string
  email: string
  displayName: string
  avatarUrl: string
}

export type Conversation = {
  id: string
  type: 'direct' | 'group'
  name: string | null
  members: User[]
  last_message: null | {
    id: string
    sender_id: string
    type: string
    text: string | null
    created_at: string
  }
}

export type Message = {
  id: string
  conversationId: string
  senderId: string
  type: string
  text: string | null
  createdAt: string
  editedAt?: string | null
  replyTo?: string | null
  deletedAt?: string | null
  readAt: string | null
  readBy: string[]
  file: null | {
    id: string
    originalName: string
  }
}

export type FriendRequest = {
  id: string
  createdAt: string
  user: User
}

export type CallState = {
  status: 'idle' | 'calling' | 'incoming' | 'in-call'
  mode: 'video' | 'voice'
  offer?: RTCSessionDescriptionInit
  conversationId?: string
}
