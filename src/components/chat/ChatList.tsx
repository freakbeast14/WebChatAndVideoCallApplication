import { Moon, Search, Settings, Shield, Sun, User, UserPlus, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getAvatarSrc } from '@/lib/chat'
import type { Conversation, User as UserType } from '@/types'

type ConversationGroup = {
  label: string
  items: Conversation[]
}

type ChatListProps = {
  groupedConversations: ConversationGroup[]
  activeId: string | null
  user: UserType
  onlineUsers: Record<string, boolean>
  chatSearch: string
  onChatSearchChange: (value: string) => void
  onSelectConversation: (id: string) => void
  onOpenFriends: () => void
  onOpenGroups: () => void
  theme: 'dark' | 'light'
  onToggleTheme: () => void
  view: 'chat' | 'account' | 'admin'
  onOpenSettings: () => void
  showAdmin: boolean
  onOpenAdmin: () => void
  truncateText: (value: string, max?: number) => string
  className?: string
}

const ChatList = ({
  groupedConversations,
  activeId,
  user,
  onlineUsers,
  chatSearch,
  onChatSearchChange,
  onSelectConversation,
  onOpenFriends,
  onOpenGroups,
  theme,
  onToggleTheme,
  view,
  onOpenSettings,
  showAdmin,
  onOpenAdmin,
  truncateText,
  className = '',
}: ChatListProps) => (
  <section className={`w-full md:w-[360px] glass rounded-2xl ${className}`}>
    <div className="flex items-center justify-between px-5 py-4">
      <h2 className="text-lg font-semibold">Chats</h2>
      <div className="flex items-center gap-2">
        <Button size="icon" variant="ghost" onClick={onOpenFriends} title="Add friends">
          <UserPlus size={18} />
        </Button>
        <Button size="icon" variant="ghost" onClick={onOpenGroups} title="New group">
          <Users size={18} />
        </Button>
        <Button size="icon" variant="ghost" onClick={onToggleTheme} title="Toggle theme">
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </Button>
        <Button
          size="icon"
          variant={view === 'account' ? 'default' : 'ghost'}
          onClick={onOpenSettings}
          title="Settings"
        >
          <Settings size={18} />
        </Button>
        {showAdmin ? (
          <Button
            size="icon"
            variant={view === 'admin' ? 'default' : 'ghost'}
            onClick={onOpenAdmin}
            title="Admin"
          >
            <Shield size={18} />
          </Button>
        ) : null}
      </div>
    </div>
    <div className="px-4 pb-3">
      <div className="flex items-center gap-2 rounded-full glass-soft px-4 py-2">
        <Search size={16} className="text-muted-foreground" />
        <input
          className="w-full bg-transparent text-sm outline-none"
          placeholder="Search chats"
          value={chatSearch}
          onChange={(event) => onChatSearchChange(event.target.value)}
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
                  : chat.members.find((member) => member.id !== user.id)
                      ?.displayName || 'Direct chat'
              const avatarMember =
                chat.type === 'direct'
                  ? chat.members.find((member) => member.id !== user.id)
                  : null
              const avatarSrc = getAvatarSrc(avatarMember)
              const isOnline =
                avatarMember && onlineUsers[avatarMember.id] && chat.type === 'direct'
              return (
                <button
                  key={chat.id}
                  className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition ${
                    isActive ? 'bg-white/20 shadow-sm' : 'hover:bg-white/10'
                  }`}
                  onClick={() => onSelectConversation(chat.id)}
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
                    <p
                      className="text-xs text-muted-foreground"
                      title={
                        chat.last_message
                          ? chat.last_message?.text
                            ? chat.last_message.text
                            : ''
                          : undefined
                      }
                    >
                      {chat.last_message
                        ? truncateText(chat.last_message.text ? chat.last_message.text : '', 35) ||
                          'Attachment'
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

export default ChatList
