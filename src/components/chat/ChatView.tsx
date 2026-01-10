import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, CSSProperties, ReactNode, RefObject } from 'react'
import {
  ArrowLeft,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  Download,
  Paperclip,
  Pencil,
  Phone,
  Plus,
  Reply,
  RotateCw,
  Search,
  Send,
  Trash2,
  User,
  Users,
  Video,
  ZoomIn,
  ZoomOut,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import type { Conversation, Message, User as ChatUser } from '@/types'
import { getAvatarSrc } from '@/lib/chat'

type MessageGroup = {
  label: string
  items: Message[]
}

type ChatViewProps = {
  activeConversation: Conversation | null
  activeName: string
  activeSubtitle: string
  activeAvatarSrc: string
  user: ChatUser
  groupedMessages: MessageGroup[]
  typingUsers: string[]
  chatSearchOpen: boolean
  onToggleChatSearchOpen: () => void
  chatSearchQuery: string
  onChatSearchQueryChange: (value: string) => void
  chatSearchMatches: string[]
  chatSearchIndex: number
  onPrevSearchMatch: () => void
  onNextSearchMatch: () => void
  chatSearchRef: RefObject<HTMLDivElement | null>
  messageRefs: RefObject<Record<string, HTMLDivElement | null>>
  highlightText: (text: string, query: string, isActive: boolean) => ReactNode
  downloadFile: (fileId: string, fileName: string) => void
  otherMemberId: string | null
  canCall: boolean
  onStartCall: (mode: 'video' | 'voice') => void
  onOpenGroupManage: () => void
  onOpenMobileChats: () => void
  messageText: string
  onMessageTextChange: (value: string) => void
  onSendMessage: () => void
  replyToId: string | null
  editingMessageId: string | null
  onReplyMessage: (messageId: string) => void
  onCancelReply: () => void
  onEditMessage: (message: Message) => void
  onCancelEdit: () => void
  onDeleteMessage: (messageId: string) => void
  fileInputRef: RefObject<HTMLInputElement | null>
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void
  imageInputRef: RefObject<HTMLInputElement | null>
  onImageChange: (event: ChangeEvent<HTMLInputElement>) => void
  uploadProgress: number | null
  pendingFileName: string
  pendingFilePreview: string
  pendingFileIsImage: boolean
  onClearPendingFile: () => void
  fetchFilePreviewUrl: (fileId: string) => Promise<string | null>
}

const ChatView = ({
  activeConversation,
  activeName,
  activeSubtitle,
  activeAvatarSrc,
  user,
  groupedMessages,
  typingUsers,
  chatSearchOpen,
  onToggleChatSearchOpen,
  chatSearchQuery,
  onChatSearchQueryChange,
  chatSearchMatches,
  chatSearchIndex,
  onPrevSearchMatch,
  onNextSearchMatch,
  chatSearchRef,
  messageRefs,
  highlightText,
  downloadFile,
  otherMemberId,
  canCall,
  onStartCall,
  onOpenGroupManage,
  onOpenMobileChats,
  messageText,
  onMessageTextChange,
  onSendMessage,
  replyToId,
  editingMessageId,
  onReplyMessage,
  onCancelReply,
  onEditMessage,
  onCancelEdit,
  onDeleteMessage,
  fileInputRef,
  onFileChange,
  imageInputRef,
  onImageChange,
  uploadProgress,
  pendingFileName,
  pendingFilePreview,
  pendingFileIsImage,
  onClearPendingFile,
  fetchFilePreviewUrl,
}: ChatViewProps) => {
  const getFileBadgeClass = (extension: string) => {
    const ext = extension.toLowerCase()
    if (ext === 'pdf') return 'bg-red-500/80 text-white'
    if (['xls', 'xlsx', 'csv'].includes(ext)) return 'bg-emerald-500/80 text-white'
    if (['doc', 'docx', 'rtf'].includes(ext)) return 'bg-sky-500/80 text-white'
    if (['ppt', 'pptx'].includes(ext)) return 'bg-orange-500/80 text-white'
    if (['zip', 'rar', '7z'].includes(ext)) return 'bg-slate-500/80 text-white'
    return 'bg-white/10 text-white'
  }

  const getFileBadgeText = (name: string) => {
    const ext = name.split('.').pop() || 'FILE'
    return ext.slice(0, 6).toUpperCase()
  }

  const renderTextWithLinks = (text: string, isActive: boolean) => {
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi
    const parts = text.split(urlRegex)
    return parts.map((part, index) => {
      if (!part) return null
      const isUrl = urlRegex.test(part)
      urlRegex.lastIndex = 0
      if (isUrl) {
        const href = part.startsWith('http') ? part : `https://${part}`
        return (
          <a
            key={`link-${index}`}
            href={href}
            target="_blank"
            rel="noreferrer"
            className="text-indigo-400 dark:text-indigo-300 underline decoration-indigo-400 dark:decoration-indigo-300 underline-offset-2 hover:text-indigo-500 hover:decoration-indigo-500 dark:hover:text-indigo-400 dark:hover:decoration-indigo-400"
            onClick={(event) => event.stopPropagation()}
          >
            {part}
          </a>
        )
      }
      return highlightText(part, chatSearchQuery, isActive)
    })
  }

  const isImageFile = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase() || ''
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)
  }

  const scrollToMessage = (messageId: string) => {
    const target = messageRefs.current[messageId]
    if (!target || !scrollRef.current) return
    target.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setFlashMessageId(messageId)
    window.setTimeout(() => {
      setFlashMessageId((current) => (current === messageId ? null : current))
    }, 900)
  }

  const renderReplyPreview = (message: Message, isMine: boolean) => {
    if (!message.replyTo) return null
    const original = messageLookup.get(message.replyTo)
    const sender =
      original &&
      activeConversation?.members.find((member) => member.id === original.senderId)
    const senderName =
      original?.senderId === user.id ? 'You' : sender?.displayName || 'Member'
    const isDeleted = !original || original.deletedAt || original.type === 'deleted'
    const previewText = isDeleted
      ? 'Message deleted'
      : original?.text
        ? original.text
        : original?.file
          ? original.file.originalName
          : 'Attachment'
    return (
      <div
        className={`mb-2 rounded-lg border-l-2 px-3 py-2 text-[11px] ${
          isMine
            ? 'border-white/30 bg-white/10 text-foreground/80'
            : 'border-white/40 bg-white/10 text-white/80'
        } ${original ? 'cursor-pointer hover:bg-white/15' : ''}`}
        onClick={() => {
          if (original) {
            scrollToMessage(original.id)
          }
        }}
      >
        <p className="font-semibold">{senderName}</p>
        <p className="line-clamp-2">{previewText}</p>
      </div>
    )
  }

  const [imageUrls, setImageUrls] = useState<Record<string, string>>({})
  const [imageLightbox, setImageLightbox] = useState<{
    url: string
    name: string
    fileId: string
  } | null>(null)
  const [imageZoom, setImageZoom] = useState(1)
  const [imageRotation, setImageRotation] = useState(0)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const panStartRef = useRef<{ x: number; y: number; originX: number; originY: number } | null>(null)
  const [expandedMessages, setExpandedMessages] = useState<Record<string, boolean>>({})
  const [truncatedMessages, setTruncatedMessages] = useState<Record<string, boolean>>({})
  const [flashMessageId, setFlashMessageId] = useState<string | null>(null)
  const textRefs = useRef<Record<string, HTMLParagraphElement | null>>({})
  const clampStyle: CSSProperties = {
    display: '-webkit-box',
    WebkitLineClamp: 10,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  }
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [atBottom, setAtBottom] = useState(true)

  const messageLookup = useMemo(() => {
    const map = new Map<string, Message>()
    groupedMessages.forEach((group) => {
      group.items.forEach((message) => map.set(message.id, message))
    })
    return map
  }, [groupedMessages])

  const replyMessage = replyToId ? messageLookup.get(replyToId) : null
  const editingMessage = editingMessageId
    ? messageLookup.get(editingMessageId)
    : null

  const measureTruncation = () => {
    const next: Record<string, boolean> = {}
    Object.entries(textRefs.current).forEach(([id, node]) => {
      if (!node) return
      next[id] = node.scrollHeight - node.clientHeight > 1
    })
    setTruncatedMessages(next)
  }

  useEffect(() => {
    measureTruncation()
  }, [groupedMessages, chatSearchQuery, expandedMessages])

  useEffect(() => {
    const handleResize = () => measureTruncation()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [groupedMessages, chatSearchQuery, expandedMessages])

  useEffect(() => {
    let alive = true
    const loadImages = async () => {
      const next: Record<string, string> = {}
      for (const group of groupedMessages) {
        for (const message of group.items) {
          if (!message.file || message.text) continue
          if (!isImageFile(message.file.originalName)) continue
          if (imageUrls[message.file.id]) continue
          const url = await fetchFilePreviewUrl(message.file.id)
          if (url) {
            next[message.file.id] = url
          }
        }
      }
      if (alive && Object.keys(next).length > 0) {
        setImageUrls((prev) => ({ ...prev, ...next }))
      }
    }
    loadImages()
    return () => {
      alive = false
    }
  }, [fetchFilePreviewUrl, groupedMessages, imageUrls])

  useEffect(() => {
    if (!imageLightbox) return
    setImageZoom(1)
    setImageRotation(0)
    setPanOffset({ x: 0, y: 0 })
  }, [imageLightbox?.fileId])

  const scrollToBottom = (behavior: ScrollBehavior = 'auto') => {
    if (!scrollRef.current) return
    scrollRef.current.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior,
    })
  }

  useEffect(() => {
    scrollToBottom('auto')
  }, [activeConversation?.id])

  useEffect(() => {
    if (atBottom) {
      scrollToBottom('auto')
    }
  }, [groupedMessages, atBottom])

  const handleScroll = () => {
    if (!scrollRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
    const distance = scrollHeight - scrollTop - clientHeight
    setAtBottom(distance < 40)
  }

  const handlePanStart = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    if (!imageLightbox?.url || imageZoom <= 1) return
    panStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      originX: panOffset.x,
      originY: panOffset.y,
    }
  }

  const handlePanMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!panStartRef.current) return
    if (event.buttons !== 1) {
      panStartRef.current = null
      return
    }
    const factor = 0.75
    setPanOffset({
      x: panStartRef.current.originX + (event.clientX - panStartRef.current.x) * factor,
      y: panStartRef.current.originY + (event.clientY - panStartRef.current.y) * factor,
    })
  }

  const handlePanEnd = () => {
    panStartRef.current = null
  }

  return (
    <main className="flex flex-1 flex-col overflow-hidden !ml-0 md:m-4 md:rounded-2xl">
    <header className="flex items-center justify-between glass px-4 py-4 md:px-6 z-10">
      <div className="flex items-center gap-3">
        <Button
          size="icon"
          variant="ghost"
          className="md:hidden"
          onClick={onOpenMobileChats}
          title="Open chats"
        >
          <ArrowLeft size={18} />
        </Button>
        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full glass-soft">
          {activeAvatarSrc ? (
            <img
              src={activeAvatarSrc}
              alt={activeName}
              className="h-full w-full object-cover"
            />
          ) : activeConversation?.type === 'group' ? (
            <Users size={18} className="text-muted-foreground" />
          ) : (
            <User size={18} className="text-muted-foreground" />
          )}
        </div>
        <div>
          <p className="text-sm font-semibold">{activeName}</p>
          <p className="text-xs text-muted-foreground">{activeSubtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {activeConversation?.type === 'group' ? (
          <Button
            size="icon"
            variant="ghost"
            onClick={onOpenGroupManage}
            title="Manage group"
          >
            <Users size={18} />
          </Button>
        ) : null}
        <div className="relative" ref={chatSearchRef}>
          <Button
            size="icon"
            variant="ghost"
            onClick={onToggleChatSearchOpen}
            title="Search chat"
            className={chatSearchOpen ? 'bg-white/20 text-white' : ''}
          >
            <Search size={18} />
          </Button>
          {chatSearchOpen ? (
            <div className="absolute right-0 top-12 z-10 w-64 rounded-xl border border-white/30 bg-white/70 p-3 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70">
              <div className="pointer-events-none absolute -top-1 right-6 h-0 w-0">
                <span className="absolute -top-1 left-0 h-0 w-0 border-x-8 border-b-8 border-x-transparent border-b-white/70 dark:border-b-slate-900/70" />
                <span className="absolute left-[1px] top-0 h-0 w-0 border-x-7 border-b-7 border-x-transparent border-b-white/80 dark:border-b-slate-900/70" />
              </div>
              <Input
                placeholder="Search in chat"
                value={chatSearchQuery}
                onChange={(event) => onChatSearchQueryChange(event.target.value)}
                className="border-white/40 bg-white/80 text-slate-900 placeholder:text-slate-500 focus-visible:ring-violet-400/70 dark:bg-slate-900/70 dark:text-white dark:placeholder:text-slate-400"
              />
              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {chatSearchMatches.length === 0
                    ? 'No matches'
                    : `${chatSearchIndex + 1} / ${chatSearchMatches.length}`}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled={chatSearchMatches.length === 0}
                    onClick={onPrevSearchMatch}
                  >
                    <ChevronUp size={16} />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled={chatSearchMatches.length === 0}
                    onClick={onNextSearchMatch}
                  >
                    <ChevronDown size={16} />
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => onStartCall('video')}
          disabled={!canCall}
          title="Video call"
        >
          <Video size={18} />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => onStartCall('voice')}
          disabled={!canCall}
          title="Voice call"
        >
          <Phone size={18} />
        </Button>
      </div>
    </header>

    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="relative flex-1 glass overflow-y-auto px-4 py-6 md:px-6"
    >
      {!activeConversation ? (
        <div className="rounded-xl glass-soft p-4 text-sm text-muted-foreground">
          Select a conversation to start messaging.
        </div>
      ) : null}
      <div className="space-y-6">
        {groupedMessages.map((group) => (
          <div key={group.label} className="space-y-4">
            <div className="flex justify-center">
              <span className="rounded-full bg-muted px-4 py-1 text-xs text-foreground/80 backdrop-blur-md">
                {group.label}
              </span>
            </div>
            <div className="space-y-4">
              {group.items.map((message) => {
                const isActiveMatch = chatSearchMatches[chatSearchIndex] === message.id
                const isGroupChat = activeConversation?.type === 'group'
                const sender = activeConversation?.members.find(
                  (member) => member.id === message.senderId
                )
                const senderAvatar = sender ? getAvatarSrc(sender) : ''
                const showSenderName = isGroupChat && message.senderId !== user.id
                const isExpanded = Boolean(expandedMessages[message.id])
                const isTruncated = Boolean(truncatedMessages[message.id])
                const isMine = message.senderId === user.id
                const isDeleted = Boolean(message.deletedAt) || message.type === 'deleted'
                const replyPreview = renderReplyPreview(message, isMine)
                if (isDeleted) {
                  return null
                }
                return (
                  <div
                    key={message.id}
                    ref={(node) => {
                      messageRefs.current[message.id] = node
                    }}
                    className={`max-w-[85%] md:max-w-[60%] ${
                      message.senderId === user.id ? 'ml-auto' : ''
                    }`}
                  >
                    {message.senderId !== user.id ? (
                      isGroupChat ? (
                        <div className="flex items-end gap-2">
                          <div className="translate-y-5 flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full glass-soft">
                            {senderAvatar ? (
                              <img
                                src={senderAvatar}
                                alt={sender?.displayName || 'User'}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <User size={16} className="text-muted-foreground" />
                            )}
                          </div>
                          <div
                            className={`relative group rounded-2xl rounded-bl-none px-4 py-3 text-sm shadow break-all transition-shadow duration-700 ${
                              message.senderId === user.id
                                ? 'glass-soft'
                                : 'bg-slate-900/60 text-white'
                            } ${
                              chatSearchMatches.includes(message.id)
                                ? isActiveMatch
                                  ? 'ring-2 ring-yellow-300/80'
                                  : 'ring-1 ring-violet-300/70'
                                : ''
                            } ${
                              flashMessageId === message.id
                                ? 'shadow-[0_0_0_2px_rgba(250,204,21,0.65),0_0_18px_rgba(250,204,21,0.35)]'
                                : ''
                            }`}
                          >
                            <div className="absolute left-full top-1/2 -translate-y-1/2 translate-x-2 flex gap-1 opacity-100 transition group-hover:opacity-100">
                              <button
                                type="button"
                                onClick={() => onReplyMessage(message.id)}
                                className="rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
                                title="Reply"
                              >
                                <Reply size={12} />
                              </button>
                            </div>
                            {showSenderName ? (
                              <p className="mb-1 text-[11px] font-semibold text-white/80">
                                {sender?.displayName || 'Member'}
                              </p>
                            ) : null}
                            {message.editedAt && !isDeleted ? (
                              <div className="mb-1 absolute -top-6 left-0 text-right text-[10px] tracking-wide text-muted-foreground">
                                Edited
                              </div>
                            ) : null}
                            {replyPreview}
                            {isDeleted ? (
                              <p className="text-xs italic text-white/70">Message deleted</p>
                            ) : message.text ? (
                              <p
                                ref={(node) => {
                                  textRefs.current[message.id] = node
                                }}
                                style={!isExpanded ? clampStyle : undefined}
                              >
                                {renderTextWithLinks(message.text, isActiveMatch)}
                              </p>
                            ) : message.file ? (
                              isImageFile(message.file.originalName) ? (
                                <button
                                  type="button"
                                  className="mt-2 w-full overflow-hidden rounded-xl border border-white/10 bg-white/5"
                                  onClick={() =>
                                    setImageLightbox({
                                      url: imageUrls[message.file!.id] || '',
                                      name: message.file!.originalName,
                                      fileId: message.file!.id,
                                    })
                                  }
                                >
                                  {imageUrls[message.file.id] ? (
                                    <img
                                      src={imageUrls[message.file.id]}
                                      alt={message.file.originalName}
                                      className="max-h-72 w-full object-cover"
                                    />
                                  ) : (
                                    <div className="flex h-32 w-full items-center justify-center text-xs text-white/70">
                                      Loading image...
                                    </div>
                                  )}
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() =>
                                    downloadFile(message.file!.id, message.file!.originalName)
                                  }
                                  className="mt-1 flex items-center gap-3 rounded-md bg-white/10 p-2 text-left text-sm text-white/90 hover:bg-white/15"
                                >
                                  <div
                                    className={`flex h-9 w-9 items-center justify-center rounded-sm text-[10px] uppercase ${getFileBadgeClass(
                                      message.file.originalName.split('.').pop() || ''
                                    )}`}
                                  >
                                    {getFileBadgeText(message.file.originalName)}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-xs font-medium">
                                      {message.file.originalName}
                                    </p>
                                    <p className="text-[10px] text-white/70">Download</p>
                                  </div>
                                  <Download size={16} className="text-white/80" />
                                </button>
                              )
                            ) : null}
                            {message.text && !isDeleted && isTruncated ? (
                              <button
                                type="button"
                                className="mt-2 text-xs font-medium italic hover:underline"
                                onClick={() =>
                                  setExpandedMessages((prev) => ({
                                    ...prev,
                                    [message.id]: !isExpanded,
                                  }))
                                }
                              >
                                {isExpanded ? '...See less' : '...See more'}
                              </button>
                            ) : null}
                            {!isDeleted && message.file && message.text ? (
                              isImageFile(message.file.originalName) ? (
                                <button
                                  type="button"
                                  className="mt-2 w-full overflow-hidden rounded-xl border border-white/10 bg-white/5"
                                  onClick={() =>
                                    setImageLightbox({
                                      url: imageUrls[message.file!.id] || '',
                                      name: message.file!.originalName,
                                      fileId: message.file!.id,
                                    })
                                  }
                                >
                                  {imageUrls[message.file.id] ? (
                                    <img
                                      src={imageUrls[message.file.id]}
                                      alt={message.file.originalName}
                                      className="max-h-72 w-full object-cover"
                                    />
                                  ) : (
                                    <div className="flex h-32 w-full items-center justify-center text-xs text-white/70">
                                      Loading image...
                                    </div>
                                  )}
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() =>
                                    downloadFile(message.file!.id, message.file!.originalName)
                                  }
                                  className="mt-2 flex items-center gap-3 rounded-md bg-white/10 p-2 text-left text-sm text-white/90 hover:bg-white/15"
                                >
                                  <div
                                    className={`flex h-9 w-9 items-center justify-center rounded-sm text-[10px] uppercase ${getFileBadgeClass(
                                      message.file.originalName.split('.').pop() || ''
                                    )}`}
                                  >
                                    {getFileBadgeText(message.file.originalName)}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-xs font-medium">
                                      {message.file.originalName}
                                    </p>
                                    <p className="text-[10px] text-white/70">Download</p>
                                  </div>
                                  <Download size={16} className="text-white/80" />
                                </button>
                              )
                            ) : null}
                            <div className="mt-2 flex items-center justify-end text-[11px] opacity-70">
                              <span>
                                {new Date(message.createdAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                              {message.senderId === user.id ? (
                                <span className="ml-2 flex items-center gap-1">
                                  <span
                                    title={
                                      otherMemberId && message.readBy.includes(otherMemberId)
                                        ? `Read at ${new Date(
                                            message.readAt ?? message.createdAt
                                          ).toLocaleTimeString([], {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                          })}`
                                        : `Delivered at ${new Date(
                                            message.createdAt
                                          ).toLocaleTimeString([], {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                          })}`
                                    }
                                  >
                                    <CheckCheck
                                      size={14}
                                      className={
                                        otherMemberId &&
                                        message.readBy.includes(otherMemberId)
                                          ? 'text-[hsl(var(--accent-read))]'
                                          : 'text-muted-foreground'
                                      }
                                    />
                                  </span>
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex">
                        <div
                          className={`relative group rounded-2xl rounded-bl-none px-4 py-3 text-sm shadow break-all transition-shadow duration-700 ${
                            message.senderId === user.id
                              ? 'glass-soft'
                              : 'bg-slate-900/60 text-white'
                          } ${
                            chatSearchMatches.includes(message.id)
                              ? isActiveMatch
                                ? 'ring-2 ring-yellow-300/80'
                                : 'ring-1 ring-violet-300/70'
                              : ''
                          } ${
                            flashMessageId === message.id
                              ? 'shadow-[0_0_0_2px_rgba(250,204,21,0.65),0_0_18px_rgba(250,204,21,0.35)]'
                              : ''
                          }`}
                        >
                            <div className="absolute left-full top-1/2 -translate-y-1/2 translate-x-2 flex gap-1 opacity-100 transition group-hover:opacity-100">
                              <button
                                type="button"
                                onClick={() => onReplyMessage(message.id)}
                                className="rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
                                title="Reply"
                              >
                                <Reply size={12} />
                              </button>
                            </div>
                            {message.editedAt && !isDeleted ? (
                              <div className="mb-1 absolute -top-6 left-0 text-right text-[10px] tracking-wide text-muted-foreground">
                                Edited
                              </div>
                            ) : null}
                            {replyPreview}
                            {isDeleted ? (
                              <p className="text-xs italic text-white/70">Message deleted</p>
                            ) : message.text ? (
                              <p
                                ref={(node) => {
                                  textRefs.current[message.id] = node
                                }}
                                style={!isExpanded ? clampStyle : undefined}
                              >
                                {renderTextWithLinks(message.text, isActiveMatch)}
                              </p>
                            ) : message.file ? (
                              isImageFile(message.file.originalName) ? (
                                <div className="mt-2 overflow-hidden rounded-xl border border-white/10 bg-white/5">
                                  {imageUrls[message.file.id] ? (
                                    <img
                                      src={imageUrls[message.file.id]}
                                      alt={message.file.originalName}
                                      className="max-h-72 w-full object-cover"
                                    />
                                  ) : (
                                    <div className="flex h-32 w-full items-center justify-center text-xs text-white/70">
                                      Loading image...
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() =>
                                    downloadFile(message.file!.id, message.file!.originalName)
                                  }
                                  className="mt-1 flex items-center gap-3 rounded-md bg-white/10 p-2 text-left text-sm text-white/90 hover:bg-white/15"
                                >
                                  <div
                                    className={`flex h-9 w-9 items-center justify-center rounded-sm text-[10px] uppercase ${getFileBadgeClass(
                                      message.file.originalName.split('.').pop() || ''
                                    )}`}
                                  >
                                    {getFileBadgeText(message.file.originalName)}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-xs font-medium">
                                      {message.file.originalName}
                                    </p>
                                    <p className="text-[10px] text-white/70">Download</p>
                                  </div>
                                  <Download size={16} className="text-white/80" />
                                </button>
                              )
                            ) : null}
                            {message.text && !isDeleted && isTruncated ? (
                              <button
                                type="button"
                                className="mt-2 text-xs font-medium italic hover:underline"
                                onClick={() =>
                                  setExpandedMessages((prev) => ({
                                    ...prev,
                                    [message.id]: !isExpanded,
                                  }))
                                }
                              >
                                {isExpanded ? '...See less' : '...See more'}
                              </button>
                            ) : null}
                            {!isDeleted && message.file && message.text ? (
                              isImageFile(message.file.originalName) ? (
                                <div className="mt-2 overflow-hidden rounded-xl border border-white/10 bg-white/5">
                                  {imageUrls[message.file.id] ? (
                                    <img
                                      src={imageUrls[message.file.id]}
                                      alt={message.file.originalName}
                                      className="max-h-72 w-full object-cover"
                                    />
                                  ) : (
                                    <div className="flex h-32 w-full items-center justify-center text-xs text-white/70">
                                      Loading image...
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() =>
                                    downloadFile(message.file!.id, message.file!.originalName)
                                  }
                                  className="mt-2 flex items-center gap-3 rounded-md bg-white/10 p-2 text-left text-sm text-white/90 hover:bg-white/15"
                                >
                                  <div
                                    className={`flex h-9 w-9 items-center justify-center rounded-sm text-[10px] uppercase ${getFileBadgeClass(
                                      message.file.originalName.split('.').pop() || ''
                                    )}`}
                                  >
                                    {getFileBadgeText(message.file.originalName)}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-xs font-medium">
                                      {message.file.originalName}
                                    </p>
                                    <p className="text-[10px] text-white/70">Download</p>
                                  </div>
                                  <Download size={16} className="text-white/80" />
                                </button>
                              )
                            ) : null}
                            <div className="mt-2 flex items-center justify-end text-[11px] opacity-70">
                              <span>
                                {new Date(message.createdAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    ) : (
                      <div className="flex justify-end">
                        <div
                          className={`relative group rounded-2xl rounded-br-none px-4 py-3 text-sm shadow glass-soft break-all transition-shadow duration-700 ${
                            chatSearchMatches.includes(message.id)
                              ? isActiveMatch
                                ? 'ring-2 ring-yellow-300/80'
                                : 'ring-1 ring-violet-300/70'
                              : ''
                          } ${
                            flashMessageId === message.id
                              ? 'shadow-[0_0_0_2px_rgba(250,204,21,0.65),0_0_18px_rgba(250,204,21,0.35)]'
                              : ''
                          }`}
                        >
                          <div className="absolute right-full top-1/2 -translate-y-1/2 -translate-x-2 flex gap-1 opacity-100 transition group-hover:opacity-100">
                            <button
                              type="button"
                              onClick={() => onReplyMessage(message.id)}
                              className="rounded-full bg-white/70 p-1 text-slate-900 hover:bg-white"
                              title="Reply"
                            >
                              <Reply size={12} />
                            </button>
                            {!isDeleted && message.text ? (
                              <button
                                type="button"
                                onClick={() => onEditMessage(message)}
                                className="rounded-full bg-white/70 p-1 text-slate-900 hover:bg-white"
                                title="Edit"
                              >
                                <Pencil size={12} />
                              </button>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => onDeleteMessage(message.id)}
                              className="rounded-full bg-white/70 p-1 text-slate-900 hover:bg-white"
                              title="Delete"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                          {message.editedAt && !isDeleted ? (
                            <div className="mb-1 absolute -top-6 right-0 text-right text-[10px] tracking-wide text-muted-foreground">
                              Edited
                            </div>
                          ) : null}
                          {replyPreview}
                          {isDeleted ? (
                            <p className="text-xs italic text-muted-foreground">
                              Message deleted
                            </p>
                          ) : message.text ? (
                            <p
                              ref={(node) => {
                                textRefs.current[message.id] = node
                              }}
                              style={!isExpanded ? clampStyle : undefined}
                            >
                              {renderTextWithLinks(message.text, isActiveMatch)}
                            </p>
                          ) : message.file ? (
                            isImageFile(message.file.originalName) ? (
                              <button
                                type="button"
                                className="mt-2 w-full overflow-hidden rounded-xl border border-white/10 bg-white/5"
                                onClick={() =>
                                  setImageLightbox({
                                    url: imageUrls[message.file!.id] || '',
                                    name: message.file!.originalName,
                                    fileId: message.file!.id,
                                  })
                                }
                              >
                                {imageUrls[message.file.id] ? (
                                  <img
                                    src={imageUrls[message.file.id]}
                                    alt={message.file.originalName}
                                    className="max-h-72 w-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-32 w-full items-center justify-center text-xs text-white/70">
                                    Loading image...
                                  </div>
                                )}
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  downloadFile(message.file!.id, message.file!.originalName)
                                }
                                className="mt-1 flex items-center gap-3 rounded-md bg-foreground/10 p-2 text-left text-sm text-foreground/90 hover:bg-foreground/15"
                              >
                                <div
                                  className={`flex h-9 w-9 items-center justify-center rounded-sm text-[10px] uppercase ${getFileBadgeClass(
                                    message.file.originalName.split('.').pop() || ''
                                  )}`}
                                >
                                  {getFileBadgeText(message.file.originalName)}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-xs font-medium">
                                    {message.file.originalName}
                                  </p>
                                  <p className="text-[10px] text-foreground/70">Download</p>
                                </div>
                                <Download size={16} className="text-foreground/80" />
                              </button>
                            )
                          ) : null}
                          {message.text && !isDeleted && isTruncated ? (
                            <button
                              type="button"
                              className="mt-2 text-xs font-medium italic hover:underline"
                              onClick={() =>
                                setExpandedMessages((prev) => ({
                                  ...prev,
                                  [message.id]: !isExpanded,
                                }))
                              }
                            >
                              {isExpanded ? '...See less' : '...See more'}
                            </button>
                          ) : null}
                          {!isDeleted && message.file && message.text ? (
                            isImageFile(message.file.originalName) ? (
                              <button
                                type="button"
                                className="mt-2 w-full overflow-hidden rounded-xl border border-white/10 bg-white/5"
                                onClick={() =>
                                  setImageLightbox({
                                    url: imageUrls[message.file!.id] || '',
                                    name: message.file!.originalName,
                                    fileId: message.file!.id,
                                  })
                                }
                              >
                                {imageUrls[message.file.id] ? (
                                  <img
                                    src={imageUrls[message.file.id]}
                                    alt={message.file.originalName}
                                    className="max-h-72 w-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-32 w-full items-center justify-center text-xs text-white/70">
                                    Loading image...
                                  </div>
                                )}
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  downloadFile(message.file!.id, message.file!.originalName)
                                }
                                className="mt-2 flex items-center gap-3 rounded-md bg-foreground/10 p-2 text-left text-sm text-foreground/90 hover:bg-foreground/15"
                              >
                                <div
                                  className={`flex h-9 w-9 items-center justify-center rounded-sm text-[10px] uppercase ${getFileBadgeClass(
                                    message.file.originalName.split('.').pop() || ''
                                  )}`}
                                >
                                  {getFileBadgeText(message.file.originalName)}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-xs font-medium">
                                    {message.file.originalName}
                                  </p>
                                  <p className="text-[10px] text-foreground/70">Download</p>
                                </div>
                                <Download size={16} className="text-foreground/80" />
                              </button>
                            )
                          ) : null}
                          <div className="mt-2 flex items-center justify-end text-[11px] opacity-70">
                            <span>
                              {new Date(message.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            {message.senderId === user.id ? (
                              <span className="ml-2 flex items-center gap-1">
                                <span
                                  title={
                                    otherMemberId && message.readBy.includes(otherMemberId)
                                      ? `Read at ${new Date(
                                          message.readAt ?? message.createdAt
                                        ).toLocaleTimeString([], {
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        })}`
                                      : `Delivered at ${new Date(
                                          message.createdAt
                                        ).toLocaleTimeString([], {
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        })}`
                                  }
                                >
                                  <CheckCheck
                                    size={14}
                                    className={
                                      otherMemberId && message.readBy.includes(otherMemberId)
                                        ? 'text-[hsl(var(--accent-read))]'
                                        : 'text-muted-foreground'
                                    }
                                  />
                                </span>
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
      {typingUsers.length > 0 ? (
        <div className="mt-4 w-fit rounded-full rounded-bl-none px-4 py-2 text-xs text-white bg-slate-900/60">
          <span className="inline-flex items-center gap-1 align-middle">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white [animation-delay:-0.2s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white [animation-delay:-0.1s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white" />
          </span>
        </div>
      ) : null}
      {!atBottom ? (
        <button
          type="button"
          onClick={() => scrollToBottom('smooth')}
          className="sticky bottom-6 ml-auto mt-4 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white shadow-lg backdrop-blur hover:bg-black/70"
          title="Jump to latest"
        >
          <ChevronDown size={18} />
        </button>
      ) : null}
    </div>

    <footer className="glass px-4 py-4 md:px-6">
      {(replyMessage || editingMessage) && (
        <div className="mb-3 rounded-xl border border-white/15 bg-white/10 p-3 text-xs text-foreground shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold">
                {editingMessage ? 'Editing message' : 'Replying to'}{' '}
                {!editingMessage && (
                  <span className="text-muted-foreground">
                    {replyMessage?.senderId === user.id
                      ? 'You'
                      : activeConversation?.members.find(
                          (member) => member.id === replyMessage?.senderId
                        )?.displayName || 'Member'}
                  </span>
                )}
              </p>
              <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                {editingMessage
                  ? editingMessage.text || 'Message'
                  : replyMessage?.deletedAt || replyMessage?.type === 'deleted'
                    ? 'Message deleted'
                    : replyMessage?.text || replyMessage?.file?.originalName || 'Message'}
              </p>
            </div>
            <button
              type="button"
              onClick={editingMessage ? onCancelEdit : onCancelReply}
              className="rounded-full bg-black/60 p-1 text-white hover:bg-black/70"
              title="Cancel"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      )}
      {pendingFileName ? (
        <div className="mb-3 flex items-center text-xs text-foreground">
          <div className="flex items-center gap-3 glass-soft p-2 rounded-lg">
            {pendingFileIsImage && pendingFilePreview ? (
              <img
                src={pendingFilePreview}
                alt="Attachment preview"
                className="h-10 w-10 rounded-md object-cover"
              />
            ) : (
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-sm text-[10px] uppercase ${getFileBadgeClass(
                  pendingFileName.split('.').pop() || ''
                )}`}
              >
                {getFileBadgeText(pendingFileName)}
              </div>
            )}
            <div className="max-w-[200px]">
              <div className="truncate" title={pendingFileName}>{pendingFileName}</div>
              {uploadProgress !== null ? (
                <div className="text-xs text-muted-foreground flex gap-2 items-center">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/20">
                    <div className="h-full bg-primary" style={{ width: `${uploadProgress}%` }} />
                  </div>
                  <div className="text-xs">{uploadProgress}%</div>
                </div>
              ) : null}
            </div>
            <Button size="icon" variant="ghost" onClick={onClearPendingFile} title="Remove">
              <X size={14} />
            </Button>
          </div>
        </div>
      ) : null}
      <div className="flex items-center gap-3 rounded-md glass-soft p-2">
        <div className="flex">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => imageInputRef.current?.click()}
            disabled={!activeConversation || Boolean(editingMessageId)}
            title="Attach image"
          >
            <Plus size={18} />
          </Button>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onImageChange}
          />
          <Button
            size="icon"
            variant="ghost"
            onClick={() => fileInputRef.current?.click()}
            disabled={!activeConversation || Boolean(editingMessageId)}
            title="Attach"
          >
            <Paperclip size={18} />
          </Button>
        </div>
        <input
          className="glass-soft px-3 py-2 rounded-full w-full bg-transparent text-sm outline-none"
          placeholder="Type a message"
          value={messageText}
          onChange={(event) => onMessageTextChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              onSendMessage()
            }
          }}
          disabled={!activeConversation}
        />
        <Button size="icon" onClick={onSendMessage} disabled={!activeConversation} className="w-10 rounded-sm">
          <Send size={18} />
        </Button>
        <input ref={fileInputRef} type="file" className="hidden" onChange={onFileChange} />
      </div>
    </footer>
    <Dialog open={Boolean(imageLightbox)} onOpenChange={() => setImageLightbox(null)}>
      <DialogContent className="max-w-4xl border-white/10 bg-slate-950/95 p-4">
        <div className="flex items-center justify-between gap-4">
          <p className="truncate text-sm text-white/80">
            {imageLightbox?.name || 'Image'}
          </p>
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setImageZoom((prev) => Math.max(0.5, prev - 0.25))}
              title="Zoom out"
            >
              <ZoomOut size={16} />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setImageZoom((prev) => Math.min(3, prev + 0.25))}
              title="Zoom in"
            >
              <ZoomIn size={16} />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setImageRotation((prev) => (prev + 90) % 360)}
              title="Rotate"
            >
              <RotateCw size={16} />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => {
                if (imageLightbox?.fileId && imageLightbox?.name) {
                  downloadFile(imageLightbox.fileId, imageLightbox.name)
                }
              }}
              title="Download"
            >
              <Download size={16} />
            </Button>
          </div>
        </div>
        <div
          className={`mt-3 overflow-hidden rounded-xl border border-white/10 bg-black/40 ${
            imageZoom > 1 ? 'cursor-grab active:cursor-grabbing' : ''
          }`}
          onMouseDown={handlePanStart}
          onMouseMove={handlePanMove}
          onMouseUp={handlePanEnd}
          onMouseLeave={handlePanEnd}
        >
          {imageLightbox?.url ? (
            <img
              src={imageLightbox.url}
              alt={imageLightbox.name}
              className="max-h-[70vh] w-full object-contain transition-transform duration-200"
              style={{
                transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${imageZoom}) rotate(${imageRotation}deg)`,
              }}
              draggable={false}
              onDragStart={(event) => event.preventDefault()}
            />
          ) : (
            <div className="flex h-64 items-center justify-center text-sm text-white/70">
              Loading image...
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
    </main>
  )
}

export default ChatView
