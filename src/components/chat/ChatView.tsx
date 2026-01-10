import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, CSSProperties, ReactNode, RefObject } from 'react'
import {
  ArrowLeft,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  Download,
  Paperclip,
  Phone,
  Plus,
  RotateCw,
  Search,
  Send,
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
  chatSearchRef: RefObject<HTMLDivElement>
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
  fileInputRef: RefObject<HTMLInputElement>
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void
  imageInputRef: RefObject<HTMLInputElement>
  onImageChange: (event: ChangeEvent<HTMLInputElement>) => void
  uploadProgress: number | null
  uploadFileName: string
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
  fileInputRef,
  onFileChange,
  imageInputRef,
  onImageChange,
  uploadProgress,
  uploadFileName,
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

  const isImageFile = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase() || ''
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)
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
  const textRefs = useRef<Record<string, HTMLParagraphElement | null>>({})
  const clampStyle: CSSProperties = {
    display: '-webkit-box',
    WebkitLineClamp: 10,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  }

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

    <div className="flex-1 glass overflow-y-auto px-4 py-6 md:px-6">
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
                            className={`relative rounded-2xl rounded-bl-none px-4 py-3 text-sm shadow break-all ${
                              message.senderId === user.id
                                ? 'glass-soft'
                                : 'bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-500 text-white'
                            } ${
                              chatSearchMatches.includes(message.id)
                                ? isActiveMatch
                                  ? 'ring-2 ring-yellow-300/80'
                                  : 'ring-1 ring-violet-300/70'
                                : ''
                            }`}
                          >
                            {showSenderName ? (
                              <p className="mb-1 text-[11px] font-semibold text-white/80">
                                {sender?.displayName || 'Member'}
                              </p>
                            ) : null}
                            {message.text ? (
                              <p
                                ref={(node) => {
                                  textRefs.current[message.id] = node
                                }}
                                style={!isExpanded ? clampStyle : undefined}
                              >
                                {highlightText(message.text, chatSearchQuery, isActiveMatch)}
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
                            {message.text && isTruncated ? (
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
                            {message.file && message.text ? (
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
                            className={`rounded-2xl rounded-bl-none px-4 py-3 text-sm shadow break-all ${
                              message.senderId === user.id
                                ? 'glass-soft'
                                : 'bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-500 text-white'
                            } ${
                              chatSearchMatches.includes(message.id)
                                ? isActiveMatch
                                  ? 'ring-2 ring-yellow-300/80'
                                  : 'ring-1 ring-violet-300/70'
                                : ''
                            }`}
                          >
                            {message.text ? (
                              <p
                                ref={(node) => {
                                  textRefs.current[message.id] = node
                                }}
                                style={!isExpanded ? clampStyle : undefined}
                              >
                                {highlightText(message.text, chatSearchQuery, isActiveMatch)}
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
                            {message.text && isTruncated ? (
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
                            {message.file && message.text ? (
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
                            </div>
                          </div>
                        </div>
                      )
                    ) : (
                      <div className="flex justify-end">
                        <div
                          className={`rounded-2xl rounded-br-none px-4 py-3 text-sm shadow glass-soft break-all ${
                            chatSearchMatches.includes(message.id)
                              ? isActiveMatch
                                ? 'ring-2 ring-yellow-300/80'
                                : 'ring-1 ring-violet-300/70'
                              : ''
                          }`}
                        >
                          {message.text ? (
                            <p
                              ref={(node) => {
                                textRefs.current[message.id] = node
                              }}
                              style={!isExpanded ? clampStyle : undefined}
                            >
                              {highlightText(message.text, chatSearchQuery, isActiveMatch)}
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
                          {message.text && isTruncated ? (
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
                          {message.file && message.text ? (
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
        <div className="mt-4 w-fit rounded-full rounded-bl-none glass-soft px-4 py-2 text-xs text-muted-foreground bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-500">
          <span className="inline-flex items-center gap-1 align-middle">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white [animation-delay:-0.2s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white [animation-delay:-0.1s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white" />
          </span>
        </div>
      ) : null}
    </div>

    <footer className="glass px-4 py-4 md:px-6">
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
            disabled={!activeConversation}
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
            disabled={!activeConversation}
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
