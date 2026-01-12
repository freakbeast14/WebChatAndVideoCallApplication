
import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { io, type Socket } from 'socket.io-client'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import AuthCard from '@/components/auth/AuthCard'
import HomePage from '@/components/home/HomePage'
import ChatList from '@/components/chat/ChatList'
import ChatView from '@/components/chat/ChatView'
import CallOverlay from '@/components/calls/CallOverlay'
import FriendsDialog from '@/components/dialogs/FriendsDialog'
import GroupDialog from '@/components/dialogs/GroupDialog'
import GroupManageDialog from '@/components/dialogs/GroupManageDialog'
import AdminView from '@/components/admin/AdminView'
import SettingsView from '@/components/settings/SettingsView'
import AvatarCropDialog from '@/components/settings/AvatarCropDialog'
import ConfirmDialog from '@/components/ui/confirm-dialog'
import type { CallState, Conversation, FriendRequest, Message, User as ChatUser } from '@/types'
import { API_BASE, fetchJson } from '@/lib/api'
import { getAvatarSrc, mapMessage } from '@/lib/chat'

const FORCE_TURN_RELAY = import.meta.env.VITE_TURN_FORCE_RELAY === 'true'
const LOW_BANDWIDTH_CALLS = import.meta.env.VITE_LOW_BANDWIDTH_CALLS === 'true'
const CALL_WIDTH = Number(import.meta.env.VITE_CALL_WIDTH || 640)
const CALL_HEIGHT = Number(import.meta.env.VITE_CALL_HEIGHT || 360)
const CALL_FPS = Number(import.meta.env.VITE_CALL_FPS || 15)
const CALL_MAX_BITRATE = Number(import.meta.env.VITE_CALL_MAX_BITRATE || 300000)

const getToken = () => localStorage.getItem('chatapp_token') || ''
const setToken = (value: string) => localStorage.setItem('chatapp_token', value)
const clearToken = () => localStorage.removeItem('chatapp_token')

