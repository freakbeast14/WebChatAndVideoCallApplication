import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { User } from '@/types'

type GroupDialogProps = {
  open: boolean
  onOpenChange: (value: boolean) => void
  groupName: string
  onGroupNameChange: (value: string) => void
  friends: User[]
  selectedMembers: string[]
  onToggleMember: (userId: string, checked: boolean) => void
  onCreateGroup: () => void
}

const GroupDialog = ({
  open,
  onOpenChange,
  groupName,
  onGroupNameChange,
  friends,
  selectedMembers,
  onToggleMember,
  onCreateGroup,
}: GroupDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Create group</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Group name</Label>
          <Input value={groupName} onChange={(event) => onGroupNameChange(event.target.value)} />
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
                  onChange={(event) => onToggleMember(friend.id, event.target.checked)}
                />
              </label>
            ))}
          </div>
        </div>
        <Button onClick={onCreateGroup}>Create group</Button>
      </div>
    </DialogContent>
  </Dialog>
)

export default GroupDialog
