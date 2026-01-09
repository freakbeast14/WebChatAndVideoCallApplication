
import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { io, type Socket } from 'socket.io-client'
import {
  MessageSquare,
  UserPlus,
  Users,
  Sun,
  Moon,
  Search,
  Send,
  Paperclip,
  Phone,
  Video,
  VideoOff,
  ChevronUp,
  ChevronDown,
  Settings,
  LogOut,
  User,
  Info,
  Eye,
  EyeOff,
  Check,
  CheckCheck,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  PhoneOff,
  X,
  Plus,
  ArrowLeft,
  Minus,
  Mail,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001'

const getToken = () => localStorage.getItem('chatapp_token') || ''
const setToken = (value: string) => localStorage.setItem('chatapp_token', value)
const clearToken = () => localStorage.removeItem('chatapp_token')

type User = {
  id: string
  email: string
  displayName: string
  avatarUrl: string
}

type Conversation = {
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

type Message = {
  id: string
  conversationId: string
  senderId: string
  type: string
  text: string | null
  createdAt: string
  readAt: string | null
  readBy: string[]
  file: null | {
    id: string
    originalName: string
  }
}

type FriendRequest = {
  id: string
  createdAt: string
  user: User
}

type CallState = {
  status: 'idle' | 'calling' | 'incoming' | 'in-call'
  mode: 'video' | 'voice'
  offer?: RTCSessionDescriptionInit
  conversationId?: string
}

const fetchJson = async (path: string, init?: RequestInit) => {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data?.error || 'Request failed')
  }
  return data
}

