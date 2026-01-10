import { Check, MessageSquare, Search, UserPlus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { FriendRequest, User } from '@/types'

type FriendsDialogProps = {
  open: boolean
  onOpenChange: (value: boolean) => void
  friends: User[]
  incomingRequests: FriendRequest[]
  outgoingRequests: FriendRequest[]
  searchQuery: string
  onSearchQueryChange: (value: string) => void
  searchResults: User[]
  friendIdSet: Set<string>
  outgoingSet: Set<string>
  onCreateDirectChat: (userId: string) => void
  onAcceptFriend: (requestId: string) => void
  onRejectFriend: (requestId: string) => void
  onSendFriendRequest: (userId: string) => void
}

const FriendsDialog = ({
  open,
  onOpenChange,
  friends,
  incomingRequests,
  outgoingRequests,
  searchQuery,
  onSearchQueryChange,
  searchResults,
  friendIdSet,
  outgoingSet,
  onCreateDirectChat,
  onAcceptFriend,
  onRejectFriend,
  onSendFriendRequest,
}: FriendsDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
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
            <div
              key={friend.id}
              className="flex items-center justify-between rounded-lg glass-soft p-3"
            >
              <div>
                <p className="text-sm font-semibold">{friend.displayName}</p>
                <p className="text-xs text-muted-foreground">{friend.email}</p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onCreateDirectChat(friend.id)}
              >
                <MessageSquare size={18} />
              </Button>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="requests" className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Incoming
            </p>
            {incomingRequests.length === 0 ? (
              <div className="rounded-lg glass-soft p-3 text-sm text-muted-foreground">
                No incoming requests.
              </div>
            ) : null}
            {incomingRequests.map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between rounded-lg glass-soft p-3"
              >
                <div>
                  <p className="text-sm font-semibold">{request.user.displayName}</p>
                  <p className="text-xs text-muted-foreground">{request.user.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => onAcceptFriend(request.id)}
                  >
                    <Check size={16} />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => onRejectFriend(request.id)}
                  >
                    <X size={16} />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Outgoing
            </p>
            {outgoingRequests.length === 0 ? (
              <div className="rounded-lg glass-soft p-3 text-sm text-muted-foreground">
                No outgoing requests.
              </div>
            ) : null}
            {outgoingRequests.map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between rounded-lg glass-soft p-3"
              >
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
              onChange={(event) => onSearchQueryChange(event.target.value)}
            />
          </div>
          {searchResults.map((person) => {
            const isFriend = friendIdSet.has(person.id)
            const pending = outgoingSet.has(person.id)
            return (
              <div
                key={person.id}
                className="flex items-center justify-between rounded-lg glass-soft p-3"
              >
                <div>
                  <p className="text-sm font-semibold">{person.displayName}</p>
                  <p className="text-xs text-muted-foreground">{person.email}</p>
                </div>
                {isFriend ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onCreateDirectChat(person.id)}
                  >
                    <MessageSquare size={18} />
                  </Button>
                ) : (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => onSendFriendRequest(person.id)}
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
)

export default FriendsDialog
