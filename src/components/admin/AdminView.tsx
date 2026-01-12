import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, MessageSquare, Shield, Trash2, UserPlus, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import ConfirmDialog from '@/components/ui/confirm-dialog'
import { Input } from '@/components/ui/input'
import type { User } from '@/types'
import { API_BASE, fetchJson } from '@/lib/api'
import { getAvatarSrc } from '@/lib/chat'

type AdminGroup = {
  id: string
  name: string | null
  members?: User[]
}

type AuditLog = {
  id: string
  adminName: string
  adminEmail: string
  action: string
  targetId: string | null
  targetName?: string | null
  targetEmail?: string | null
  targetGroupName?: string | null
  friendName?: string | null
  friendEmail?: string | null
  memberName?: string | null
  memberEmail?: string | null
  meta: Record<string, unknown> | null
  createdAt: string
}

const formatAuditAction = (action: string) => {
  const map: Record<string, string> = {
    'admin.user.update': 'Updated user profile',
    'admin.user.avatar.update': 'Updated user avatar',
    'admin.user.avatar.remove': 'Removed user avatar',
    'admin.user.delete': 'Deleted user',
    'admin.friend.add': 'Added friend',
    'admin.friend.remove': 'Removed friend',
    'admin.group.create': 'Created group',
    'admin.group.member.add': 'Added group member',
    'admin.group.member.remove': 'Removed group member',
    'admin.group.delete': 'Deleted group',
    'admin.retention.update': 'Updated retention days',
    'admin.retention.purge': 'Ran retention cleanup',
  }
  return map[action] ?? action
}

type AdminViewProps = {
  user: User
  authToken: string
  onBackToChat: () => void
  onStartChat: (userId: string) => void
}