function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [view, setView] = useState<'chat' | 'account' | 'admin'>('chat')
  const [token, setAuthToken] = useState(getToken())
  const [user, setUser] = useState<ChatUser | null>(null)
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
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false)
  const [passwordDirty, setPasswordDirty] = useState(false)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [messageText, setMessageText] = useState('')
  const [replyToId, setReplyToId] = useState<string | null>(null)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [chatSearch, setChatSearch] = useState('')
  const [friends, setFriends] = useState<ChatUser[]>([])
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([])
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([])
  const [friendsOpen, setFriendsOpen] = useState(false)
  const [groupOpen, setGroupOpen] = useState(false)
  const [groupManageOpen, setGroupManageOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ChatUser[]>([])
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
  const [avatarRemovePending, setAvatarRemovePending] = useState(false)
  const [profileDirty, setProfileDirty] = useState(false)
  const [avatarDraftFile, setAvatarDraftFile] = useState<File | null>(null)
  const [avatarCropOpen, setAvatarCropOpen] = useState(false)
  const [avatarCropSrc, setAvatarCropSrc] = useState('')
  const [avatarCropScale, setAvatarCropScale] = useState(1)
  const [avatarCropOffset, setAvatarCropOffset] = useState({ x: 0, y: 0 })
  const [chatSearchOpen, setChatSearchOpen] = useState(false)
  const [chatSearchQuery, setChatSearchQuery] = useState('')
  const [chatSearchIndex, setChatSearchIndex] = useState(0)
  const [mobileChatsOpen, setMobileChatsOpen] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState<Record<string, boolean>>({})
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [pendingFilePreview, setPendingFilePreview] = useState('')
  const [pendingFileName, setPendingFileName] = useState('')
  const [pendingFileIsImage, setPendingFileIsImage] = useState(false)
  const [callState, setCallState] = useState<CallState>({
    status: 'idle',
    mode: 'video',
  })
  const [remoteVideoReady, setRemoteVideoReady] = useState(false)
  const [callMinimized, setCallMinimized] = useState(false)
  const [confirmState, setConfirmState] = useState<{
    open: boolean
    kind:
      | 'delete-message'
      | 'sign-out'
      | 'clear-chat'
      | 'leave-group'
      | 'remove-friend'
      | null
    messageId?: string | null
  }>({ open: false, kind: null })
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
  const imageInputRef = useRef<HTMLInputElement | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const ringtoneRef = useRef<{ stop: () => void } | null>(null)
  const typingTimeoutRef = useRef<number | null>(null)
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const callStateRef = useRef(callState)
  const chatSearchRef = useRef<HTMLDivElement | null>(null)
  const activeIdRef = useRef<string | null>(null)
  const userRef = useRef<ChatUser | null>(null)
  const iceServersRef = useRef<RTCIceServer[]>([])
  const pendingIceRef = useRef<Record<string, RTCIceCandidateInit[]>>({})
  const filePreviewRef = useRef<Record<string, string>>({})
  const flushPendingIce = async (conversationId: string, peer: RTCPeerConnection) => {
    const pending = pendingIceRef.current[conversationId]
    if (!pending?.length) return
    for (const candidate of pending) {
      try {
        await peer.addIceCandidate(candidate)
      } catch {
        // Ignore invalid ICE during teardown.
      }
    }
    delete pendingIceRef.current[conversationId]
  }

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
    const params = new URLSearchParams(location.search)
    const verified = params.get('verified')
    if (verified === 'success' || verified === 'error') {
      setVerificationStatus(verified)
      setAuthMode('login')
      setVerificationSent(false)
      setResetMode('')
      navigate('/login', { replace: true })
      return
    }
    const reset = params.get('reset')
    if (reset) {
      setAuthMode('login')
      setVerificationSent(false)
      if (reset === 'error') {
        setResetNotice('Reset link is invalid or expired.')
        setResetMode('request')
        navigate('/forgot', { replace: true })
      } else {
        setResetToken(reset)
        setResetMode('reset')
        navigate('/reset', { replace: true })
      }
    }
  }, [location.search, navigate])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  useEffect(() => {
    if (location.pathname === '/register') {
      setAuthMode('register')
      setResetMode('')
      setVerificationSent(false)
    }
    if (location.pathname === '/login') {
      setAuthMode('login')
      setResetMode('')
      setVerificationSent(false)
    }
    if (location.pathname === '/forgot') {
      setAuthMode('login')
      setResetMode('request')
      setVerificationSent(false)
    }
    if (location.pathname === '/reset') {
      setAuthMode('login')
      setResetMode(resetToken ? 'reset' : 'request')
      setVerificationSent(false)
    }
    if (location.pathname === '/check-email') {
      setAuthMode('login')
      setResetMode('')
      setVerificationSent(true)
    }
  }, [location.pathname, resetToken])

  useEffect(() => {
    if (user?.id) {
      setOnlineUsers((prev) => ({ ...prev, [user.id]: true }))
    }
  }, [user?.id])

  useEffect(() => {
    if (view === 'admin' && user?.roleId !== 2) {
      setView('chat')
    }
  }, [view, user?.roleId])

  useEffect(() => {
    if (token && user) {
      if (location.pathname !== '/app') {
        navigate('/app', { replace: true })
      }
    }
  }, [token, user, location.pathname, navigate])

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
    if (!pendingFilePreview) return
    return () => {
      URL.revokeObjectURL(pendingFilePreview)
    }
  }, [pendingFilePreview])

  useEffect(() => {
    return () => {
      Object.values(filePreviewRef.current).forEach((url) => {
        URL.revokeObjectURL(url)
      })
      filePreviewRef.current = {}
    }
  }, [])

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

    socket.on('message:update', (payload) => {
      const updated = mapMessage(payload)
      setMessages((prev) =>
        prev.map((message) => (message.id === updated.id ? updated : message))
      )
      setConversations((prev) =>
        prev.map((chat) =>
          chat.last_message?.id === updated.id
            ? {
                ...chat,
                last_message: {
                  id: updated.id,
                  sender_id: updated.senderId,
                  type: updated.type,
                  text: updated.text,
                  created_at: updated.createdAt,
                },
              }
            : chat
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
        await flushPendingIce(payload.conversationId, peerRef.current)
        setCallState((prev) => ({ ...prev, status: 'in-call' }))
      }
    })

    socket.on('call:camera', (payload) => {
      if (!callStateRef.current.conversationId) return
      if (payload.conversationId !== callStateRef.current.conversationId) return
      setRemoteCameraOn(Boolean(payload.enabled))
    })

    socket.on('call:ice', async (payload) => {
      if (!payload?.conversationId || !payload.candidate) return
      if (!callStateRef.current.conversationId) {
        pendingIceRef.current[payload.conversationId] =
          pendingIceRef.current[payload.conversationId] || []
        pendingIceRef.current[payload.conversationId].push(payload.candidate)
        return
      }
      if (payload.conversationId !== callStateRef.current.conversationId) return
      if (!peerRef.current || !peerRef.current.remoteDescription) {
        pendingIceRef.current[payload.conversationId] =
          pendingIceRef.current[payload.conversationId] || []
        pendingIceRef.current[payload.conversationId].push(payload.candidate)
        return
      }
      try {
        await peerRef.current.addIceCandidate(payload.candidate)
      } catch {
        // Ignore invalid ICE during teardown.
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
    if (!avatarCropSrc) return
    return () => URL.revokeObjectURL(avatarCropSrc)
  }, [avatarCropSrc])

  useEffect(() => {
    setTypingUsers([])
  }, [activeId])

  useEffect(() => {
    setReplyToId(null)
    setEditingMessageId(null)
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
    if (typingUsers.length > 1) {
      const names = typingUsers
        .map((id) => activeConversation.members.find((m) => m.id === id))
        .filter(Boolean)
        .map((m) => m!.displayName)
      return `${names.join(', ')} typing...`
    } else if (typingUsers.length == 1) {
      return `Typing...`;
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
        navigate('/check-email')
        return
      }
      setToken(data.token)
      setAuthToken(data.token)
      setUser(data.user)
      navigate('/app')
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
      navigate('/forgot')
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
      navigate('/login')
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Reset failed')
    } finally {
      setAuthLoading(false)
    }
  }

  const loadFriends = async () => {
    if (!token) return
    const data = await fetchJson('/api/friends', { headers: authHeader })
    const unique = new Map<string, ChatUser>()
    data.friends.forEach((friend: ChatUser) => unique.set(friend.id, friend))
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
    const unique = new Map<string, ChatUser>()
    data.users.forEach((item: ChatUser) => unique.set(item.id, item))
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
    if (avatarRemovePending) {
      await fetchJson('/api/users/avatar', {
        method: 'DELETE',
        headers: authHeader,
      })
      setAvatarRemovePending(false)
    }
    const data = await fetchJson('/api/users/me', {
      method: 'PATCH',
      headers: authHeader,
      body: JSON.stringify({ displayName, email }),
    })
    setUser(data.user)
    setProfileDirty(false)
    if (data.requiresVerification) {
      clearToken()
      setAuthToken('')
      setUser(null)
      setConversations([])
      setMessages([])
      setActiveId(null)
      setVerificationSent(true)
      setAuthMode('login')
      setView('chat')
      navigate('/check-email')
    }
  }

  const updatePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const currentPassword = String(form.get('currentPassword') || '')
    const newPassword = String(form.get('newPassword') || '')
    const confirmNewPassword = String(form.get('confirmNewPassword') || '')
    if (!newPassword || newPassword !== confirmNewPassword) {
      window.alert('Passwords do not match.')
      return
    }
    await fetchJson('/api/users/password', {
      method: 'PATCH',
      headers: authHeader,
      body: JSON.stringify({ currentPassword, newPassword }),
    })
    event.currentTarget.reset()
    setPasswordDirty(false)
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

  const clearPendingFile = () => {
    if (pendingFilePreview) {
      URL.revokeObjectURL(pendingFilePreview)
    }
    setPendingFile(null)
    setPendingFilePreview('')
    setPendingFileName('')
    setPendingFileIsImage(false)
  }

  useEffect(() => {
    if (pendingFile) {
      clearPendingFile()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId])

  const uploadFile = async (file: File, replyTo?: string | null) => {
    if (!token || !activeId) return
    setUploadProgress(0)
    const form = new FormData()
    form.append('file', file)
    if (replyTo) {
      form.append('replyTo', replyTo)
    }
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
            prev.some((item) => item.id === message.id) ? prev : [...prev, message]
          )
        }
        resolve()
      }
      xhr.onerror = () => resolve()
      xhr.send(form)
    })
    setUploadProgress(null)
  }

  const sendMessage = async () => {
    if (!activeId || !token) return
    const text = messageText.trim()
    if (!text && !pendingFile) return
    if (editingMessageId) {
      if (!text) return
      const data = await fetchJson(`/api/messages/${editingMessageId}`, {
        method: 'PATCH',
        headers: authHeader,
        body: JSON.stringify({ text }),
      })
      const updated = mapMessage(data.message)
      setMessages((prev) =>
        prev.map((message) => (message.id === updated.id ? updated : message))
      )
      setMessageText('')
      setEditingMessageId(null)
      setReplyToId(null)
      return
    }
    setMessageText('')
    socketRef.current?.emit('typing:stop', { conversationId: activeId })
    if (pendingFile) {
      await uploadFile(pendingFile, replyToId)
      clearPendingFile()
    }
    if (!text) {
      setReplyToId(null)
      return
    }
    const data = await fetchJson(`/api/conversations/${activeId}/messages`, {
      method: 'POST',
      headers: authHeader,
      body: JSON.stringify({ text, replyTo: replyToId }),
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
    setReplyToId(null)
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

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.[0]) return
    const file = event.target.files[0]
    const isImage = file.type.startsWith('image/')
    if (pendingFilePreview) {
      URL.revokeObjectURL(pendingFilePreview)
    }
    setPendingFile(file)
    setPendingFileName(file.name)
    setPendingFileIsImage(isImage)
    setPendingFilePreview(isImage ? URL.createObjectURL(file) : '')
    event.target.value = ''
  }

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.[0]) return
    const file = event.target.files[0]
    if (!file.type.startsWith('image/')) {
      event.target.value = ''
      return
    }
    if (pendingFilePreview) {
      URL.revokeObjectURL(pendingFilePreview)
    }
    setPendingFile(file)
    setPendingFileName(file.name)
    setPendingFileIsImage(true)
    setPendingFilePreview(URL.createObjectURL(file))
    event.target.value = ''
  }

  const handlePasteImage = (event: React.ClipboardEvent<HTMLInputElement>) => {
    const items = event.clipboardData?.items
    if (!items) return
    const imageItem = Array.from(items).find((item) =>
      item.type.startsWith('image/')
    )
    if (!imageItem) return
    const file = imageItem.getAsFile()
    if (!file) return
    if (pendingFilePreview) {
      URL.revokeObjectURL(pendingFilePreview)
    }
    setPendingFile(file)
    setPendingFileName(file.name || 'pasted-image.png')
    setPendingFileIsImage(true)
    setPendingFilePreview(URL.createObjectURL(file))
    event.preventDefault()
  }

  const handleReplyMessage = (messageId: string) => {
    setEditingMessageId(null)
    setReplyToId(messageId)
  }

  const handleCancelReply = () => {
    setReplyToId(null)
  }

  const handleEditMessage = (message: Message) => {
    if (!message.text) return
    setEditingMessageId(message.id)
    setMessageText(message.text)
    setReplyToId(message.replyTo ?? null)
    if (pendingFile) {
      clearPendingFile()
    }
  }

  const handleCancelEdit = () => {
    setEditingMessageId(null)
    setMessageText('')
    setReplyToId(null)
  }

  const handleDeleteMessage = async (messageId: string) => {
    setConfirmState({ open: true, kind: 'delete-message', messageId })
  }

  const refreshMessages = async (conversationId: string) => {
    const data = await fetchJson(`/api/conversations/${conversationId}/messages`, {
      headers: authHeader,
    })
    setMessages(data.messages.map(mapMessage))
  }

  const clearChatForMe = async () => {
    if (!activeConversation) return
    const conversationId = activeConversation.id
    await fetchJson(`/api/conversations/${conversationId}/clear`, {
      method: 'POST',
      headers: authHeader,
    })
    setMessages([])
    await fetchConversations()
    setActiveId(conversationId)
    await refreshMessages(conversationId)
  }

  const leaveGroup = async () => {
    if (!activeConversation || activeConversation.type !== 'group') return
    await fetchJson(`/api/conversations/${activeConversation.id}/leave`, {
      method: 'POST',
      headers: authHeader,
    })
    setActiveId(null)
    setMessages([])
    await fetchConversations()
  }

  const removeFriend = async () => {
    if (!otherMemberId) return
    await fetchJson(`/api/friends/${otherMemberId}`, {
      method: 'DELETE',
      headers: authHeader,
    })
    setActiveId(null)
    setMessages([])
    await fetchConversations()
  }

  const handleConfirmAction = async () => {
    if (!confirmState.kind) return
    if (confirmState.kind === 'delete-message' && confirmState.messageId) {
      if (!token) return
      await fetchJson(`/api/messages/${confirmState.messageId}`, {
        method: 'DELETE',
        headers: authHeader,
      })
    }
    if (confirmState.kind === 'sign-out') {
      clearToken()
      setAuthToken('')
      setUser(null)
      setConversations([])
      setMessages([])
      setActiveId(null)
      setView('chat')
    }
    if (confirmState.kind === 'clear-chat') {
      await clearChatForMe()
    }
    if (confirmState.kind === 'leave-group') {
      await leaveGroup()
    }
    if (confirmState.kind === 'remove-friend') {
      await removeFriend()
    }
    setConfirmState({ open: false, kind: null, messageId: null })
  }

  const handleCloseConfirm = () => {
    setConfirmState({ open: false, kind: null, messageId: null })
  }

  const fetchFilePreviewUrl = async (fileId: string) => {
    if (filePreviewRef.current[fileId]) {
      return filePreviewRef.current[fileId]
    }
    if (!token) return null
    const response = await fetch(`${API_BASE}/api/files/${fileId}`, {
      headers: authHeader,
    })
    if (!response.ok) return null
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    filePreviewRef.current[fileId] = url
    return url
  }

  const handleAvatarSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (avatarCropSrc) {
      URL.revokeObjectURL(avatarCropSrc)
    }
    setAvatarDraftFile(file)
    setAvatarCropSrc(URL.createObjectURL(file))
    setAvatarCropScale(1)
    setAvatarCropOffset({ x: 0, y: 0 })
    setAvatarCropOpen(true)
    setAvatarRemovePending(false)
    setProfileDirty(true)
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
    setAvatarDraftFile(null)
    setAvatarCropSrc('')
    setProfileDirty(false)
  }

  const handleAvatarRemove = () => {
    setAvatarRemovePending(true)
    setAvatarFile(null)
    setAvatarName('')
    setAvatarPreview('')
    setAvatarDraftFile(null)
    setAvatarCropSrc('')
    setProfileDirty(true)
  }

  const handleAvatarCropApply = (blob: Blob) => {
    const name = avatarDraftFile?.name || 'avatar.png'
    const file = new File([blob], name, { type: blob.type || 'image/png' })
    setAvatarFile(file)
    setAvatarName(file.name)
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview)
    }
    setAvatarPreview(URL.createObjectURL(blob))
    setAvatarCropOpen(false)
    setAvatarDraftFile(null)
    setProfileDirty(true)
  }

  const handleAvatarCropClose = () => {
    setAvatarCropOpen(false)
    setAvatarDraftFile(null)
    setAvatarCropSrc('')
  }

  const handleAvatarCropEdit = () => {
    if (!avatarFile && !avatarPreview) return
    if (avatarCropSrc) {
      URL.revokeObjectURL(avatarCropSrc)
    }
    if (avatarFile) {
      setAvatarDraftFile(avatarFile)
      setAvatarCropSrc(URL.createObjectURL(avatarFile))
    } else if (avatarPreview) {
      fetch(avatarPreview)
        .then((response) => response.blob())
        .then((blob) => {
          const file = new File([blob], avatarName || 'avatar.png', {
            type: blob.type || 'image/png',
          })
          setAvatarDraftFile(file)
          setAvatarCropSrc(URL.createObjectURL(blob))
        })
        .catch(() => {})
    }
    setAvatarCropScale(1)
    setAvatarCropOffset({ x: 0, y: 0 })
    setAvatarCropOpen(true)
  }

  const handleAvatarCropReset = () => {
    setAvatarCropScale(1)
    setAvatarCropOffset({ x: 0, y: 0 })
  }

  const handleProfileFieldChange = () => {
    setProfileDirty(true)
  }

  const handlePasswordFieldChange = () => {
    setPasswordDirty(true)
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
    if (iceServersRef.current.length === 0) {
      try {
        const response = await fetchJson('/api/turn')
        iceServersRef.current =
          response.iceServers || [{ urls: 'stun:stun.l.google.com:19302' }]
      } catch {
        iceServersRef.current = [{ urls: 'stun:stun.l.google.com:19302' }]
      }
    }
    const config: RTCConfiguration = {
      iceServers: iceServersRef.current,
    }
    if (FORCE_TURN_RELAY) {
      config.iceTransportPolicy = 'relay'
    }
    const peer = new RTCPeerConnection(config)
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
      video:
        mode === 'video'
          ? LOW_BANDWIDTH_CALLS
            ? {
                width: { ideal: CALL_WIDTH },
                height: { ideal: CALL_HEIGHT },
                frameRate: { ideal: CALL_FPS, max: CALL_FPS },
              }
            : true
          : false,
    })
    localStreamRef.current = stream
    setLocalStream(stream)
    if (mode === 'video' && !cameraEnabledRef.current) {
      stream.getVideoTracks().forEach((track) => {
        track.enabled = false
      })
    }
    stream.getTracks().forEach((track) => peer.addTrack(track, stream))
    if (LOW_BANDWIDTH_CALLS && mode === 'video') {
      const sender = peer
        .getSenders()
        .find((item) => item.track && item.track.kind === 'video')
      if (sender) {
        const params = sender.getParameters()
        params.encodings = params.encodings || [{}]
        params.encodings[0].maxBitrate = CALL_MAX_BITRATE
        sender.setParameters(params).catch(() => {})
      }
    }
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
    await flushPendingIce(callState.conversationId, peer)
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
  const handleSetAuthMode = (mode: 'login' | 'register') => {
    setAuthMode(mode)
    setResetMode('')
    setVerificationSent(false)
    navigate(mode === 'login' ? '/login' : '/register')
  }

  const handleToggleAuthMode = () => {
    handleSetAuthMode(authMode === 'login' ? 'register' : 'login')
  }

  const handleSetResetMode = (mode: 'request' | 'reset' | '') => {
    setResetMode(mode)
    setVerificationSent(false)
    setAuthMode('login')
    if (mode === 'request') {
      navigate('/forgot')
    } else if (mode === 'reset') {
      navigate('/reset')
    } else {
      navigate('/login')
    }
  }

  const authPage = (
    <div className="min-h-screen">
      <div className="relative min-h-screen overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-32 top-20 h-72 w-72 rounded-full bg-indigo-500/30 blur-[120px]" />
          <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-cyan-400/20 blur-[140px]" />
          <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-purple-500/30 blur-[130px]" />
        </div>
        <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-md items-center px-6">
          <AuthCard
            authMode={authMode}
            authError={authError}
            verificationSent={verificationSent}
            verificationStatus={verificationStatus}
            authLoading={authLoading}
            resetMode={resetMode}
            resetNotice={resetNotice}
            showPassword={showPassword}
            showConfirmPassword={showConfirmPassword}
            showResetPassword={showResetPassword}
            showResetConfirmPassword={showResetConfirmPassword}
            onAuthSubmit={handleAuth}
            onForgotPasswordSubmit={handleForgotPassword}
            onResetPasswordSubmit={handleResetPassword}
            onSetAuthMode={handleSetAuthMode}
            onToggleAuthMode={handleToggleAuthMode}
            onSetResetMode={handleSetResetMode}
            onSetVerificationSent={setVerificationSent}
            onTogglePassword={() => setShowPassword((prev) => !prev)}
            onToggleConfirmPassword={() => setShowConfirmPassword((prev) => !prev)}
            onToggleResetPassword={() => setShowResetPassword((prev) => !prev)}
            onToggleResetConfirmPassword={() =>
              setShowResetConfirmPassword((prev) => !prev)
            }
          />
        </main>
      </div>
    </div>
  )

  const handleOpenFriends = () => {
    setFriendsOpen(true)
    loadFriends()
    loadRequests()
    setSearchQuery('')
    searchUsers('')
  }

  const handleOpenGroups = () => {
    setGroupOpen(true)
    loadFriends()
  }

  const handleSelectConversation = (conversationId: string) => {
    setActiveId(conversationId)
    setMobileChatsOpen(false)
  }

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

  const currentUser = user
  const chatShell = currentUser ? (
    <div className="h-screen w-screen overflow-hidden">
      <div className="flex h-full flex-col md:flex-row">

        {view === 'account' ? (
          <SettingsView
            theme={theme}
            onToggleTheme={() =>
              setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
            }
            onBackToChat={() => setView('chat')}
            user={currentUser}
            avatarPreview={avatarPreview}
            avatarName={avatarName}
            avatarFile={avatarFile}
            userAvatarSrc={getAvatarSrc(user)}
            avatarRemovePending={avatarRemovePending}
            showCurrentPassword={showCurrentPassword}
            showNewPassword={showNewPassword}
            showConfirmPassword={showConfirmNewPassword}
            ringtoneEnabled={ringtoneEnabled}
            ringtoneVolume={ringtoneVolume}
            ringtoneChoice={ringtoneChoice}
            pingEnabled={pingEnabled}
            pingVolume={pingVolume}
            pingChoice={pingChoice}
            onUpdateProfile={updateProfile}
            onProfileChange={handleProfileFieldChange}
            onUpdatePassword={updatePassword}
            onPasswordChange={handlePasswordFieldChange}
            onAvatarSelect={handleAvatarSelect}
            onAvatarUpload={handleAvatarUpload}
            onAvatarRemove={handleAvatarRemove}
            onAvatarEditCrop={handleAvatarCropEdit}
            onToggleShowCurrentPassword={() =>
              setShowCurrentPassword((prev) => !prev)
            }
            onToggleShowNewPassword={() => setShowNewPassword((prev) => !prev)}
            onToggleShowConfirmPassword={() =>
              setShowConfirmNewPassword((prev) => !prev)
            }
            onRingtoneEnabledChange={() => setRingtoneEnabled((prev) => !prev)}
            onRingtoneVolumeChange={setRingtoneVolume}
            onRingtoneChoiceChange={setRingtoneChoice}
            onPingEnabledChange={() => setPingEnabled((prev) => !prev)}
            onPingVolumeChange={setPingVolume}
            onPingChoiceChange={setPingChoice}
            profileDirty={profileDirty}
            passwordDirty={passwordDirty}
            onSignOut={() => {
              setConfirmState({ open: true, kind: 'sign-out' })
            }}
          />
        ) : view === 'admin' ? (
          <AdminView
            user={currentUser}
            authToken={token}
            onBackToChat={() => setView('chat')}
            onStartChat={async (userId) => {
              await createDirectChat(userId)
              setView('chat')
            }}
          />
        ) : (
          <>
            <ChatList
              className="hidden md:block m-4"
              groupedConversations={groupedConversations}
              activeId={activeId}
              user={currentUser}
              onlineUsers={onlineUsers}
              chatSearch={chatSearch}
              onChatSearchChange={setChatSearch}
              onSelectConversation={handleSelectConversation}
              onOpenFriends={handleOpenFriends}
              onOpenGroups={handleOpenGroups}
              theme={theme}
              onToggleTheme={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
              view={view}
              onOpenSettings={() => setView('account')}
              showAdmin={currentUser.roleId === 2}
              onOpenAdmin={() => setView('admin')}
              truncateText={truncateText}
            />

            <ChatView
              activeConversation={activeConversation}
              activeName={activeName}
              activeSubtitle={activeSubtitle}
              activeAvatarSrc={activeAvatarSrc}
              user={currentUser}
                groupedMessages={groupedMessages}
                hasMessages={groupedMessages.some((group) => group.items.length > 0)}
              typingUsers={typingUsers}
              chatSearchOpen={chatSearchOpen}
              onToggleChatSearchOpen={() => setChatSearchOpen((prev) => !prev)}
              chatSearchQuery={chatSearchQuery}
              onChatSearchQueryChange={setChatSearchQuery}
              chatSearchMatches={chatSearchMatches}
              chatSearchIndex={chatSearchIndex}
              onPrevSearchMatch={() =>
                setChatSearchIndex((prev) =>
                  prev === 0 ? chatSearchMatches.length - 1 : prev - 1
                )
              }
              onNextSearchMatch={() =>
                setChatSearchIndex((prev) =>
                  prev === chatSearchMatches.length - 1 ? 0 : prev + 1
                )
              }
              chatSearchRef={chatSearchRef}
              messageRefs={messageRefs}
              highlightText={highlightText}
              downloadFile={downloadFile}
              otherMemberId={otherMemberId}
              canCall={canCall}
              onStartCall={startCall}
                onOpenGroupManage={() => {
                  setGroupManageOpen(true)
                  loadFriends()
                }}
                onOpenMobileChats={() => setMobileChatsOpen(true)}
                onClearChat={() =>
                  setConfirmState({ open: true, kind: 'clear-chat' })
                }
                onLeaveGroup={() =>
                  setConfirmState({ open: true, kind: 'leave-group' })
                }
                onRemoveFriend={() =>
                  setConfirmState({ open: true, kind: 'remove-friend' })
                }
                messageText={messageText}
              onMessageTextChange={handleTyping}
              onSendMessage={sendMessage}
              replyToId={replyToId}
              editingMessageId={editingMessageId}
              onReplyMessage={handleReplyMessage}
              onCancelReply={handleCancelReply}
              onEditMessage={handleEditMessage}
              onCancelEdit={handleCancelEdit}
              onDeleteMessage={handleDeleteMessage}
              fileInputRef={fileInputRef}
              onFileChange={handleFileChange}
              imageInputRef={imageInputRef}
              onImageChange={handleImageChange}
              uploadProgress={uploadProgress}
                pendingFileName={pendingFileName}
                pendingFilePreview={pendingFilePreview}
                pendingFileIsImage={pendingFileIsImage}
                onClearPendingFile={clearPendingFile}
                onPasteImage={handlePasteImage}
                fetchFilePreviewUrl={fetchFilePreviewUrl}
              />

            {mobileChatsOpen ? (
              <div className="fixed inset-0 z-40 bg-black/60 p-4 md:hidden">
                <div className="absolute inset-0" onClick={() => setMobileChatsOpen(false)} />
                <div className="relative h-full">
                  <ChatList
                    className="m-0 h-full w-full max-w-none"
                    groupedConversations={groupedConversations}
                    activeId={activeId}
                    user={currentUser}
                    onlineUsers={onlineUsers}
                    chatSearch={chatSearch}
                    onChatSearchChange={setChatSearch}
                    onSelectConversation={handleSelectConversation}
                    onOpenFriends={handleOpenFriends}
                    onOpenGroups={handleOpenGroups}
                    theme={theme}
                    onToggleTheme={() =>
                      setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
                    }
                    view={view}
                    onOpenSettings={() => setView('account')}
                    showAdmin={currentUser.roleId === 2}
                    onOpenAdmin={() => setView('admin')}
                    truncateText={truncateText}
                  />
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
      <FriendsDialog
        open={friendsOpen}
        onOpenChange={setFriendsOpen}
        friends={friends}
        incomingRequests={incomingRequests}
        outgoingRequests={outgoingRequests}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        searchResults={searchResults}
        friendIdSet={friendIdSet}
        outgoingSet={outgoingSet}
        onCreateDirectChat={createDirectChat}
        onAcceptFriend={acceptFriend}
        onRejectFriend={rejectFriend}
        onSendFriendRequest={sendFriendRequest}
      />

      <GroupDialog
        open={groupOpen}
        onOpenChange={setGroupOpen}
        groupName={groupName}
        onGroupNameChange={setGroupName}
        friends={friends}
        selectedMembers={selectedMembers}
        onToggleMember={(userId, checked) => {
          if (checked) {
            setSelectedMembers((prev) => [...prev, userId])
          } else {
            setSelectedMembers((prev) => prev.filter((id) => id !== userId))
          }
        }}
        onCreateGroup={createGroup}
      />

      <GroupManageDialog
        open={groupManageOpen}
        onOpenChange={setGroupManageOpen}
        activeConversation={activeConversation}
        user={currentUser}
        friends={friends}
        manageMembers={manageMembers}
        onToggleManageMember={(userId, checked) => {
          if (checked) {
            setManageMembers((prev) => [...prev, userId])
          } else {
            setManageMembers((prev) => prev.filter((id) => id !== userId))
          }
        }}
        onRemoveMember={removeMemberFromGroup}
        onAddMembers={addMembersToGroup}
      />

      <CallOverlay
        callState={callState}
        callMinimized={callMinimized}
        remoteVideoReady={remoteVideoReady}
        remoteCameraOn={remoteCameraOn}
        cameraEnabled={cameraEnabled}
        micMuted={micMuted}
        speakerMuted={speakerMuted}
        remoteLevel={remoteLevel}
        localLevel={localLevel}
        activeName={activeName}
        activeAvatarSrc={activeAvatarSrc}
        userAvatarSrc={getAvatarSrc(user)}
        user={currentUser}
        remoteVideoRef={remoteVideoRef}
        remoteMiniRef={remoteMiniRef}
        localVideoRef={localVideoRef}
        onToggleCamera={toggleCamera}
        onToggleMic={toggleMic}
        onToggleSpeaker={toggleSpeaker}
        onAcceptCall={acceptCall}
        onEndCall={endCall}
        onToggleMinimized={setCallMinimized}
        renderWaveform={renderWaveform}
        onRemoteVideoReady={setRemoteVideoReady}
      />
      <AvatarCropDialog
        open={avatarCropOpen}
        imageSrc={avatarCropSrc}
        scale={avatarCropScale}
        offset={avatarCropOffset}
        onScaleChange={setAvatarCropScale}
        onOffsetChange={setAvatarCropOffset}
        onClose={handleAvatarCropClose}
        onApply={handleAvatarCropApply}
        onReset={handleAvatarCropReset}
      />
      <ConfirmDialog
        open={confirmState.open}
        title={
          confirmState.kind === 'delete-message'
            ? 'Delete message?'
            : confirmState.kind === 'clear-chat'
              ? 'Clear chat for you?'
              : confirmState.kind === 'leave-group'
                ? 'Exit group?'
                : confirmState.kind === 'remove-friend'
                  ? 'Remove friend?'
                  : 'Sign out?'
        }
        description={
          confirmState.kind === 'delete-message'
            ? 'This will remove the message for everyone in this chat.'
            : confirmState.kind === 'clear-chat'
              ? 'This will remove the chat history only for you.'
              : confirmState.kind === 'leave-group'
                ? 'You will leave the group and stop receiving new messages.'
                : confirmState.kind === 'remove-friend'
                  ? 'This will remove the friend and clear your chat history.'
                  : 'You can sign back in anytime.'
        }
        confirmLabel={
          confirmState.kind === 'delete-message'
            ? 'Delete'
            : confirmState.kind === 'clear-chat'
              ? 'Clear chat'
              : confirmState.kind === 'leave-group'
                ? 'Exit group'
                : confirmState.kind === 'remove-friend'
                  ? 'Remove friend'
                  : 'Sign out'
        }
        confirmTone={
          confirmState.kind === 'delete-message' ||
          confirmState.kind === 'clear-chat' ||
          confirmState.kind === 'leave-group' ||
          confirmState.kind === 'remove-friend'
            ? 'danger'
            : 'default'
        }
        onConfirm={handleConfirmAction}
        onClose={handleCloseConfirm}
      />
    </div>
  ) : null

  const isAuthed = Boolean(token && user)

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={authPage} />
      <Route path="/register" element={authPage} />
      <Route path="/forgot" element={authPage} />
      <Route path="/reset" element={authPage} />
      <Route path="/check-email" element={authPage} />
      <Route
        path="/app"
        element={isAuthed ? chatShell : <Navigate to="/" replace />}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App

