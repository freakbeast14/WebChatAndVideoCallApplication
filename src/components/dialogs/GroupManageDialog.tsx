import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import type { Conversation, User } from '@/types'

type GroupManageDialogProps = {
  open: boolean
  onOpenChange: (value: boolean) => void
  activeConversation: Conversation | null
  user: User
  friends: User[]
  manageMembers: string[]
  onToggleManageMember: (userId: string, checked: boolean) => void
  onRemoveMember: (userId: string) => void
  onAddMembers: () => void
}

const GroupManageDialog = ({
  open,
  onOpenChange,
  activeConversation,
  user,
  friends,
  manageMembers,
  onToggleManageMember,
  onRemoveMember,
  onAddMembers,
}: GroupManageDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
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
                      onClick={() => onRemoveMember(member.id)}
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
                    !activeConversation.members.some((member) => member.id === friend.id)
                )
                .map((friend) => (
                  <label key={friend.id} className="flex items-center justify-between text-sm">
                    <span>{friend.displayName}</span>
                    <input
                      type="checkbox"
                      checked={manageMembers.includes(friend.id)}
                      onChange={(event) => onToggleManageMember(friend.id, event.target.checked)}
                    />
                  </label>
                ))}
              {friends.filter(
                (friend) =>
                  !activeConversation.members.some((member) => member.id === friend.id)
              ).length === 0 ? (
                <p className="text-sm text-muted-foreground">No friends to add.</p>
              ) : null}
            </div>
          </div>
          <Button onClick={onAddMembers} disabled={manageMembers.length === 0}>
            Add selected
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No group selected.</p>
      )}
    </DialogContent>
  </Dialog>
)

export default GroupManageDialog