const mapMessage = (raw: any): Message => ({
  id: raw.id,
  conversationId: raw.conversation_id ?? raw.conversationId,
  senderId: raw.sender_id ?? raw.senderId,
  type: raw.type,
  text: raw.text ?? null,
  createdAt: raw.created_at ?? raw.createdAt,
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

const getAvatarSrc = (member?: User | null) => {
  if (!member?.avatarUrl) return ''
  return `${API_BASE}/api/users/avatar/${member.id}?v=${member.avatarUrl}`
}

function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [view, setView] = useState<'chat' | 'account'>('chat')
  const [token, setAuthToken] = useState(getToken())
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [authError, setAuthError] = useState('')
  const [verificationSent, setVerificationSent] = useState(false)
  const [verificationStatus, setVerificationStatus] = useState<'success' | 'error' | ''>('')
  const [authLoading, setAuthLoading] = useState(false)
  const [resetMode, setResetMode] = useState<'request' | 'reset' | ''>('')
  const [resetToken, setResetToken] = useState('')
  const [resetNotice, setResetNotice] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [showResetPassword, setShowResetPassword] = useState(false)
  const [showResetConfirmPassword, setShowResetConfirmPassword] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [messageText, setMessageText] = useState('')
  const [chatSearch, setChatSearch] = useState('')
  const [friends, setFriends] = useState<User[]>([])
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([])
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([])
  const [friendsOpen, setFriendsOpen] = useState(false)
  const [groupOpen, setGroupOpen] = useState(false)
  const [groupManageOpen, setGroupManageOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [groupName, setGroupName] = useState('')
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [manageMembers, setManageMembers] = useState<string[]>([])
  const [ringtoneEnabled, setRingtoneEnabled] = useState(true)
  const [ringtoneVolume, setRingtoneVolume] = useState(0.6)
  const [ringtoneChoice, setRingtoneChoice] = useState('nebula')
  const [pingEnabled, setPingEnabled] = useState(true)
  const [pingVolume, setPingVolume] = useState(0.4)
  const [pingChoice, setPingChoice] = useState('spark')
  const [micMuted, setMicMuted] = useState(false)
  const [speakerMuted, setSpeakerMuted] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState('')
  const [avatarName, setAvatarName] = useState('')
  const [chatSearchOpen, setChatSearchOpen] = useState(false)
  const [chatSearchQuery, setChatSearchQuery] = useState('')
  const [chatSearchIndex, setChatSearchIndex] = useState(0)
  const [mobileChatsOpen, setMobileChatsOpen] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState<Record<string, boolean>>({})
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [uploadFileName, setUploadFileName] = useState('')
  const [callState, setCallState] = useState<CallState>({
    status: 'idle',
    mode: 'video',
  })
  const [remoteVideoReady, setRemoteVideoReady] = useState(false)
  const [callMinimized, setCallMinimized] = useState(false)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [localLevel, setLocalLevel] = useState(0)
  const [remoteLevel, setRemoteLevel] = useState(0)
  const [cameraEnabled, setCameraEnabled] = useState(true)
  const [remoteCameraOn, setRemoteCameraOn] = useState(true)
  const socketRef = useRef<Socket | null>(null)
  const peerRef = useRef<RTCPeerConnection | null>(null)
  const localVideoRef = useRef<HTMLVideoElement | null>(null)
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null)
  const remoteMiniRef = useRef<HTMLVideoElement | null>(null)
  const localAudioCtxRef = useRef<AudioContext | null>(null)
  const remoteAudioCtxRef = useRef<AudioContext | null>(null)
  const localRafRef = useRef<number | null>(null)
  const remoteRafRef = useRef<number | null>(null)
  const cameraEnabledRef = useRef(cameraEnabled)
  const localPreviewRef = useRef<MediaStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const ringtoneRef = useRef<{ stop: () => void } | null>(null)
  const typingTimeoutRef = useRef<number | null>(null)
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const callStateRef = useRef(callState)
  const chatSearchRef = useRef<HTMLDivElement | null>(null)
  const activeIdRef = useRef<string | null>(null)
  const userRef = useRef<User | null>(null)
  const iceServersRef = useRef<RTCIceServer[] | null>(null)

  const authHeader = useMemo(
    () => ({ Authorization: `Bearer ${token}` }),
    [token]
  )

  const truncateText = (value: string, max=30) =>
    value.length > max ? `${value.slice(0, max)}…` : value;

  useEffect(() => {
    callStateRef.current = callState
  }, [callState])

  useEffect(() => {
    cameraEnabledRef.current = cameraEnabled
  }, [cameraEnabled])

  useEffect(() => {
    activeIdRef.current = activeId
  }, [activeId])

  useEffect(() => {
    userRef.current = user
  }, [user])

  useEffect(() => {
    const raw = localStorage.getItem('chatapp_prefs')
    if (!raw) return
    try {
      const prefs = JSON.parse(raw)
      if (prefs.theme === 'dark' || prefs.theme === 'light') {
        setTheme(prefs.theme)
      }
      if (typeof prefs.ringtoneEnabled === 'boolean') {
        setRingtoneEnabled(prefs.ringtoneEnabled)
      }
      if (typeof prefs.ringtoneVolume === 'number') {
        setRingtoneVolume(prefs.ringtoneVolume)
      }
      if (typeof prefs.ringtoneChoice === 'string') {
        setRingtoneChoice(prefs.ringtoneChoice)
      }
      if (typeof prefs.pingEnabled === 'boolean') {
        setPingEnabled(prefs.pingEnabled)
      }
      if (typeof prefs.pingVolume === 'number') {
        setPingVolume(prefs.pingVolume)
      }
      if (typeof prefs.pingChoice === 'string') {
        setPingChoice(prefs.pingChoice)
      }
    } catch {
      // Ignore invalid prefs.
    }
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const verified = params.get('verified')
    if (verified === 'success' || verified === 'error') {
      setVerificationStatus(verified)
      setAuthMode('login')
      setVerificationSent(false)
      params.delete('verified')
      const next = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`
      window.history.replaceState({}, '', next)
    }
    const reset = params.get('reset')
    if (reset) {
      if (reset === 'error') {
        setResetNotice('Reset link is invalid or expired.')
        setResetMode('request')
      } else {
        setResetToken(reset)
        setResetMode('reset')
      }
      setAuthMode('login')
      setVerificationSent(false)
      params.delete('reset')
      const next = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`
      window.history.replaceState({}, '', next)
    }
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  useEffect(() => {
    if (user?.id) {
      setOnlineUsers((prev) => ({ ...prev, [user.id]: true }))
    }
  }, [user?.id])

  useEffect(() => {
    localStorage.setItem(
      'chatapp_prefs',
      JSON.stringify({
        theme,
        ringtoneEnabled,
        ringtoneVolume,
        ringtoneChoice,
        pingEnabled,
        pingVolume,
        pingChoice,
      })
    )
  }, [
    theme,
    ringtoneEnabled,
    ringtoneVolume,
    ringtoneChoice,
    pingEnabled,
    pingVolume,
    pingChoice,
  ])

  useEffect(() => {
    const bootstrap = async () => {
      if (!token) {
        setLoading(false)
        return
      }
      try {
        const me = await fetchJson('/api/users/me', {
          headers: authHeader,
        })
        setUser(me.user)
      } catch {
        clearToken()
        setAuthToken('')
      } finally {
        setLoading(false)
      }
    }
    bootstrap()
  }, [token, authHeader])

  const fetchConversations = async () => {
    if (!token) return
    const data = await fetchJson('/api/conversations', {
      headers: authHeader,
    })
    setConversations(data.conversations)
    if (socketRef.current) {
      data.conversations.forEach((conversation: Conversation) => {
        socketRef.current?.emit('conversation:join', conversation.id)
      })
    }
    if (!activeId && data.conversations.length > 0) {
      setActiveId(data.conversations[0].id)
    }
  }

  useEffect(() => {
    if (!token) return
    fetchConversations()
  }, [token, activeId])

  useEffect(() => {
    if (!token || !activeId) {
      setMessages([])
      return
    }
    const loadMessages = async () => {
      const data = await fetchJson(`/api/conversations/${activeId}/messages`, {
        headers: authHeader,
      })
      setMessages(data.messages.map(mapMessage))
    }
    loadMessages()
  }, [token, activeId, authHeader])

  useEffect(() => {
    if (!token) return
    const socket = io(API_BASE, { auth: { token } })
    socketRef.current = socket

    socket.on('message:new', (payload) => {
      const message = mapMessage(payload)
      if (message.conversationId === activeIdRef.current) {
        setMessages((prev) =>
          prev.some((item) => item.id === message.id) ? prev : [...prev, message]
        )
        if (message.senderId !== userRef.current?.id) {
          markConversationRead(message.conversationId)
        }
      }
      setConversations((prev) =>
        prev.map((chat) =>
          chat.id === message.conversationId
            ? {
                ...chat,
                last_message: {
                  id: message.id,
                  sender_id: message.senderId,
                  type: message.type,
                  text: message.text,
                  created_at: message.createdAt,
                },
              }
            : chat
        )
      )
      if (message.senderId !== userRef.current?.id) {
        playPing()
      }
    })

    socket.on('message:read', (payload) => {
      if (!payload?.messageIds?.length) return
      setMessages((prev) =>
        prev.map((message) =>
          payload.messageIds.includes(message.id)
            ? {
                ...message,
                readBy: message.readBy.includes(payload.userId)
                  ? message.readBy
                  : [...message.readBy, payload.userId],
                readAt: payload.readAt ?? message.readAt,
              }
            : message
        )
      )
    })

    socket.on('conversation:refresh', () => {
      fetchConversations()
    })

    socket.on('presence:state', (payload) => {
      if (!payload?.online) return
      const state: Record<string, boolean> = {}
      payload.online.forEach((id: string) => {
        state[id] = true
      })
      setOnlineUsers((prev) => ({ ...prev, ...state }))
    })

    socket.on('presence:update', (payload) => {
      setOnlineUsers((prev) => ({ ...prev, [payload.userId]: payload.online }))
    })

    socket.on('call:offer', (payload) => {
      if (payload.conversationId) {
        setActiveId(payload.conversationId)
      }
      if (payload.mode === 'video') {
        setCameraEnabled(true)
        setRemoteCameraOn(true)
      }
      setCallState({
        status: 'incoming',
        mode: payload.mode,
        offer: payload.sdp,
        conversationId: payload.conversationId,
      })
    })

    socket.on('typing:start', (payload) => {
      if (payload.conversationId !== activeIdRef.current) return
      setTypingUsers((prev) =>
        prev.includes(payload.userId) ? prev : [...prev, payload.userId]
      )
    })

    socket.on('typing:stop', (payload) => {
      if (payload.conversationId !== activeIdRef.current) return
      setTypingUsers((prev) => prev.filter((id) => id !== payload.userId))
    })

    socket.on('call:answer', async (payload) => {
      if (!callStateRef.current.conversationId) return
      if (payload.conversationId !== callStateRef.current.conversationId) return
      if (peerRef.current && payload.sdp) {
        await peerRef.current.setRemoteDescription(payload.sdp)
        setCallState((prev) => ({ ...prev, status: 'in-call' }))
      }
    })

    socket.on('call:camera', (payload) => {
      if (!callStateRef.current.conversationId) return
      if (payload.conversationId !== callStateRef.current.conversationId) return
      setRemoteCameraOn(Boolean(payload.enabled))
    })

    socket.on('call:ice', async (payload) => {
      if (!callStateRef.current.conversationId) return
      if (payload.conversationId !== callStateRef.current.conversationId) return
      if (peerRef.current && payload.candidate) {
        try {
          await peerRef.current.addIceCandidate(payload.candidate)
        } catch {
          // Ignore invalid ICE during teardown.
        }
      }
    })

    socket.on('call:end', () => {
      endCall()
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [token])

  useEffect(() => {
    if (!friendsOpen) return
    const delay = setTimeout(() => {
      searchUsers(searchQuery)
    }, 300)
    return () => clearTimeout(delay)
  }, [searchQuery, friendsOpen])

  useEffect(() => {
    if (!groupManageOpen) {
      setManageMembers([])
    }
  }, [groupManageOpen])

  const chatSearchMatches = useMemo(() => {
    const query = chatSearchQuery.trim().toLowerCase()
    if (!query) return []
    return messages
      .filter((message) => (message.text || '').toLowerCase().includes(query))
      .map((message) => message.id)
  }, [chatSearchQuery, messages])

  const highlightText = (text: string, query: string, isActive: boolean) => {
    if (!query) return text
    const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const parts = text.split(new RegExp(`(${safeQuery})`, 'ig'))
    return parts.map((part, index) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark
          key={`${part}-${index}`}
          className={
            isActive
              ? 'rounded bg-yellow-300/90 px-1 text-slate-900'
              : 'rounded bg-violet-300/70 px-1 text-slate-900 dark:text-white'
          }
        >
          {part}
        </mark>
      ) : (
        part
      )
    )
  }

  useEffect(() => {
    if (!avatarPreview) return
    return () => URL.revokeObjectURL(avatarPreview)
  }, [avatarPreview])

  useEffect(() => {
    setTypingUsers([])
  }, [activeId])

  useEffect(() => {
    if (!chatSearchQuery) {
      setChatSearchIndex(0)
    }
  }, [chatSearchQuery])

  useEffect(() => {
    if (!remoteStream) return
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream
    }
    if (remoteMiniRef.current) {
      remoteMiniRef.current.srcObject = remoteStream
    }
  }, [remoteStream])

  const startLocalPreview = async () => {
    if (localPreviewRef.current) return
    const previewStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false,
    })
    localPreviewRef.current = previewStream
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = previewStream
      localVideoRef.current.play().catch(() => {})
    }
  }

  const stopLocalPreview = () => {
    if (localPreviewRef.current) {
      localPreviewRef.current.getTracks().forEach((track) => track.stop())
      localPreviewRef.current = null
    }
    if (localVideoRef.current && !localStreamRef.current) {
      localVideoRef.current.srcObject = null
    }
  }

  const startAudioMeter = (
    stream: MediaStream,
    setLevel: (value: number) => void,
    ctxRef: React.MutableRefObject<AudioContext | null>,
    rafRef: React.MutableRefObject<number | null>
  ) => {
    if (stream.getAudioTracks().length === 0) {
      setLevel(0)
      return
    }
    const AudioContextImpl = window.AudioContext || (window as any).webkitAudioContext
    const audioContext = new AudioContextImpl()
    ctxRef.current = audioContext
    const analyser = audioContext.createAnalyser()
    analyser.fftSize = 256
    const source = audioContext.createMediaStreamSource(stream)
    source.connect(analyser)
    const data = new Uint8Array(analyser.frequencyBinCount)
    const tick = () => {
      analyser.getByteTimeDomainData(data)
      let sum = 0
      for (let i = 0; i < data.length; i += 1) {
        const value = (data[i] - 128) / 128
        sum += value * value
      }
      const rms = Math.sqrt(sum / data.length)
      setLevel(Math.min(1, rms * 2.5))
      rafRef.current = window.requestAnimationFrame(tick)
    }
    tick()
  }

  const stopAudioMeter = (
    ctxRef: React.MutableRefObject<AudioContext | null>,
    rafRef: React.MutableRefObject<number | null>,
    setLevel: (value: number) => void
  ) => {
    if (rafRef.current) {
      window.cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    if (ctxRef.current) {
      ctxRef.current.close().catch(() => {})
      ctxRef.current = null
    }
    setLevel(0)
  }

  useEffect(() => {
    if (!localStream) return
    startAudioMeter(localStream, setLocalLevel, localAudioCtxRef, localRafRef)
    return () => stopAudioMeter(localAudioCtxRef, localRafRef, setLocalLevel)
  }, [localStream])

  useEffect(() => {
    if (!localStream || !cameraEnabled) return
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStream
      localVideoRef.current.play().catch(() => {})
    }
  }, [localStream, cameraEnabled])

  useEffect(() => {
    if (!remoteStream) return
    startAudioMeter(remoteStream, setRemoteLevel, remoteAudioCtxRef, remoteRafRef)
    return () => stopAudioMeter(remoteAudioCtxRef, remoteRafRef, setRemoteLevel)
  }, [remoteStream])

  useEffect(() => {
    if (!remoteStream) return
    const videoTracks = remoteStream.getVideoTracks()
    if (videoTracks.length === 0) {
      setRemoteCameraOn(false)
      return
    }
    const track = videoTracks[0]
    const handleMute = () => setRemoteCameraOn(false)
    const handleUnmute = () => setRemoteCameraOn(true)
    track.addEventListener('mute', handleMute)
    track.addEventListener('unmute', handleUnmute)
    setRemoteCameraOn(!track.muted)
    return () => {
      track.removeEventListener('mute', handleMute)
      track.removeEventListener('unmute', handleUnmute)
    }
  }, [remoteStream])

  useEffect(() => {
    if (callState.status !== 'incoming' || callState.mode !== 'video') {
      stopLocalPreview()
      return
    }
    if (cameraEnabled) {
      startLocalPreview().catch(() => {})
    } else {
      stopLocalPreview()
    }
  }, [callState.status, callState.mode, cameraEnabled])

  useEffect(() => {
    if (!chatSearchOpen) return
    const handleClick = (event: MouseEvent) => {
      if (!chatSearchRef.current) return
      if (!chatSearchRef.current.contains(event.target as Node)) {
        setChatSearchOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [chatSearchOpen])

  useEffect(() => {
    if (view !== 'chat') return
    if (typeof window === 'undefined') return
    const media = window.matchMedia('(max-width: 767px)')
    const applyState = () => {
      setMobileChatsOpen(media.matches)
    }
    applyState()
    media.addEventListener('change', applyState)
    return () => media.removeEventListener('change', applyState)
  }, [view])

  useEffect(() => {
    if (!chatSearchMatches.length) return
    const targetId = chatSearchMatches[chatSearchIndex]
    const node = messageRefs.current[targetId]
    if (node) {
      node.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [chatSearchIndex, chatSearchMatches])

  const activeConversation = useMemo(
    () => conversations.find((item) => item.id === activeId) || null,
    [conversations, activeId]
  )

  const filteredConversations = useMemo(() => {
    const query = chatSearch.trim().toLowerCase()
    if (!query) return conversations
    return conversations.filter((chat) => {
      const name =
        chat.type === 'group'
          ? chat.name || 'group'
          : chat.members.find((m) => m.id !== user?.id)?.displayName || ''
      const lastText = chat.last_message?.text || ''
      return (
        name.toLowerCase().includes(query) ||
        lastText.toLowerCase().includes(query)
      )
    })
  }, [chatSearch, conversations, user])

  const groupedConversations = useMemo(() => {
    const groups: { label: string; items: Conversation[] }[] = []
    const today = new Date()
    const startOfToday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    )
    const startOfYesterday = new Date(startOfToday)
    startOfYesterday.setDate(startOfYesterday.getDate() - 1)

    const getLabel = (dateValue?: string | null) => {
      if (!dateValue) return 'No messages'
      const date = new Date(dateValue)
      if (date >= startOfToday) return 'Today'
      if (date >= startOfYesterday) return 'Yesterday'
      return date.toLocaleDateString([], {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
      })
    }

    filteredConversations.forEach((conversation) => {
      const label = getLabel(conversation.last_message?.created_at)
      const existing = groups.find((group) => group.label === label)
      if (existing) {
        existing.items.push(conversation)
      } else {
        groups.push({ label, items: [conversation] })
      }
    })
    return groups
  }, [filteredConversations])

  const groupedMessages = useMemo(() => {
    const groups: { label: string; items: Message[] }[] = []
    const today = new Date()
    const startOfToday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    )
    const startOfYesterday = new Date(startOfToday)
    startOfYesterday.setDate(startOfYesterday.getDate() - 1)

    const getLabel = (dateValue: string) => {
      const date = new Date(dateValue)
      if (date >= startOfToday) return 'Today'
      if (date >= startOfYesterday) return 'Yesterday'
      return date.toLocaleDateString([], {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
      })
    }

    messages.forEach((message) => {
      const label = getLabel(message.createdAt)
      const existing = groups.find((group) => group.label === label)
      if (existing) {
        existing.items.push(message)
      } else {
        groups.push({ label, items: [message] })
      }
    })
    return groups
  }, [messages])

  const activeName = useMemo(() => {
    if (!activeConversation || !user) return 'Select a chat'
    if (activeConversation.type === 'group') return activeConversation.name || 'Group'
    const other = activeConversation.members.find((m) => m.id !== user.id)
    return other?.displayName || 'Direct chat'
  }, [activeConversation, user])

  const canCall = activeConversation?.type === 'direct'
  const otherMemberId = useMemo(() => {
    if (!activeConversation || !user || activeConversation.type !== 'direct') {
      return null
    }
    return activeConversation.members.find((m) => m.id !== user.id)?.id ?? null
  }, [activeConversation, user])
  const activeAvatarSrc = useMemo(() => {
    if (!activeConversation || activeConversation.type !== 'direct') return ''
    const member = activeConversation.members.find((m) => m.id !== user?.id)
    return getAvatarSrc(member)
  }, [activeConversation, user])

  const activeSubtitle = useMemo(() => {
    if (!activeConversation) return 'No chat selected'
    if (typingUsers.length > 0) {
      const names = typingUsers
        .map((id) => activeConversation.members.find((m) => m.id === id))
        .filter(Boolean)
        .map((m) => m!.displayName)
      return `${names.join(', ')} typing...`
    }
    if (activeConversation.type === 'direct') {
      const other = activeConversation.members.find((m) => m.id !== user?.id)
      if (!other) return 'Offline'
      return onlineUsers[other.id] ? 'Online' : 'Offline'
    }
    const onlineCount = activeConversation.members.filter(
      (member) => onlineUsers[member.id]
    ).length
    return `${onlineCount} online`
  }, [activeConversation, typingUsers, onlineUsers, user])

  const handleAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setAuthError('')
    setAuthLoading(true)
    const form = new FormData(event.currentTarget)
    const email = String(form.get('email') || '').trim()
    const password = String(form.get('password') || '')
    const confirmPassword = String(form.get('confirmPassword') || '')
    const displayName = String(form.get('displayName') || '').trim()
    const passwordRule = /^(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}$/
    if (authMode === 'register') {
      if (password !== confirmPassword) {
        setAuthError('Passwords do not match')
        setAuthLoading(false)
        return
      }
      if (!passwordRule.test(password)) {
        setAuthError(
          'Password must be 8+ characters with at least 1 number and 1 special character'
        )
        setAuthLoading(false)
        return
      }
    }
    try {
      const data = await fetchJson(
        authMode === 'login' ? '/api/auth/login' : '/api/auth/register',
        {
          method: 'POST',
          body: JSON.stringify(
            authMode === 'login'
              ? { email, password }
              : { email, password, displayName }
          ),
        }
      )
      if (authMode === 'register') {
        setVerificationSent(true)
        setAuthMode('login')
        setAuthLoading(false)
        return
      }
      setToken(data.token)
      setAuthToken(data.token)
      setUser(data.user)
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Auth failed')
    } finally {
      setAuthLoading(false)
    }
  }

  const handleForgotPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setAuthError('')
    setResetNotice('')
    setAuthLoading(true)
    const form = new FormData(event.currentTarget)
    const email = String(form.get('email') || '').trim()
    try {
      await fetchJson('/api/auth/forgot', {
        method: 'POST',
        body: JSON.stringify({ email }),
      })
      setResetNotice('If an account exists, a reset link has been sent.')
      setResetMode('request')
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Request failed')
    } finally {
      setAuthLoading(false)
    }
  }

  const handleResetPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setAuthError('')
    setResetNotice('')
    const form = new FormData(event.currentTarget)
    const password = String(form.get('password') || '')
    const confirmPassword = String(form.get('confirmPassword') || '')
    const passwordRule = /^(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}$/
    if (password !== confirmPassword) {
      setAuthError('Passwords do not match')
      return
    }
    if (!passwordRule.test(password)) {
      setAuthError(
        'Password must be 8+ characters with at least 1 number and 1 special character'
      )
      return
    }
    setAuthLoading(true)
    try {
      await fetchJson('/api/auth/reset', {
        method: 'POST',
        body: JSON.stringify({ token: resetToken, password }),
      })
      setResetNotice('Password reset successfully. Please sign in.')
      setResetMode('')
      setResetToken('')
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Reset failed')
    } finally {
      setAuthLoading(false)
    }
  }

  const loadFriends = async () => {
    if (!token) return
    const data = await fetchJson('/api/friends', { headers: authHeader })
    const unique = new Map<string, User>()
    data.friends.forEach((friend: User) => unique.set(friend.id, friend))
    setFriends([...unique.values()])
  }

  const loadRequests = async () => {
    if (!token) return
    const data = await fetchJson('/api/friends/requests', { headers: authHeader })
    setIncomingRequests(data.incoming)
    setOutgoingRequests(data.outgoing)
  }

  const searchUsers = async (query: string) => {
    if (!token) return
    const data = await fetchJson(`/api/users/search?q=${encodeURIComponent(query)}`, {
      headers: authHeader,
    })
    const unique = new Map<string, User>()
    data.users.forEach((item: User) => unique.set(item.id, item))
    setSearchResults([...unique.values()])
  }

  const createDirectChat = async (userId: string) => {
    if (!token) return
    const data = await fetchJson('/api/conversations', {
      method: 'POST',
      headers: authHeader,
      body: JSON.stringify({ type: 'direct', memberIds: [userId] }),
    })
    await fetchConversations()
    if (data.conversation?.id) {
      setActiveId(data.conversation.id)
      socketRef.current?.emit('conversation:join', data.conversation.id)
    }
    setFriendsOpen(false)
  }

  const createGroup = async () => {
    if (!token || !groupName.trim()) return
    const data = await fetchJson('/api/conversations', {
      method: 'POST',
      headers: authHeader,
      body: JSON.stringify({
        type: 'group',
        name: groupName.trim(),
        memberIds: selectedMembers,
      }),
    })
    await fetchConversations()
    socketRef.current?.emit('conversation:join', data.conversation.id)
    setActiveId(data.conversation.id)
    setGroupName('')
    setSelectedMembers([])
    setGroupOpen(false)
  }

  const addMembersToGroup = async () => {
    if (!token || !activeConversation || activeConversation.type !== 'group') return
    if (manageMembers.length === 0) return
    await fetchJson(`/api/conversations/${activeConversation.id}/members`, {
      method: 'POST',
      headers: authHeader,
      body: JSON.stringify({ memberIds: manageMembers }),
    })
    await fetchConversations()
    setManageMembers([])
  }

  const removeMemberFromGroup = async (memberId: string) => {
    if (!token || !activeConversation || activeConversation.type !== 'group') return
    await fetchJson(
      `/api/conversations/${activeConversation.id}/members/${memberId}`,
      {
        method: 'DELETE',
        headers: authHeader,
      }
    )
    await fetchConversations()
  }

  const sendFriendRequest = async (userId: string) => {
    if (!token) return
    await fetchJson('/api/friends/request', {
      method: 'POST',
      headers: authHeader,
      body: JSON.stringify({ toUserId: userId }),
    })
    await loadRequests()
  }

  const acceptFriend = async (requestId: string) => {
    if (!token) return
    await fetchJson('/api/friends/accept', {
      method: 'POST',
      headers: authHeader,
      body: JSON.stringify({ requestId }),
    })
    await loadFriends()
    await loadRequests()
  }

  const rejectFriend = async (requestId: string) => {
    if (!token) return
    await fetchJson('/api/friends/reject', {
      method: 'POST',
      headers: authHeader,
      body: JSON.stringify({ requestId }),
    })
    await loadRequests()
  }

  const updateProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!user) return
    const form = new FormData(event.currentTarget)
    const displayName = String(form.get('displayName') || '').trim()
    const email = String(form.get('email') || '').trim()
    const data = await fetchJson('/api/users/me', {
      method: 'PATCH',
      headers: authHeader,
      body: JSON.stringify({ displayName, email }),
    })
    setUser(data.user)
  }

  const updatePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const currentPassword = String(form.get('currentPassword') || '')
    const newPassword = String(form.get('newPassword') || '')
    await fetchJson('/api/users/password', {
      method: 'PATCH',
      headers: authHeader,
      body: JSON.stringify({ currentPassword, newPassword }),
    })
    event.currentTarget.reset()
  }

  const markConversationRead = async (conversationId: string) => {
    if (!token) return
    try {
      await fetchJson(`/api/conversations/${conversationId}/read`, {
        method: 'POST',
        headers: authHeader,
      })
    } catch {
      // Ignore read errors for now.
    }
  }

  const handleTyping = (value: string) => {
    setMessageText(value)
    if (!activeId || !socketRef.current) return
    socketRef.current.emit('typing:start', { conversationId: activeId })
    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current)
    }
    typingTimeoutRef.current = window.setTimeout(() => {
      socketRef.current?.emit('typing:stop', { conversationId: activeId })
    }, 800)
  }

  const sendMessage = async () => {
    if (!messageText.trim() || !activeId || !token) return
    const text = messageText.trim()
    setMessageText('')
    socketRef.current?.emit('typing:stop', { conversationId: activeId })
    const data = await fetchJson(`/api/conversations/${activeId}/messages`, {
      method: 'POST',
      headers: authHeader,
      body: JSON.stringify({ text }),
    })
    const message = mapMessage(data.message)
    setMessages((prev) =>
      prev.some((item) => item.id === message.id) ? prev : [...prev, message]
    )
    setConversations((prev) =>
      prev.map((chat) =>
        chat.id === message.conversationId
          ? {
              ...chat,
              last_message: {
                id: message.id,
                sender_id: message.senderId,
                type: message.type,
                text: message.text,
                created_at: message.createdAt,
              },
            }
          : chat
      )
    )
  }

  const downloadFile = async (fileId: string, name: string) => {
    if (!token) return
    const response = await fetch(`${API_BASE}/api/files/${fileId}`, {
      headers: authHeader,
    })
    if (!response.ok) return
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = name
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!token || !activeId || !event.target.files?.[0]) return
    const file = event.target.files[0]
    setUploadFileName(file.name)
    setUploadProgress(0)
    const form = new FormData()
    form.append('file', file)
    await new Promise<void>((resolve) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', `${API_BASE}/api/conversations/${activeId}/files`)
      xhr.setRequestHeader('Authorization', `Bearer ${token}`)
      xhr.upload.onprogress = (progressEvent) => {
        if (progressEvent.lengthComputable) {
          const percent = Math.round(
            (progressEvent.loaded / progressEvent.total) * 100
          )
          setUploadProgress(percent)
        }
      }
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const data = JSON.parse(xhr.responseText)
          const message = mapMessage(data.message)
          setMessages((prev) =>
            prev.some((item) => item.id === message.id)
              ? prev
              : [...prev, message]
          )
        }
        resolve()
      }
      xhr.onerror = () => resolve()
      xhr.send(form)
    })
    setUploadProgress(null)
    setUploadFileName('')
    event.target.value = ''
  }

  const handleAvatarSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarName(file.name)
    setAvatarPreview(URL.createObjectURL(file))
    event.target.value = ''
  }

  const handleAvatarUpload = async () => {
    if (!token || !avatarFile) return
    const form = new FormData()
    form.append('avatar', avatarFile)
    const response = await fetch(`${API_BASE}/api/users/avatar`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    })
    if (response.ok) {
      const data = await response.json()
      setUser(data.user)
    }
    setAvatarFile(null)
    setAvatarName('')
    setAvatarPreview('')
  }

  const startRingtone = () => {
    if (!ringtoneEnabled || ringtoneRef.current) return
    const audioContext = new AudioContext()
    const gain = audioContext.createGain()
    const oscillator = audioContext.createOscillator()
    oscillator.type = 'sine'
    gain.gain.value = 0
    oscillator.connect(gain)
    gain.connect(audioContext.destination)
    oscillator.start()
    let on = false
    const freqs: Record<string, number> = {
      nebula: 820,
      aurora: 660,
      pulse: 740,
      orbit: 900,
      dusk: 520,
    }
    oscillator.frequency.value = freqs[ringtoneChoice] || 820
    const interval = setInterval(() => {
      on = !on
      gain.gain.value = on ? ringtoneVolume : 0
    }, 450)
    ringtoneRef.current = {
      stop: () => {
        clearInterval(interval)
        oscillator.stop()
        audioContext.close()
        ringtoneRef.current = null
      },
    }
  }

  const stopRingtone = () => {
    ringtoneRef.current?.stop()
  }

  const playPing = () => {
    if (!pingEnabled) return
    const audioContext = new AudioContext()
    const oscillator = audioContext.createOscillator()
    const gain = audioContext.createGain()
    const freqs: Record<string, number> = {
      spark: 880,
      pulse: 720,
      echo: 600,
      nova: 980,
      drift: 520,
    }
    oscillator.type = 'sine'
    oscillator.frequency.value = freqs[pingChoice] || 880
    gain.gain.value = pingVolume
    oscillator.connect(gain)
    gain.connect(audioContext.destination)
    oscillator.start()
    setTimeout(() => {
      oscillator.stop()
      audioContext.close()
    }, 160)
  }

  useEffect(() => {
    if (callState.status === 'incoming') {
      stopRingtone()
      startRingtone()
    } else {
      stopRingtone()
    }
  }, [callState.status, ringtoneEnabled, ringtoneVolume, ringtoneChoice])

  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current
    }
  }, [callState.status])

  useEffect(() => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = speakerMuted
    }
  }, [speakerMuted])

  const toggleMic = () => {
    setMicMuted((prev) => {
      const next = !prev
      localStreamRef.current?.getAudioTracks().forEach((track) => {
        track.enabled = !next
      })
      return next
    })
  }

  const toggleSpeaker = () => {
    setSpeakerMuted((prev) => !prev)
  }

  const setupPeerConnection = async (conversationId: string, mode: 'video' | 'voice') => {
    if (!iceServersRef.current) {
      try {
        const response = await fetchJson('/api/turn')
        iceServersRef.current = response.iceServers || [
          { urls: 'stun:stun.l.google.com:19302' },
        ]
      } catch {
        iceServersRef.current = [{ urls: 'stun:stun.l.google.com:19302' }]
      }
    }
    const peer = new RTCPeerConnection({
      iceServers: iceServersRef.current,
    })
    peerRef.current = peer
    peer.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current?.emit('call:ice', {
          conversationId,
          candidate: event.candidate,
        })
      }
    }
    peer.ontrack = (event) => {
      setRemoteStream(event.streams[0])
    }
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: mode === 'video',
    })
    localStreamRef.current = stream
    setLocalStream(stream)
    if (mode === 'video' && !cameraEnabledRef.current) {
      stream.getVideoTracks().forEach((track) => {
        track.enabled = false
      })
    }
    stream.getTracks().forEach((track) => peer.addTrack(track, stream))
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream
    }
    return peer
  }

  const startCall = async (mode: 'video' | 'voice') => {
    if (!activeConversation || activeConversation.type !== 'direct' || !socketRef.current) {
      return
    }
    setCameraEnabled(mode === 'video')
    setRemoteCameraOn(true)
    setCallMinimized(false)
    setRemoteVideoReady(false)
    setMicMuted(false)
    setSpeakerMuted(false)
    const conversationId = activeConversation.id
    const peer = await setupPeerConnection(conversationId, mode)
    const offer = await peer.createOffer()
    await peer.setLocalDescription(offer)
    socketRef.current.emit('call:offer', {
      conversationId,
      sdp: offer,
      mode,
    })
    setCallState({ status: 'calling', mode, conversationId })
  }

  const acceptCall = async () => {
    if (!callState.offer || !callState.conversationId) return
    stopLocalPreview()
    setCameraEnabled(callState.mode === 'video')
    setRemoteCameraOn(true)
    setCallMinimized(false)
    setRemoteVideoReady(false)
    const peer = await setupPeerConnection(callState.conversationId, callState.mode)
    await peer.setRemoteDescription(callState.offer)
    const answer = await peer.createAnswer()
    await peer.setLocalDescription(answer)
    socketRef.current?.emit('call:answer', {
      conversationId: callState.conversationId,
      sdp: answer,
    })
    setCallState((prev) => ({ ...prev, status: 'in-call' }))
  }

  const endCall = () => {
    stopRingtone()
    if (callStateRef.current.conversationId) {
      socketRef.current?.emit('call:end', {
        conversationId: callStateRef.current.conversationId,
      })
    }
    if (peerRef.current) {
      peerRef.current.getSenders().forEach((sender) => sender.track?.stop())
      peerRef.current.close()
      peerRef.current = null
    }
    localStreamRef.current?.getTracks().forEach((track) => track.stop())
    localStreamRef.current = null
    setLocalStream(null)
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null
    }
    if (remoteMiniRef.current) {
      remoteMiniRef.current.srcObject = null
    }
    setRemoteStream(null)
    setRemoteCameraOn(true)
    stopLocalPreview()
    setMicMuted(false)
    setSpeakerMuted(false)
    setRemoteVideoReady(false)
    setCallMinimized(false)
    setCameraEnabled(true)
    setCallState({ status: 'idle', mode: callStateRef.current.mode })
  }

  const toggleCamera = async () => {
    if (callState.mode !== 'video') return
    if (localStreamRef.current) {
      const next = !cameraEnabled
      setCameraEnabled(next)
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = next
      })
      if (callStateRef.current.conversationId) {
        socketRef.current?.emit('call:camera', {
          conversationId: callStateRef.current.conversationId,
          enabled: next,
        })
      }
      return
    }
    const next = !cameraEnabled
    setCameraEnabled(next)
    if (callStateRef.current.conversationId) {
      socketRef.current?.emit('call:camera', {
        conversationId: callStateRef.current.conversationId,
        enabled: next,
      })
    }
    if (next) {
      await startLocalPreview()
    } else {
      stopLocalPreview()
    }
  }

  const friendIdSet = useMemo(() => new Set(friends.map((item) => item.id)), [friends])
  const outgoingSet = useMemo(
    () => new Set(outgoingRequests.map((item) => item.user.id)),
    [outgoingRequests]
  )
  if (loading) {
    return <div className="grid min-h-screen place-items-center">Loading...</div>
  }

  if (!token || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        {verificationSent ? (
          <div className="w-full max-w-md space-y-6 rounded-2xl glass p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/10">
              <Mail size={22} />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-semibold">Check your inbox</h1>
              <p className="text-sm text-muted-foreground">
                We have sent a verification email.
              </p>
            </div>
            <Button
              onClick={() => {
                setVerificationSent(false)
                setAuthMode('login')
              }}
            >
              Go to login
            </Button>
          </div>
        ) : resetMode === 'request' ? (
          <form
            className="w-full max-w-md space-y-6 rounded-2xl glass p-8"
            onSubmit={handleForgotPassword}
          >
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold">Reset password</h1>
              <p className="text-sm text-muted-foreground">
                Enter your email and we'll send a reset link.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input name="email" type="email" required />
            </div>
            {authError ? (
              <div className="rounded-md bg-red-500/10 p-3 text-sm text-red-400">
                {authError}
              </div>
            ) : null}
            {resetNotice ? (
              <div className="rounded-md bg-emerald-500/10 p-3 text-sm text-emerald-200">
                {resetNotice}
              </div>
            ) : null}
            <Button type="submit" className="w-full" disabled={authLoading}>
              {authLoading ? 'Sending...' : 'Send reset link'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              disabled={authLoading}
              onClick={() => setResetMode('')}
            >
              Back to login
            </Button>
          </form>
        ) : resetMode === 'reset' ? (
          <form
            className="w-full max-w-md space-y-6 rounded-2xl glass p-8"
            onSubmit={handleResetPassword}
          >
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold">Set a new password</h1>
              <p className="text-sm text-muted-foreground">
                Use a strong password to secure your account.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <div className="relative">
                <Input
                  name="password"
                  type={showResetPassword ? 'text' : 'password'}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setShowResetPassword((prev) => !prev)}
                  title={showResetPassword ? 'Hide password' : 'Show password'}
                >
                  {showResetPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Confirm password</Label>
              <div className="relative">
                <Input
                  name="confirmPassword"
                  type={showResetConfirmPassword ? 'text' : 'password'}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setShowResetConfirmPassword((prev) => !prev)}
                  title={showResetConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showResetConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            {authError ? (
              <div className="rounded-md bg-red-500/10 p-3 text-sm text-red-400">
                {authError}
              </div>
            ) : null}
            <Button type="submit" className="w-full" disabled={authLoading}>
              {authLoading ? 'Resetting...' : 'Reset password'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              disabled={authLoading}
              onClick={() => setResetMode('')}
            >
              Back to login
            </Button>
          </form>
        ) : (
          <form
            className="w-full max-w-md space-y-6 rounded-2xl glass p-8"
            onSubmit={handleAuth}
          >
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold">ChatApp</h1>
              <p className="text-sm text-muted-foreground">
                Secure messages that disappear after 7 days.
              </p>
            </div>
            {authMode === 'register' ? (
              <div className="space-y-2">
                <Label>Display name</Label>
                <Input name="displayName" required />
              </div>
            ) : null}
            <div className="space-y-2">
              <Label>Email</Label>
              <Input name="email" type="email" required />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                Password
                {authMode === 'register' ? (
                  <span className="group relative inline-flex items-center">
                    <Info size={14} className="text-muted-foreground" />
                    <span className="pointer-events-none absolute bottom-full left-1/2 hidden -translate-x-1/2 -translate-y-2 whitespace-nowrap rounded-sm bg-black px-2 py-2 text-xs text-white shadow-md group-hover:block">
                      Password should consist of 8 characters with at least 1 number and 1 special character.
                    </span>
                    <span className="pointer-events-none absolute bottom-full left-1/2 hidden -translate-x-1/2 -translate-y-1 h-0 w-0 border-x-4 border-t-4 border-x-transparent border-t-black group-hover:block" />
                  </span>
                ) : null}
              </Label>
              <div className="relative">
                <Input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setShowPassword((prev) => !prev)}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            {authMode === 'register' ? (
              <div className="space-y-2">
                <Label>Confirm password</Label>
                <div className="relative">
                  <Input
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    title={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            ) : null}
            {authError ? (
              <div className="rounded-md bg-red-500/10 p-3 text-sm text-red-400">
                {authError}
              </div>
            ) : null}
            {verificationStatus === 'success' ? (
              <div className="rounded-md bg-emerald-500/10 p-3 text-sm text-emerald-200">
                Email verified! You can sign in now.
              </div>
            ) : null}
            {verificationStatus === 'error' ? (
              <div className="rounded-md bg-red-500/10 p-3 text-sm text-red-400">
                Verification link is invalid or expired. Please request a new one.
              </div>
            ) : null}
            <Button type="submit" className="w-full" disabled={authLoading}>
              {authLoading
                ? authMode === 'login'
                  ? 'Signing in...'
                  : 'Registering...'
                : authMode === 'login'
                ? 'Sign in'
                : 'Create account'}
            </Button>
            {authMode === 'login' ? (
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                disabled={authLoading}
                onClick={() => setResetMode('request')}
              >
                Forgot password?
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              disabled={authLoading}
              onClick={() =>
                setAuthMode((current) =>
                  current === 'login' ? 'register' : 'login'
                )
              }
            >
              {authMode === 'login'
                ? 'New here? Create an account'
                : 'Already have an account? Sign in'}
            </Button>
          </form>
        )}
      </div>
    )
  }

  const renderChatList = (className: string) => (
    <section className={`w-full md:w-[360px] glass rounded-2xl ${className}`}>
      <div className="flex items-center justify-between px-5 py-4">
        <h2 className="text-lg font-semibold">Chats</h2>
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => {
              setFriendsOpen(true)
              loadFriends()
              loadRequests()
              setSearchQuery('')
              searchUsers('')
            }}
            title="Add friends"
          >
            <UserPlus size={18} />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => {
              setGroupOpen(true)
              loadFriends()
            }}
            title="New group"
          >
            <Users size={18} />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
            title="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </Button>
          <Button
            size="icon"
            variant={view === 'account' ? 'default' : 'ghost'}
            onClick={() => setView('account')}
            title="Settings"
          >
            <Settings size={18} />
          </Button>
        </div>
      </div>
      <div className="px-4 pb-3">
        <div className="flex items-center gap-2 rounded-full glass-soft px-4 py-2">
          <Search size={16} className="text-muted-foreground" />
          <input
            className="w-full bg-transparent text-sm outline-none"
            placeholder="Search chats"
            value={chatSearch}
            onChange={(event) => setChatSearch(event.target.value)}
          />
        </div>
      </div>
      <div className="h-[calc(100vh-140px)] overflow-y-auto px-2">
        {groupedConversations.length === 0 ? (
          <div className="px-4 py-6 text-sm text-muted-foreground">
            No conversations found.
          </div>
        ) : null}
        {groupedConversations.map((group) => (
          <div key={group.label} className="pb-2">
            <div className="px-4 pb-2 pt-4 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              {group.label}
            </div>
            <div className="space-y-1">
              {group.items.map((chat) => {
                const isActive = chat.id === activeId
                const name =
                  chat.type === 'group'
                    ? chat.name || 'Group'
                    : chat.members.find((m) => m.id !== user.id)?.displayName ||
                      'Direct chat'
                const avatarMember =
                  chat.type === 'direct'
                    ? chat.members.find((m) => m.id !== user.id)
                    : null
                const avatarSrc = getAvatarSrc(avatarMember)
                const isOnline =
                  avatarMember && onlineUsers[avatarMember.id] && chat.type === 'direct'
                return (
                  <button
                    key={chat.id}
                    className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition ${
                      isActive ? 'bg-white/30 shadow-sm' : 'hover:bg-white/15'
                    }`}
                    onClick={() => {
                      setActiveId(chat.id)
                      setMobileChatsOpen(false)
                    }}
                  >
                    <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full glass-soft">
                      {avatarSrc ? (
                        <img
                          src={avatarSrc}
                          alt={name}
                          className="h-full w-full object-cover"
                        />
                      ) : chat.type === 'group' ? (
                        <Users size={18} className="text-muted-foreground" />
                      ) : (
                        <User size={18} className="text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">{name}</span>
                          {isOnline ? (
                            <span className="h-2 w-2 rounded-full bg-emerald-400" />
                          ) : null}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {chat.last_message?.created_at
                            ? new Date(chat.last_message.created_at).toLocaleTimeString(
                                [],
                                {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                }
                              )
                            : ''}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground" title={chat.last_message ? (chat.last_message?.text ? chat.last_message.text : "") : undefined}>
                        {chat.last_message
                          ? truncateText(chat.last_message.text ? chat.last_message.text : "", 35) || 'Attachment'
                          : 'No messages yet'}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  )

  const renderWaveform = (level: number) => (
    <div className="mt-2 flex h-6 items-end gap-1">
      {[0.4, 0.6, 0.9, 0.6, 0.4].map((multiplier, index) => (
        <span
          key={`wave-${index}`}
          className="h-5 w-1 rounded-full bg-white/80 transition-transform duration-150"
          style={{
            transform: `scaleY(${0.3 + level * multiplier})`,
            transformOrigin: 'bottom',
          }}
        />
      ))}
    </div>
  )

  return (
    <div className="h-screen w-screen overflow-hidden">
      <div className="flex h-full flex-col md:flex-row">

        {view === 'account' ? (
          <main className="flex-1 overflow-y-auto p-4 pb-24 md:p-8">
            <div className="space-y-8">
              <div className="flex items-center justify-between md:hidden">
                <Button size="icon" variant="ghost" onClick={() => setView('chat')}>
                  <MessageSquare size={18} />
                </Button>
                <h2 className="text-sm font-semibold">Account settings</h2>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() =>
                    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
                  }
                >
                  {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                </Button>
              </div>
              <div className="flex items-center gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="hidden md:inline-flex"
                      onClick={() => setView('chat')}
                      title="Back to chats"
                    >
                      <ArrowLeft size={18} />
                    </Button>
                    <h2 className="text-2xl font-semibold">Settings</h2>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Update your preferences and account settings.
                  </p>
                </div>
              </div>

              <div className="flex flex-col md:grid gap-6 md:grid-cols-2">
                <div className="space-y-4 rounded-2xl glass p-6">
                  <div>
                    <h3 className="text-lg font-semibold">Preferences</h3>
                    <p className="text-sm text-muted-foreground">
                      Customize your experience.
                    </p>
                  </div>
                <div className="flex items-center justify-between rounded-lg glass-soft px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">Dark mode</p>
                    <p className="text-xs text-muted-foreground">
                      Use a darker theme for low light.
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-pressed={theme === 'dark'}
                    onClick={() =>
                      setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
                    }
                    className={`h-6 w-11 rounded-full border border-white/20 p-1 transition ${
                      theme === 'dark' ? 'bg-primary' : 'bg-white/20'
                    }`}
                  >
                    <span
                      className={`block h-4 w-4 rounded-full bg-white transition ${
                        theme === 'dark' ? 'translate-x-5' : ''
                      }`}
                    />
                  </button>
                </div>
                <div className="flex items-center justify-between rounded-lg glass-soft px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">Ringtone</p>
                    <p className="text-xs text-muted-foreground">
                      Play sound on incoming calls.
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-pressed={ringtoneEnabled}
                    onClick={() => setRingtoneEnabled((prev) => !prev)}
                    className={`h-6 w-11 rounded-full border border-white/20 p-1 transition ${
                      ringtoneEnabled ? 'bg-primary' : 'bg-white/20'
                    }`}
                  >
                    <span
                      className={`block h-4 w-4 rounded-full bg-white transition ${
                        ringtoneEnabled ? 'translate-x-5' : ''
                      }`}
                    />
                  </button>
                </div>
                <div className="space-y-2 rounded-lg glass-soft px-4 py-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Ringtone volume</p>
                    <span className="text-xs text-muted-foreground">
                      {Math.round(ringtoneVolume * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={ringtoneVolume}
                    onChange={(event) =>
                      setRingtoneVolume(Number(event.target.value))
                    }
                  />
                </div>
                <div className="space-y-2 rounded-lg glass-soft px-4 py-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Ringtone tone</p>
                  </div>
                  <select
                    className="w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-slate-900 dark:border-white/10 dark:bg-slate-900/70 dark:text-white"
                    value={ringtoneChoice}
                    onChange={(event) => setRingtoneChoice(event.target.value)}
                  >
                    <option className="bg-slate-900 text-white" value="nebula">
                      Nebula (default)
                    </option>
                    <option className="bg-slate-900 text-white" value="aurora">
                      Aurora
                    </option>
                    <option className="bg-slate-900 text-white" value="pulse">
                      Pulse
                    </option>
                    <option className="bg-slate-900 text-white" value="orbit">
                      Orbit
                    </option>
                    <option className="bg-slate-900 text-white" value="dusk">
                      Dusk
                    </option>
                  </select>
                </div>
                <div className="flex items-center justify-between rounded-lg glass-soft px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">Message ping</p>
                    <p className="text-xs text-muted-foreground">
                      Play sound on incoming messages.
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-pressed={pingEnabled}
                    onClick={() => setPingEnabled((prev) => !prev)}
                    className={`h-6 w-11 rounded-full border border-white/20 p-1 transition ${
                      pingEnabled ? 'bg-primary' : 'bg-white/20'
                    }`}
                  >
                    <span
                      className={`block h-4 w-4 rounded-full bg-white transition ${
                        pingEnabled ? 'translate-x-5' : ''
                      }`}
                    />
                  </button>
                </div>
                <div className="space-y-2 rounded-lg glass-soft px-4 py-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Ping volume</p>
                    <span className="text-xs text-muted-foreground">
                      {Math.round(pingVolume * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={pingVolume}
                    onChange={(event) => setPingVolume(Number(event.target.value))}
                  />
                </div>
                <div className="space-y-2 rounded-lg glass-soft px-4 py-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Ping tone</p>
                  </div>
                  <select
                    className="w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-slate-900 dark:border-white/10 dark:bg-slate-900/70 dark:text-white"
                    value={pingChoice}
                    onChange={(event) => setPingChoice(event.target.value)}
                  >
                    <option className="bg-slate-900 text-white" value="spark">
                      Spark (default)
                    </option>
                    <option className="bg-slate-900 text-white" value="pulse">
                      Pulse
                    </option>
                    <option className="bg-slate-900 text-white" value="echo">
                      Echo
                    </option>
                    <option className="bg-slate-900 text-white" value="nova">
                      Nova
                    </option>
                    <option className="bg-slate-900 text-white" value="drift">
                      Drift
                    </option>
                  </select>
                </div>
                </div>
                <div className="space-y-6">
                  <form className="space-y-4 rounded-2xl glass p-6" onSubmit={updateProfile}>
                    <div className="space-y-2">
                      <Label>Display name</Label>
                      <Input name="displayName" defaultValue={user.displayName} />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input name="email" type="email" defaultValue={user.email} />
                    </div>
                    <div className="space-y-2">
                      <Label>Profile photo</Label>
                      <div className="flex flex-col items-start gap-3 rounded-xl glass-soft p-3 sm:flex-row sm:items-center">
                        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-white/20">
                          {avatarPreview ? (
                            <img
                              src={avatarPreview}
                              alt="Profile preview"
                              className="h-full w-full object-cover"
                            />
                          ) : user.avatarUrl ? (
                            <img
                              src={getAvatarSrc(user)}
                              alt={user.displayName}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <User size={18} className="text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium truncate max-w-[220px] sm:max-w-[160px]">
                            {avatarName || 'No file selected'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            PNG, JPG, or WEBP up to 5 MB
                          </p>
                        </div>
                        <div className="flex w-full gap-2 sm:w-auto">
                          <label className="cursor-pointer">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleAvatarSelect}
                            />
                            <span className="inline-flex w-full items-center justify-center rounded-md border border-white/20 px-3 py-2 text-xs font-medium text-foreground hover:bg-white/10 sm:w-auto">
                              Choose
                            </span>
                          </label>
                          <Button
                            type="button"
                            size="sm"
                            onClick={handleAvatarUpload}
                            disabled={!avatarFile}
                            className="w-full sm:w-auto"
                          >
                            Upload
                          </Button>
                        </div>
                      </div>
                    </div>
                    <Button type="submit">Save changes</Button>
                  </form>

                  <form className="space-y-4 rounded-2xl glass p-6" onSubmit={updatePassword}>
                    <div className="space-y-2">
                      <Label>Current password</Label>
                      <div className="relative">
                        <Input
                          name="currentPassword"
                          type={showCurrentPassword ? 'text' : 'password'}
                          required
                          className="pr-10"
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                          onClick={() => setShowCurrentPassword((prev) => !prev)}
                          title={showCurrentPassword ? 'Hide password' : 'Show password'}
                        >
                          {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>New password</Label>
                      <div className="relative">
                        <Input
                          name="newPassword"
                          type={showNewPassword ? 'text' : 'password'}
                          required
                          className="pr-10"
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                          onClick={() => setShowNewPassword((prev) => !prev)}
                          title={showNewPassword ? 'Hide password' : 'Show password'}
                        >
                          {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                    <Button type="submit">Update password</Button>
                  </form>

                  <Button
                    variant="outline"
                    onClick={() => {
                      clearToken()
                      setAuthToken('')
                      setUser(null)
                      setConversations([])
                      setMessages([])
                      setActiveId(null)
                      setView('chat')
                    }}
                  >
                    <LogOut size={16} />
                    Sign out
                  </Button>
                </div>
              </div>
            </div>
          </main>
        ) : (
          <>
            {renderChatList('hidden md:block m-4')}

            <main className="flex flex-1 flex-col overflow-hidden !ml-0 md:m-4 md:rounded-2xl">
              <header className="flex items-center justify-between glass px-4 py-4 md:px-6 z-10">
                <div className="flex items-center gap-3">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="md:hidden"
                    onClick={() => setMobileChatsOpen(true)}
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
                    <p className="text-xs text-muted-foreground">
                      {activeSubtitle}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {activeConversation?.type === 'group' ? (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setGroupManageOpen(true)
                        loadFriends()
                      }}
                      title="Manage group"
                    >
                      <Users size={18} />
                    </Button>
                  ) : null}
                  <div className="relative" ref={chatSearchRef}>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setChatSearchOpen((prev) => !prev)}
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
                          onChange={(event) => setChatSearchQuery(event.target.value)}
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
                              onClick={() =>
                                setChatSearchIndex((prev) =>
                                  prev === 0
                                    ? chatSearchMatches.length - 1
                                    : prev - 1
                                )
                              }
                            >
                              <ChevronUp size={16} />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              disabled={chatSearchMatches.length === 0}
                              onClick={() =>
                                setChatSearchIndex((prev) =>
                                  prev === chatSearchMatches.length - 1
                                    ? 0
                                    : prev + 1
                                )
                              }
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
                    onClick={() => startCall('video')}
                    disabled={!canCall}
                    title="Video call"
                  >
                    <Video size={18} />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => startCall('voice')}
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
                          const isActiveMatch =
                            chatSearchMatches[chatSearchIndex] === message.id
                          const isGroupChat = activeConversation?.type === 'group'
                          const sender = activeConversation?.members.find(
                            (member) => member.id === message.senderId
                          )
                          const senderAvatar = sender ? getAvatarSrc(sender) : ''
                          const showSenderName =
                            isGroupChat &&
                            message.senderId !== user.id
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
                                    className={`relative rounded-2xl rounded-bl-none px-4 py-3 text-sm shadow ${
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
                                      <p>
                                        {highlightText(
                                          message.text,
                                          chatSearchQuery,
                                          isActiveMatch
                                        )}
                                      </p>
                                    ) : (
                                      <p>{message.file?.originalName}</p>
                                    )}
                                    {message.file ? (
                                      <button
                                        className="mt-2 text-xs font-medium underline"
                                        onClick={() =>
                                          downloadFile(
                                            message.file!.id,
                                            message.file!.originalName
                                          )
                                        }
                                      >
                                        Download
                                      </button>
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
                                              otherMemberId &&
                                              message.readBy.includes(otherMemberId)
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
                                <div
                                  className={`rounded-2xl rounded-bl-none px-4 py-3 text-sm shadow ${
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
                                    <p>
                                      {highlightText(
                                        message.text,
                                        chatSearchQuery,
                                        isActiveMatch
                                      )}
                                    </p>
                                  ) : (
                                    <p>{message.file?.originalName}</p>
                                  )}
                                  {message.file ? (
                                    <button
                                      className="mt-2 text-xs font-medium underline"
                                      onClick={() =>
                                        downloadFile(
                                          message.file!.id,
                                          message.file!.originalName
                                        )
                                      }
                                    >
                                      Download
                                    </button>
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
                              )
                            ) : (
                              <div
                                className={`rounded-2xl rounded-br-none px-4 py-3 text-sm shadow glass-soft ${
                                  chatSearchMatches.includes(message.id)
                                    ? isActiveMatch
                                      ? 'ring-2 ring-yellow-300/80'
                                      : 'ring-1 ring-violet-300/70'
                                    : ''
                                }`}
                              >
                                {message.text ? (
                                  <p>
                                    {highlightText(
                                      message.text,
                                      chatSearchQuery,
                                      isActiveMatch
                                    )}
                                  </p>
                                ) : (
                                  <p>{message.file?.originalName}</p>
                                )}
                                {message.file ? (
                                  <button
                                    className="mt-2 text-xs font-medium underline"
                                    onClick={() =>
                                      downloadFile(
                                        message.file!.id,
                                        message.file!.originalName
                                      )
                                    }
                                  >
                                    Download
                                  </button>
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
                                          otherMemberId &&
                                          message.readBy.includes(otherMemberId)
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
                            )}
                          </div>
                        )
                      })}
                      </div>
                    </div>
                  ))}
                </div>
                {typingUsers.length > 0 ? (
                  <div className="mt-4 w-fit rounded-full rounded-bl-none glass-soft px-4 py-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1 align-middle">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted/70 [animation-delay:-0.2s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted/70 [animation-delay:-0.1s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted/70" />
                    </span>
                  </div>
                ) : null}
              </div>

              <footer className="glass px-4 py-4 md:px-6">
                {uploadProgress !== null ? (
                  <div className="mb-3 rounded-lg glass-soft px-4 py-2 text-xs text-muted-foreground">
                    Uploading {uploadFileName} — {uploadProgress}%
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/20">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                ) : null}
                <div className="flex items-center gap-3 rounded-full glass-soft px-4 py-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={!activeConversation}
                    title="Attach"
                  >
                    <Paperclip size={18} />
                  </Button>
                  <input
                    className="w-full bg-transparent text-sm outline-none"
                    placeholder="Type a message"
                    value={messageText}
                    onChange={(event) => handleTyping(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        sendMessage()
                      }
                    }}
                    disabled={!activeConversation}
                  />
                  <Button size="icon" onClick={sendMessage} disabled={!activeConversation}>
                    <Send size={18} />
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>
              </footer>
            </main>

            {mobileChatsOpen ? (
              <div className="fixed inset-0 z-40 bg-black/60 p-4 md:hidden">
                <div className="absolute inset-0" onClick={() => setMobileChatsOpen(false)} />
                <div className="relative h-full">
                  {renderChatList('m-0 h-full w-full max-w-none')}
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
      <Dialog open={friendsOpen} onOpenChange={setFriendsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Friends</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="friends">
            <TabsList className="w-full mt-2">
              <TabsTrigger value="friends" className="flex-1">
                Friends
              </TabsTrigger>
              <TabsTrigger value="requests" className="flex-1">
                Requests
              </TabsTrigger>
              <TabsTrigger value="users" className="flex-1">
                Users
              </TabsTrigger>
            </TabsList>

            <TabsContent value="friends" className="space-y-3">
              {friends.length === 0 ? (
                <div className="rounded-lg glass-soft p-4 text-sm text-muted-foreground">
                  No friends yet.
                </div>
              ) : null}
              {friends.map((friend) => (
                <div key={friend.id} className="flex items-center justify-between rounded-lg glass-soft p-3">
                  <div>
                    <p className="text-sm font-semibold">{friend.displayName}</p>
                    <p className="text-xs text-muted-foreground">{friend.email}</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => createDirectChat(friend.id)}>
                    <MessageSquare size={18} />
                  </Button>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="requests" className="space-y-4">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Incoming</p>
                {incomingRequests.length === 0 ? (
                  <div className="rounded-lg glass-soft p-3 text-sm text-muted-foreground">
                    No incoming requests.
                  </div>
                ) : null}
                {incomingRequests.map((request) => (
                  <div key={request.id} className="flex items-center justify-between rounded-lg glass-soft p-3">
                    <div>
                      <p className="text-sm font-semibold">{request.user.displayName}</p>
                      <p className="text-xs text-muted-foreground">{request.user.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="icon" variant="ghost" onClick={() => acceptFriend(request.id)}>
                        <Check size={16} />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => rejectFriend(request.id)}>
                        <X size={16} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Outgoing</p>
                {outgoingRequests.length === 0 ? (
                  <div className="rounded-lg glass-soft p-3 text-sm text-muted-foreground">
                    No outgoing requests.
                  </div>
                ) : null}
                {outgoingRequests.map((request) => (
                  <div key={request.id} className="flex items-center justify-between rounded-lg glass-soft p-3">
                    <div>
                      <p className="text-sm font-semibold">{request.user.displayName}</p>
                      <p className="text-xs text-muted-foreground">{request.user.email}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">Pending</span>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="users" className="space-y-3">
              <div className="flex items-center gap-2 rounded-full glass-soft px-4 py-2">
                <Search size={16} className="text-muted-foreground" />
                <input
                  className="w-full bg-transparent text-sm outline-none"
                  placeholder="Search users"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </div>
              {searchResults.map((person) => {
                const isFriend = friendIdSet.has(person.id)
                const pending = outgoingSet.has(person.id)
                return (
                  <div key={person.id} className="flex items-center justify-between rounded-lg glass-soft p-3">
                    <div>
                      <p className="text-sm font-semibold">{person.displayName}</p>
                      <p className="text-xs text-muted-foreground">{person.email}</p>
                    </div>
                    {isFriend ? (
                      <Button size="sm" variant="ghost" onClick={() => createDirectChat(person.id)}>
                        <MessageSquare size={18} />
                      </Button>
                    ) : (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => sendFriendRequest(person.id)}
                        disabled={pending}
                      >
                        <UserPlus size={16} />
                      </Button>
                    )}
                  </div>
                )
              })}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <Dialog open={groupOpen} onOpenChange={setGroupOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create group</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Group name</Label>
              <Input value={groupName} onChange={(event) => setGroupName(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Members</Label>
              <div className="max-h-52 space-y-2 overflow-y-auto rounded-lg glass-soft p-3">
                {friends.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Add friends first.</p>
                ) : null}
                {friends.map((friend) => (
                  <label key={friend.id} className="flex items-center justify-between text-sm">
                    <span>{friend.displayName}</span>
                    <input
                      type="checkbox"
                      checked={selectedMembers.includes(friend.id)}
                      onChange={(event) => {
                        if (event.target.checked) {
                          setSelectedMembers((prev) => [...prev, friend.id])
                        } else {
                          setSelectedMembers((prev) =>
                            prev.filter((id) => id !== friend.id)
                          )
                        }
                      }}
                    />
                  </label>
                ))}
              </div>
            </div>
            <Button onClick={createGroup}>Create group</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={groupManageOpen} onOpenChange={setGroupManageOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage group</DialogTitle>
          </DialogHeader>
          {activeConversation?.type === 'group' ? (
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Members</Label>
                <div className="space-y-2 rounded-lg glass-soft p-3">
                  {activeConversation.members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between text-sm">
                      <span>{member.displayName}</span>
                      {member.id !== user.id ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeMemberFromGroup(member.id)}
                        >
                          Remove
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">You</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Add friends</Label>
                <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg glass-soft p-3">
                  {friends
                    .filter(
                      (friend) =>
                        !activeConversation.members.some((m) => m.id === friend.id)
                    )
                    .map((friend) => (
                      <label key={friend.id} className="flex items-center justify-between text-sm">
                        <span>{friend.displayName}</span>
                        <input
                          type="checkbox"
                          checked={manageMembers.includes(friend.id)}
                          onChange={(event) => {
                            if (event.target.checked) {
                              setManageMembers((prev) => [...prev, friend.id])
                            } else {
                              setManageMembers((prev) =>
                                prev.filter((id) => id !== friend.id)
                              )
                            }
                          }}
                        />
                      </label>
                    ))}
                  {friends.filter(
                    (friend) =>
                      !activeConversation.members.some((m) => m.id === friend.id)
                  ).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No friends to add.</p>
                  ) : null}
                </div>
              </div>
              <Button onClick={addMembersToGroup} disabled={manageMembers.length === 0}>
                Add selected
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No group selected.</p>
          )}
        </DialogContent>
      </Dialog>

      {callState.status !== 'idle' ? (
        <div
          className={`fixed inset-0 z-50 p-6 ${
            callMinimized
              ? 'bg-transparent pointer-events-none'
              : 'grid place-items-center bg-black/60'
          }`}
        >
          <div
            className={`fixed bottom-6 right-6 z-50 w-72 rounded-2xl glass p-4 shadow-xl transition ${
              callMinimized ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">{activeName}</p>
                <p className="text-xs text-muted-foreground">
                  {callState.status === 'incoming'
                    ? 'Incoming call'
                    : callState.status === 'calling'
                    ? 'Calling...'
                    : 'In call'}
                </p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setCallMinimized(false)}
                title="Maximize"
              >
                <Plus size={16} />
              </Button>
            </div>
            <div className="relative mt-3 overflow-hidden rounded-xl">
              {callState.mode === 'voice' ? (
                <div className="flex h-36 w-full flex-col items-center justify-center rounded-xl bg-black/40">
                  <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-white/10">
                    {activeAvatarSrc ? (
                      <img
                        src={activeAvatarSrc}
                        alt={activeName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <User size={20} className="text-white/80" />
                    )}
                  </div>
                  {renderWaveform(remoteLevel)}
                </div>
              ) : (
                <>
                  <video
                    ref={remoteMiniRef}
                    autoPlay
                    playsInline
                    className={`h-36 w-full rounded-xl bg-black/70 ${
                      remoteCameraOn ? '' : 'opacity-0'
                    }`}
                    onLoadedMetadata={(event) =>
                      event.currentTarget.play().catch(() => {})
                    }
                    onPlaying={() => setRemoteVideoReady(true)}
                    onPause={() => setRemoteVideoReady(false)}
                    onEnded={() => setRemoteVideoReady(false)}
                  />
                  {!remoteVideoReady || !remoteCameraOn ? (
                    <div className="absolute bg-black/40 flex flex-col h-full justify-center place-items-center rounded-xl top-0 w-full">
                      <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-white/10">
                        {activeAvatarSrc ? (
                          <img
                            src={activeAvatarSrc}
                            alt={activeName}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <User size={20} className="text-white/80" />
                        )}
                      </div>
                      {!remoteCameraOn ? renderWaveform(remoteLevel) : null}
                    </div>
                  ) : null}
                </>
              )}
            </div>
            <div className="mt-3 flex items-center gap-2">
              {callState.status === 'incoming' ? (
                <>
                  {callState.mode === 'video' ? (
                    <Button
                      size="icon"
                      variant="secondary"
                      onClick={toggleCamera}
                      title={cameraEnabled ? 'Turn camera off' : 'Turn camera on'}
                    >
                      {cameraEnabled ? <Video size={18} /> : <VideoOff size={18} />}
                    </Button>
                  ) : null}
                  <Button onClick={acceptCall} className="flex-1">
                    Accept
                  </Button>
                  <Button variant="outline" onClick={endCall} className="flex-1">
                    Decline
                  </Button>
                </>
              ) : (
                <>
                  {callState.mode === 'video' ? (
                    <Button
                      size="icon"
                      variant="secondary"
                      onClick={toggleCamera}
                      title={cameraEnabled ? 'Turn camera off' : 'Turn camera on'}
                    >
                      {cameraEnabled ? <Video size={18} /> : <VideoOff size={18} />}
                    </Button>
                  ) : null}
                  <Button size="icon" variant="secondary" onClick={toggleMic} title="Mute mic">
                    {micMuted ? <MicOff size={18} /> : <Mic size={18} />}
                  </Button>
                  <Button
                    size="icon"
                    variant="secondary"
                    onClick={toggleSpeaker}
                    title="Mute speaker"
                  >
                    {speakerMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                  </Button>
                  <Button
                    size="icon"
                    onClick={endCall}
                    className="bg-red-500 text-white hover:bg-red-500/90"
                    title="End call"
                  >
                    <PhoneOff size={18} />
                  </Button>
                </>
              )}
            </div>
          </div>
          <div
            className={`w-full max-w-3xl lg:max-w-[calc(100vw-400px)] space-y-4 rounded-2xl glass p-2 lg:p-6 transition ${
              callMinimized ? 'pointer-events-none opacity-0' : 'opacity-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">{activeName}</p>
                <p className="text-xs text-muted-foreground">
                  {callState.status === 'incoming'
                    ? 'Incoming call'
                    : callState.status === 'calling'
                    ? 'Calling...'
                    : 'In call'}
                </p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setCallMinimized(true)}
                title="Minimize"
              >
                <Minus size={18} />
              </Button>
            </div>
            <div className="grid relative gap-4 md:grid-cols-[2fr_1fr]">
              <div className="relative">
                {callState.mode === 'voice' ? (
                  <div className="flex h-64 lg:h-[calc(80vh)] w-full flex-col items-center justify-center rounded-xl bg-black/50">
                    <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-white/10">
                      {activeAvatarSrc ? (
                        <img
                          src={activeAvatarSrc}
                          alt={activeName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <User size={28} className="text-white/80" />
                      )}
                    </div>
                    {renderWaveform(remoteLevel)}
                  </div>
                ) : (
                  <>
                    <video
                      ref={remoteVideoRef}
                      autoPlay
                      playsInline
                      className={`h-[calc(80vh)] lg:h-[calc(100vh-400px)] w-full rounded-xl bg-black/70 ${
                        remoteCameraOn ? '' : 'opacity-0'
                      }`}
                      onLoadedMetadata={(event) =>
                        event.currentTarget.play().catch(() => {})
                      }
                      onPlaying={() => setRemoteVideoReady(true)}
                      onPause={() => setRemoteVideoReady(false)}
                      onEnded={() => setRemoteVideoReady(false)}
                    />
                    {!remoteVideoReady || !remoteCameraOn ? (
                      <div className="absolute bg-black/40 flex flex-col h-full justify-center place-items-center rounded-xl top-0 w-full">
                        <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-white/10">
                          {activeAvatarSrc ? (
                            <img
                              src={activeAvatarSrc}
                              alt={activeName}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <User size={24} className="text-white/80" />
                          )}
                        </div>
                        {!remoteCameraOn ? renderWaveform(remoteLevel) : null}
                      </div>
                    ) : null}
                    <div className="absolute bottom-3 left-3 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
                      {activeName}
                    </div>
                  </>
                )}
              </div>
              <div className="absolute right-2 top-2 w-24 lg:relative lg:right-auto lg:w-auto lg:top-auto">
                <div className="hidden -translate-x-1/2 -translate-y-1 absolute lg:block lg:top-72 left-1/2 z-10">
                {callState.status === 'incoming' ? (
                  <div className="flex gap-3">
                    {callState.mode === 'video' ? (
                      <Button
                        size="icon"
                        variant="secondary"
                        onClick={toggleCamera}
                        title={cameraEnabled ? 'Turn camera off' : 'Turn camera on'}
                      >
                        {cameraEnabled ? <Video size={18} /> : <VideoOff size={18} />}
                      </Button>
                    ) : null}
                    <Button onClick={acceptCall}>Accept</Button>
                    <Button variant="outline" onClick={endCall}>
                      Decline
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    {callState.mode === 'video' ? (
                      <Button
                        size="icon"
                        variant="secondary"
                        onClick={toggleCamera}
                        title={cameraEnabled ? 'Turn camera off' : 'Turn camera on'}
                      >
                        {cameraEnabled ? <Video size={18} /> : <VideoOff size={18} />}
                      </Button>
                    ) : null}
                    <Button size="icon" variant="secondary" onClick={toggleMic} title="Mute mic">
                      {micMuted ? <MicOff size={18} /> : <Mic size={18} />}
                    </Button>
                    <Button
                      size="icon"
                      variant="secondary"
                      onClick={toggleSpeaker}
                      title="Mute speaker"
                    >
                      {speakerMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                    </Button>
                    <Button
                      size="icon"
                      onClick={endCall}
                      className="bg-red-500 text-white hover:bg-red-500/90"
                      title="End call"
                    >
                      <PhoneOff size={18} />
                    </Button>
                  </div>
                )}
                </div>
                {callState.mode === 'voice' ? (
                  <div className="flex h-40 lg:h-64 w-full flex-col items-center justify-center rounded-xl bg-black/50">
                    <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-white/10">
                      {user.avatarUrl ? (
                        <img
                          src={getAvatarSrc(user)}
                          alt={user.displayName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <User size={20} className="text-white/80" />
                      )}
                    </div>
                    {renderWaveform(localLevel)}
                  </div>
                ) : cameraEnabled ? (
                  <div className="relative h-40 lg:h-64 w-full">
                    <video
                      ref={localVideoRef}
                      autoPlay
                      muted
                      playsInline
                      className="h-full w-full rounded-xl bg-black/70"
                      onLoadedMetadata={(event) =>
                        event.currentTarget.play().catch(() => {})
                      }
                    />
                    <div className="absolute bottom-2 left-2 lg:bottom rounded-full bg-black/60 px-2 py-1 text-[10px] text-white">
                      {user.displayName}
                    </div>
                  </div>
                ) : (
                  <div className="flex h-40 lg:h-64 w-full flex-col items-center justify-center rounded-xl bg-black/50">
                    <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-white/10">
                      {user.avatarUrl ? (
                        <img
                          src={getAvatarSrc(user)}
                          alt={user.displayName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <User size={20} className="text-white/80" />
                      )}
                    </div>
                    <p className="mt-2 text-xs text-white/70">Camera off</p>
                  </div>
                )}
              </div>
              <div className={`block -translate-x-1/2 -translate-y-1 absolute ${callState.mode === 'video' ? "bottom-10" : "bottom-2"} left-1/2 z-10 lg:hidden`}>
              {callState.status === 'incoming' ? (
                <div className="flex gap-3">
                  {callState.mode === 'video' ? (
                    <Button
                      size="icon"
                      variant="secondary"
                      onClick={toggleCamera}
                      title={cameraEnabled ? 'Turn camera off' : 'Turn camera on'}
                    >
                      {cameraEnabled ? <Video size={18} /> : <VideoOff size={18} />}
                    </Button>
                  ) : null}
                  <Button onClick={acceptCall}>Accept</Button>
                  <Button variant="outline" onClick={endCall}>
                    Decline
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  {callState.mode === 'video' ? (
                    <Button
                      size="icon"
                      variant="secondary"
                      onClick={toggleCamera}
                      title={cameraEnabled ? 'Turn camera off' : 'Turn camera on'}
                    >
                      {cameraEnabled ? <Video size={18} /> : <VideoOff size={18} />}
                    </Button>
                  ) : null}
                  <Button size="icon" variant="secondary" onClick={toggleMic} title="Mute mic">
                    {micMuted ? <MicOff size={18} /> : <Mic size={18} />}
                  </Button>
                  <Button
                    size="icon"
                    variant="secondary"
                    onClick={toggleSpeaker}
                    title="Mute speaker"
                  >
                    {speakerMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                  </Button>
                  <Button
                    size="icon"
                    onClick={endCall}
                    className="bg-red-500 text-white hover:bg-red-500/90"
                    title="End call"
                  >
                    <PhoneOff size={18} />
                  </Button>
                </div>
              )}
              </div>         
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default App
