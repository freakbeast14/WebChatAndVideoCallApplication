import type { ChangeEvent, FormEvent } from 'react'
import {
  ArrowLeft,
  Eye,
  EyeOff,
  LogOut,
  MessageSquare,
  Moon,
  Sun,
  User,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { User as UserType } from '@/types'

type SettingsViewProps = {
  theme: 'dark' | 'light'
  onToggleTheme: () => void
  onBackToChat: () => void
  user: UserType
  avatarPreview: string
  avatarName: string
  avatarFile: File | null
  userAvatarSrc: string
  showCurrentPassword: boolean
  showNewPassword: boolean
  ringtoneEnabled: boolean
  ringtoneVolume: number
  ringtoneChoice: string
  pingEnabled: boolean
  pingVolume: number
  pingChoice: string
  onUpdateProfile: (event: FormEvent<HTMLFormElement>) => void
  onUpdatePassword: (event: FormEvent<HTMLFormElement>) => void
  onAvatarSelect: (event: ChangeEvent<HTMLInputElement>) => void
  onAvatarUpload: () => void
  onToggleShowCurrentPassword: () => void
  onToggleShowNewPassword: () => void
  onRingtoneEnabledChange: () => void
  onRingtoneVolumeChange: (value: number) => void
  onRingtoneChoiceChange: (value: string) => void
  onPingEnabledChange: () => void
  onPingVolumeChange: (value: number) => void
  onPingChoiceChange: (value: string) => void
  onSignOut: () => void
}

const SettingsView = ({
  theme,
  onToggleTheme,
  onBackToChat,
  user,
  avatarPreview,
  avatarName,
  avatarFile,
  userAvatarSrc,
  showCurrentPassword,
  showNewPassword,
  ringtoneEnabled,
  ringtoneVolume,
  ringtoneChoice,
  pingEnabled,
  pingVolume,
  pingChoice,
  onUpdateProfile,
  onUpdatePassword,
  onAvatarSelect,
  onAvatarUpload,
  onToggleShowCurrentPassword,
  onToggleShowNewPassword,
  onRingtoneEnabledChange,
  onRingtoneVolumeChange,
  onRingtoneChoiceChange,
  onPingEnabledChange,
  onPingVolumeChange,
  onPingChoiceChange,
  onSignOut,
}: SettingsViewProps) => (
  <main className="flex-1 overflow-y-auto p-4 pb-24 md:p-8">
    <div className="space-y-8">
      <div className="flex items-center justify-between md:hidden">
        <Button size="icon" variant="ghost" onClick={onBackToChat}>
          <MessageSquare size={18} />
        </Button>
        <h2 className="text-sm font-semibold">Account settings</h2>
        <Button size="icon" variant="ghost" onClick={onToggleTheme}>
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
              onClick={onBackToChat}
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
              onClick={onToggleTheme}
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
              onClick={onRingtoneEnabledChange}
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
              onChange={(event) => onRingtoneVolumeChange(Number(event.target.value))}
            />
          </div>
          <div className="space-y-2 rounded-lg glass-soft px-4 py-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Ringtone tone</p>
            </div>
            <select
              className="w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-slate-900 dark:border-white/10 dark:bg-slate-900/70 dark:text-white"
              value={ringtoneChoice}
              onChange={(event) => onRingtoneChoiceChange(event.target.value)}
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
              onClick={onPingEnabledChange}
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
              onChange={(event) => onPingVolumeChange(Number(event.target.value))}
            />
          </div>
          <div className="space-y-2 rounded-lg glass-soft px-4 py-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Ping tone</p>
            </div>
            <select
              className="w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-slate-900 dark:border-white/10 dark:bg-slate-900/70 dark:text-white"
              value={pingChoice}
              onChange={(event) => onPingChoiceChange(event.target.value)}
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
          <form className="space-y-4 rounded-2xl glass p-6" onSubmit={onUpdateProfile}>
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
                  ) : userAvatarSrc ? (
                    <img
                      src={userAvatarSrc}
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
                      onChange={onAvatarSelect}
                    />
                    <span className="inline-flex w-full items-center justify-center rounded-md border border-white/20 px-3 py-2 text-xs font-medium text-foreground hover:bg-white/10 sm:w-auto">
                      Choose
                    </span>
                  </label>
                  <Button
                    type="button"
                    size="sm"
                    onClick={onAvatarUpload}
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

          <form className="space-y-4 rounded-2xl glass p-6" onSubmit={onUpdatePassword}>
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
                  onClick={onToggleShowCurrentPassword}
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
                  onClick={onToggleShowNewPassword}
                  title={showNewPassword ? 'Hide password' : 'Show password'}
                >
                  {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <Button type="submit">Update password</Button>
          </form>

          <Button variant="outline" onClick={onSignOut}>
            <LogOut size={16} />
            Sign out
          </Button>
        </div>
      </div>
    </div>
  </main>
)

export default SettingsView