const AdminView = ({ authToken, onBackToChat, onStartChat }: AdminViewProps) => {
  const authHeader = useMemo(
    () => ({ Authorization: `Bearer ${authToken}` }),
    [authToken]
  )
  const [tab, setTab] = useState<'users' | 'groups' | 'system'>('users')
  const [userSearch, setUserSearch] = useState('')
  const [users, setUsers] = useState<User[]>([])
  const [groups, setGroups] = useState<AdminGroup[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPassword, setEditPassword] = useState('')
  const [friends, setFriends] = useState<User[]>([])
  const [userGroups, setUserGroups] = useState<AdminGroup[]>([])
  const [friendSearch, setFriendSearch] = useState('')
  const [friendResults, setFriendResults] = useState<User[]>([])
  const [groupMemberSearch, setGroupMemberSearch] = useState('')
  const [groupMemberResults, setGroupMemberResults] = useState<User[]>([])
  const [activeGroup, setActiveGroup] = useState<AdminGroup | null>(null)
  const [retentionDaysValue, setRetentionDaysValue] = useState(7)
  const [retentionDraft, setRetentionDraft] = useState('7')
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [purgeRunning, setPurgeRunning] = useState(false)
  const [createGroupName, setCreateGroupName] = useState('')
  const [createMemberSearch, setCreateMemberSearch] = useState('')
  const [createMemberResults, setCreateMemberResults] = useState<User[]>([])
  const [createMembers, setCreateMembers] = useState<User[]>([])
  const [confirmState, setConfirmState] = useState<{
    open: boolean
    kind:
      | 'delete-user'
      | 'delete-group'
      | 'remove-friend'
      | 'remove-group-member'
      | 'purge-retention'
      | null
    friendId?: string | null
    groupId?: string | null
    memberId?: string | null
  }>({ open: false, kind: null })

  const loadUsers = async (query = '') => {
    const data = await fetchJson(`/api/admin/users?q=${encodeURIComponent(query)}`, {
      headers: authHeader,
    })
    setUsers(data.users ?? [])
  }

  const loadGroups = async () => {
    const data = await fetchJson('/api/admin/groups', {
      headers: authHeader,
    })
    const nextGroups = data.groups ?? []
    setGroups(nextGroups)
    if (activeGroup) {
      const refreshed =
        nextGroups.find((group: AdminGroup) => group.id === activeGroup.id) ||
        null
      setActiveGroup(refreshed)
    }
  }

  const loadSettings = async () => {
    const data = await fetchJson('/api/admin/settings', {
      headers: authHeader,
    })
    setRetentionDaysValue(data.retentionDays)
    setRetentionDraft(String(data.retentionDays))
  }

  const loadAuditLogs = async () => {
    const data = await fetchJson('/api/admin/audit?limit=50', {
      headers: authHeader,
    })
    setAuditLogs(data.logs ?? [])
  }

  const loadUserDetails = async (targetId: string) => {
    const [friendsData, groupsData] = await Promise.all([
      fetchJson(`/api/admin/users/${targetId}/friends`, {
        headers: authHeader,
      }),
      fetchJson(`/api/admin/users/${targetId}/groups`, {
        headers: authHeader,
      }),
    ])
    setFriends(friendsData.friends ?? [])
    setUserGroups(groupsData.groups ?? [])
  }

  useEffect(() => {
    loadUsers('')
    loadGroups()
    loadSettings()
    loadAuditLogs()
  }, [])

  useEffect(() => {
    const handler = window.setTimeout(() => {
      loadUsers(userSearch.trim())
    }, 250)
    return () => window.clearTimeout(handler)
  }, [userSearch])

  useEffect(() => {
    if (!selectedUser) return
    setEditName(selectedUser.displayName)
    setEditEmail(selectedUser.email)
    setEditPassword('')
    loadUserDetails(selectedUser.id)
  }, [selectedUser?.id])

  useEffect(() => {
    if (!friendSearch.trim()) {
      setFriendResults([])
      return
    }
    fetchJson(`/api/admin/users?q=${encodeURIComponent(friendSearch.trim())}`, {
      headers: authHeader,
    })
      .then((data) => setFriendResults(data.users ?? []))
      .catch(() => setFriendResults([]))
  }, [friendSearch, authHeader])

  useEffect(() => {
    if (!groupMemberSearch.trim()) {
      setGroupMemberResults([])
      return
    }
    fetchJson(`/api/admin/users?q=${encodeURIComponent(groupMemberSearch.trim())}`, {
      headers: authHeader,
    })
      .then((data) => setGroupMemberResults(data.users ?? []))
      .catch(() => setGroupMemberResults([]))
  }, [groupMemberSearch, authHeader])

  useEffect(() => {
    if (!createMemberSearch.trim()) {
      setCreateMemberResults([])
      return
    }
    fetchJson(`/api/admin/users?q=${encodeURIComponent(createMemberSearch.trim())}`, {
      headers: authHeader,
    })
      .then((data) => setCreateMemberResults(data.users ?? []))
      .catch(() => setCreateMemberResults([]))
  }, [createMemberSearch, authHeader])

  const handleSelectUser = (target: User) => {
    setSelectedUser(target)
  }

  const handleSaveUser = async () => {
    if (!selectedUser) return
    const payload = {
      displayName: editName,
      email: editEmail,
      password: editPassword || undefined,
    }
    const data = await fetchJson(`/api/admin/users/${selectedUser.id}`, {
      method: 'PATCH',
      headers: authHeader,
      body: JSON.stringify(payload),
    })
    setSelectedUser(data.user)
    setUsers((prev) => prev.map((item) => (item.id === data.user.id ? data.user : item)))
    setEditPassword('')
    await loadAuditLogs()
  }

  const handleAvatarUpload = async (file: File) => {
    if (!selectedUser) return
    const formData = new FormData()
    formData.append('avatar', file)
    const response = await fetch(`${API_BASE}/api/admin/users/${selectedUser.id}/avatar`, {
      method: 'POST',
      headers: { Authorization: authHeader.Authorization },
      body: formData,
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(data?.error || 'Upload failed')
    }
    setSelectedUser(data.user)
    setUsers((prev) => prev.map((item) => (item.id === data.user.id ? data.user : item)))
    await loadAuditLogs()
  }

  const handleAvatarRemove = async () => {
    if (!selectedUser) return
    const data = await fetchJson(`/api/admin/users/${selectedUser.id}/avatar`, {
      method: 'DELETE',
      headers: authHeader,
    })
    setSelectedUser(data.user)
    setUsers((prev) => prev.map((item) => (item.id === data.user.id ? data.user : item)))
    await loadAuditLogs()
  }

  const handleAddFriend = async (friendId: string) => {
    if (!selectedUser) return
    await fetchJson(`/api/admin/users/${selectedUser.id}/friends`, {
      method: 'POST',
      headers: authHeader,
      body: JSON.stringify({ friendId }),
    })
    setFriendSearch('')
    loadUserDetails(selectedUser.id)
    await loadAuditLogs()
  }

  const handleRemoveFriend = async (friendId: string) => {
    if (!selectedUser) return
    await fetchJson(`/api/admin/users/${selectedUser.id}/friends/${friendId}`, {
      method: 'DELETE',
      headers: authHeader,
    })
    loadUserDetails(selectedUser.id)
    await loadAuditLogs()
  }

  const handleAddGroupMember = async (groupId: string, memberId: string) => {
    await fetchJson(`/api/admin/groups/${groupId}/members`, {
      method: 'POST',
      headers: authHeader,
      body: JSON.stringify({ memberIds: [memberId] }),
    })
    await loadGroups()
    await loadAuditLogs()
  }

  const handleRemoveGroupMember = async (groupId: string, memberId: string) => {
    await fetchJson(`/api/admin/groups/${groupId}/members/${memberId}`, {
      method: 'DELETE',
      headers: authHeader,
    })
    await loadGroups()
    await loadAuditLogs()
  }

  const handleSaveRetention = async () => {
    const nextValue = Number(retentionDraft)
    if (!Number.isFinite(nextValue)) return
    setSettingsSaving(true)
    try {
      const data = await fetchJson('/api/admin/settings/retention', {
        method: 'PATCH',
        headers: authHeader,
        body: JSON.stringify({ days: nextValue }),
      })
      setRetentionDaysValue(data.retentionDays)
      setRetentionDraft(String(data.retentionDays))
      await loadAuditLogs()
    } finally {
      setSettingsSaving(false)
    }
  }

  const handlePurgeRetention = async () => {
    setPurgeRunning(true)
    try {
      await fetchJson('/api/admin/retention/purge', {
        method: 'POST',
        headers: authHeader,
      })
      await loadAuditLogs()
    } finally {
      setPurgeRunning(false)
    }
  }

  const handleCreateGroup = async () => {
    if (!createGroupName.trim()) return
    const memberIds = createMembers.map((member) => member.id)
    await fetchJson('/api/admin/groups', {
      method: 'POST',
      headers: authHeader,
      body: JSON.stringify({ name: createGroupName.trim(), memberIds }),
    })
    setCreateGroupName('')
    setCreateMemberSearch('')
    setCreateMemberResults([])
    setCreateMembers([])
    await loadGroups()
    await loadAuditLogs()
  }

  const handleDeleteUser = async () => {
    if (!selectedUser) return
    await fetchJson(`/api/admin/users/${selectedUser.id}`, {
      method: 'DELETE',
      headers: authHeader,
    })
    setSelectedUser(null)
    await loadUsers(userSearch.trim())
    await loadAuditLogs()
  }

  const handleDeleteGroup = async () => {
    if (!activeGroup) return
    await fetchJson(`/api/admin/groups/${activeGroup.id}`, {
      method: 'DELETE',
      headers: authHeader,
    })
    setGroups((prev) => prev.filter((group) => group.id !== activeGroup.id))
    setActiveGroup(null)
    await loadAuditLogs()
  }

  const handleConfirm = async () => {
    if (confirmState.kind === 'delete-user') {
      await handleDeleteUser()
    }
    if (confirmState.kind === 'delete-group') {
      await handleDeleteGroup()
    }
    if (confirmState.kind === 'remove-friend' && confirmState.friendId) {
      await handleRemoveFriend(confirmState.friendId)
    }
    if (
      confirmState.kind === 'remove-group-member' &&
      confirmState.groupId &&
      confirmState.memberId
    ) {
      await handleRemoveGroupMember(confirmState.groupId, confirmState.memberId)
    }
    if (confirmState.kind === 'purge-retention') {
      await handlePurgeRetention()
    }
    setConfirmState({ open: false, kind: null })
  }

  const filteredFriendResults = friendResults.filter(
    (candidate) =>
      candidate.id !== selectedUser?.id &&
      !friends.some((friend) => friend.id === candidate.id)
  )

  const userDirty = Boolean(
    selectedUser &&
      (editName !== selectedUser.displayName ||
        editEmail !== selectedUser.email ||
        editPassword.trim().length > 0)
  )

  const filteredGroupResults = groupMemberResults.filter(
    (candidate) => !activeGroup?.members?.some((member) => member.id === candidate.id)
  )

  const filteredCreateResults = createMemberResults.filter(
    (candidate) => !createMembers.some((member) => member.id === candidate.id)
  )

  const retentionDirty =
    retentionDraft.trim().length > 0 &&
    Number(retentionDraft) !== retentionDaysValue &&
    Number(retentionDraft) >= 1 &&
    Number(retentionDraft) <= 365

  return (
    <div className="h-full w-full p-4 md:p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button size="icon" variant="ghost" onClick={onBackToChat} title="Back">
            <ArrowLeft size={18} />
          </Button>
          <div className="flex items-center gap-2 text-lg font-semibold">
            <Shield size={18} className="text-violet-300" />
            Admin Controls
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 p-1">
          <button
            type="button"
            onClick={() => setTab('users')}
            className={`rounded-full px-3 py-1 text-xs ${
              tab === 'users' ? 'bg-white/20 text-white' : 'text-muted-foreground'
            }`}
          >
            Users
          </button>
          <button
            type="button"
            onClick={() => setTab('groups')}
            className={`rounded-full px-3 py-1 text-xs ${
              tab === 'groups' ? 'bg-white/20 text-white' : 'text-muted-foreground'
            }`}
          >
            Groups
          </button>
          <button
            type="button"
            onClick={() => setTab('system')}
            className={`rounded-full px-3 py-1 text-xs ${
              tab === 'system' ? 'bg-white/20 text-white' : 'text-muted-foreground'
            }`}
          >
            System
          </button>
        </div>
      </div>

      {tab === 'users' ? (
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <Input
              placeholder="Search users"
              value={userSearch}
              onChange={(event) => setUserSearch(event.target.value)}
            />
            <div className="mt-4 space-y-2">
              {users.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSelectUser(item)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition ${
                    selectedUser?.id === item.id ? 'bg-white/20' : 'hover:bg-white/10'
                  }`}
                >
                  <div className="h-10 w-10 overflow-hidden rounded-full glass-soft">
                    {getAvatarSrc(item) ? (
                      <img
                        src={getAvatarSrc(item)}
                        alt={item.displayName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                        {item.displayName.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{item.displayName}</p>
                    <p
                      className="text-xs text-muted-foreground"
                      title={item.email}
                    >
                      {item.email.length > 28
                        ? `${item.email.slice(0, 28)}...`
                        : item.email}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            {selectedUser ? (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 overflow-hidden rounded-full glass-soft">
                      {getAvatarSrc(selectedUser) ? (
                        <img
                          src={getAvatarSrc(selectedUser)}
                          alt={selectedUser.displayName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                          {selectedUser.displayName.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Update avatar</p>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <label className="cursor-pointer rounded-full border border-white/20 bg-white/10 px-3 py-1">
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={(event) => {
                              const file = event.target.files?.[0]
                              if (file) {
                                handleAvatarUpload(file).catch(() => {})
                              }
                            }}
                          />
                          Upload
                        </label>
                        <Button size="sm" variant="ghost" onClick={handleAvatarRemove}>
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => onStartChat(selectedUser.id)}
                  >
                    <MessageSquare size={16} />
                    Chat
                  </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Display name</p>
                    <Input
                      value={editName}
                      onChange={(event) => setEditName(event.target.value)}
                    />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <Input
                      value={editEmail}
                      onChange={(event) => setEditEmail(event.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Reset password</p>
                  <Input
                    type="password"
                    placeholder="New password"
                    value={editPassword}
                    onChange={(event) => setEditPassword(event.target.value)}
                  />
                </div>
                <div className="flex justify-end">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      className="text-white bg-red-500 hover:bg-red-600"
                      onClick={() => setConfirmState({ open: true, kind: 'delete-user' })}
                    >
                      <Trash2 size={16} />
                      Delete user
                    </Button>
                    <Button onClick={handleSaveUser} disabled={!userDirty}>
                      Save changes
                    </Button>
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Users size={16} />
                    Friends
                  </div>
                  <div className="mt-3">
                    <Input
                      placeholder="Search users to add friend"
                      value={friendSearch}
                      onChange={(event) => setFriendSearch(event.target.value)}
                    />
                    {filteredFriendResults.length > 0 ? (
                      <div className="mt-3 space-y-2">
                        {filteredFriendResults.slice(0, 5).map((candidate) => (
                          <button
                            key={candidate.id}
                            onClick={() => handleAddFriend(candidate.id)}
                            className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-left text-sm hover:bg-white/10"
                          >
                            <span className="text-left">
                              <span className="block text-sm font-medium">
                                {candidate.displayName}
                              </span>
                              <span className="block text-xs text-muted-foreground">
                                {candidate.email}
                              </span>
                            </span>
                            <UserPlus size={16} className="text-violet-300" />
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="mt-4 space-y-2">
                    {friends.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        No friends added yet.
                      </p>
                    ) : (
                      friends.map((friend) => (
                        <div
                          key={friend.id}
                          className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"
                        >
                          <span>{friend.displayName}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-white bg-red-500 hover:bg-red-600"
                            onClick={() =>
                              setConfirmState({
                                open: true,
                                kind: 'remove-friend',
                                friendId: friend.id,
                              })
                            }
                          >
                            Remove
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm font-semibold">Groups</p>
                  <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                    {userGroups.length === 0
                      ? 'Not in any groups.'
                      : userGroups.map((group) => (
                          <div
                            key={group.id}
                            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2"
                          >
                            {group.name || 'Group'}
                          </div>
                        ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Select a user to manage their account.
              </p>
            )}
          </div>
        </div>
      ) : tab === 'groups' ? (
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm font-semibold">Groups</p>
            <div className="mt-4 space-y-2">
              {groups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => setActiveGroup(group)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition ${
                    activeGroup?.id === group.id ? 'bg-white/20' : 'hover:bg-white/10'
                  }`}
                >
                  <span className="text-sm">{group.name || 'Group'}</span>
                  <span className="text-xs text-muted-foreground">
                    {group.members?.length || 0}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="space-y-6">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-semibold">Create group</p>
                <div className="mt-3 space-y-3">
                  <Input
                    placeholder="Group name"
                    value={createGroupName}
                    onChange={(event) => setCreateGroupName(event.target.value)}
                  />
                  <Input
                    placeholder="Search users to add"
                    value={createMemberSearch}
                    onChange={(event) => setCreateMemberSearch(event.target.value)}
                  />
                  {filteredCreateResults.length > 0 ? (
                    <div className="space-y-2">
                      {filteredCreateResults.slice(0, 5).map((candidate) => (
                        <button
                          key={candidate.id}
                          onClick={() => {
                            setCreateMembers((prev) => [...prev, candidate])
                            setCreateMemberSearch('')
                            setCreateMemberResults([])
                          }}
                          className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
                        >
                          <span className="text-left">
                            <span className="block text-sm font-medium">
                              {candidate.displayName}
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              {candidate.email}
                            </span>
                          </span>
                          <UserPlus size={16} className="text-violet-300" />
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {createMembers.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {createMembers.map((member) => (
                        <button
                          key={member.id}
                          type="button"
                          onClick={() =>
                            setCreateMembers((prev) =>
                              prev.filter((item) => item.id !== member.id)
                            )
                          }
                          className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs text-muted-foreground hover:bg-white/20"
                        >
                          {member.displayName}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No members selected.</p>
                  )}
                  <div className="flex justify-end">
                    <Button
                      onClick={handleCreateGroup}
                      disabled={!createGroupName.trim()}
                    >
                      Create group
                    </Button>
                  </div>
                </div>
              </div>

              {activeGroup ? (
                <div className="space-y-5">
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-lg font-semibold">
                        {activeGroup.name || 'Group'}
                      </p>
                      <Button
                        variant="ghost"
                        className="text-white bg-red-500 hover:bg-red-600"
                        onClick={() =>
                          setConfirmState({ open: true, kind: 'delete-group' })
                        }
                      >
                        <Trash2 size={16} />
                        Delete group
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {activeGroup.members?.length || 0} members
                    </p>
                  </div>
                  <div>
                    <Input
                      placeholder="Search users to add"
                      value={groupMemberSearch}
                      onChange={(event) => setGroupMemberSearch(event.target.value)}
                    />
                    {filteredGroupResults.length > 0 ? (
                      <div className="mt-3 space-y-2">
                        {filteredGroupResults.slice(0, 5).map((candidate) => (
                        <button
                          key={candidate.id}
                          onClick={() =>
                            handleAddGroupMember(activeGroup.id, candidate.id)
                          }
                          className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
                        >
                          <span className="text-left">
                            <span className="block text-sm font-medium">
                              {candidate.displayName}
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              {candidate.email}
                            </span>
                          </span>
                          <UserPlus size={16} className="text-violet-300" />
                        </button>
                      ))}
                    </div>
                  ) : null}
                  </div>
                  <div className="space-y-2">
                    {activeGroup.members?.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"
                      >
                        <span>{member.displayName}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-white bg-red-500 hover:bg-red-600"
                          onClick={() =>
                            setConfirmState({
                              open: true,
                              kind: 'remove-group-member',
                              groupId: activeGroup.id,
                              memberId: member.id,
                            })
                          }
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Select a group to manage members.
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm font-semibold">Retention controls</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Adjust how long messages and files are kept (days).
            </p>
            <div className="mt-4 space-y-3">
              <Input
                type="number"
                min={1}
                max={365}
                value={retentionDraft}
                onChange={(event) => setRetentionDraft(event.target.value)}
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  onClick={handleSaveRetention}
                  disabled={!retentionDirty || settingsSaving}
                >
                  {settingsSaving ? 'Saving...' : 'Save retention'}
                </Button>
                <Button
                  variant="ghost"
                  className="text-white bg-red-500 hover:bg-red-600"
                  onClick={() =>
                    setConfirmState({ open: true, kind: 'purge-retention' })
                  }
                  disabled={purgeRunning}
                >
                  {purgeRunning ? 'Running cleanup...' : 'Run cleanup now'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Current retention: {retentionDaysValue} days.
              </p>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm font-semibold">Admin audit log</p>
            <div className="mt-4 space-y-3 text-sm text-muted-foreground">
              {auditLogs.length === 0 ? (
                <p>No admin actions logged yet.</p>
              ) : (
                auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-3"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span>
                        {log.adminName} ({log.adminEmail})
                      </span>
                      <span>{new Date(log.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="mt-2 text-sm text-foreground">
                      {formatAuditAction(log.action)}
                    </p>
                    {log.targetName || log.targetEmail || log.targetGroupName ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Target:{' '}
                        {log.targetGroupName
                          ? log.targetGroupName
                          : log.targetName
                            ? `${log.targetName}${log.targetEmail ? ` (${log.targetEmail})` : ''}`
                            : log.targetEmail || log.targetId}
                      </p>
                    ) : null}
                    {log.friendName || log.friendEmail ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Friend:{' '}
                        {log.friendName
                          ? `${log.friendName}${log.friendEmail ? ` (${log.friendEmail})` : ''}`
                          : log.friendEmail}
                      </p>
                    ) : null}
                    {log.memberName || log.memberEmail ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Member:{' '}
                        {log.memberName
                          ? `${log.memberName}${log.memberEmail ? ` (${log.memberEmail})` : ''}`
                          : log.memberEmail}
                      </p>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={confirmState.open}
        title={
          confirmState.kind === 'delete-user'
            ? 'Delete user?'
            : confirmState.kind === 'delete-group'
              ? 'Delete group?'
              : confirmState.kind === 'remove-friend'
                ? 'Remove friend?'
                : confirmState.kind === 'remove-group-member'
                  ? 'Remove member?'
                  : 'Run cleanup now?'
        }
        description={
          confirmState.kind === 'delete-user'
            ? 'This permanently deletes the user and their data.'
            : confirmState.kind === 'delete-group'
              ? 'This deletes the group and its chat history.'
            : confirmState.kind === 'remove-friend'
              ? 'This removes the friend and clears their chat history.'
              : confirmState.kind === 'remove-group-member'
                ? 'This removes the member from the group.'
                : 'This will purge all expired chats and files immediately.'
        }
        confirmLabel={
          confirmState.kind === 'delete-user'
            ? 'Delete user'
            : confirmState.kind === 'delete-group'
              ? 'Delete group'
            : confirmState.kind === 'remove-friend'
              ? 'Remove friend'
              : confirmState.kind === 'remove-group-member'
                ? 'Remove member'
                : 'Run cleanup'
        }
        confirmTone="danger"
        onConfirm={handleConfirm}
        onClose={() => setConfirmState({ open: false, kind: null })}
      />
    </div>
  )
}

export default AdminView
