import type { Message, User } from '@/types'
import { API_BASE } from '@/lib/api'

export const mapMessage = (raw: any): Message => ({
  id: raw.id,
  conversationId: raw.conversation_id ?? raw.conversationId,
  senderId: raw.sender_id ?? raw.senderId,
  type: raw.type,
  text: raw.text ?? null,
  createdAt: raw.created_at ?? raw.createdAt,
  editedAt: raw.edited_at ?? raw.editedAt ?? null,
  replyTo: raw.reply_to ?? raw.replyTo ?? null,
  deletedAt: raw.deleted_at ?? raw.deletedAt ?? null,
  readAt: raw.read_at ?? raw.readAt ?? null,
  readBy: raw.read_by ?? raw.readBy ?? [],
  file: raw.file
    ? {
        id: raw.file.id ?? raw.file_id ?? raw.fileId,
        originalName:
          raw.file.original_name ?? raw.file.originalName ?? raw.file_name ?? 'file',
      }
    : null,
})

export const getAvatarSrc = (member?: User | null) => {
  if (!member?.avatarUrl) return ''
  return `${API_BASE}/api/users/avatar/${member.id}?v=${member.avatarUrl}`
}
