import type { FormEvent } from 'react'
import { Info, Eye, EyeOff, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type AuthCardProps = {
  authMode: 'login' | 'register'
  authError: string
  verificationSent: boolean
  verificationStatus: 'success' | 'error' | ''
  authLoading: boolean
  resetMode: 'request' | 'reset' | ''
  resetNotice: string
  showPassword: boolean
  showConfirmPassword: boolean
  showResetPassword: boolean
  showResetConfirmPassword: boolean
  onAuthSubmit: (event: FormEvent<HTMLFormElement>) => void
  onForgotPasswordSubmit: (event: FormEvent<HTMLFormElement>) => void
  onResetPasswordSubmit: (event: FormEvent<HTMLFormElement>) => void
  onSetAuthMode: (mode: 'login' | 'register') => void
  onToggleAuthMode: () => void
  onSetResetMode: (mode: 'request' | 'reset' | '') => void
  onSetVerificationSent: (value: boolean) => void
  onTogglePassword: () => void
  onToggleConfirmPassword: () => void
  onToggleResetPassword: () => void
  onToggleResetConfirmPassword: () => void
}

const AuthCard = ({
  authMode,
  authError,
  verificationSent,
  verificationStatus,
  authLoading,
  resetMode,
  resetNotice,
  showPassword,
  showConfirmPassword,
  showResetPassword,
  showResetConfirmPassword,
  onAuthSubmit,
  onForgotPasswordSubmit,
  onResetPasswordSubmit,
  onSetAuthMode,
  onToggleAuthMode,
  onSetResetMode,
  onSetVerificationSent,
  onTogglePassword,
  onToggleConfirmPassword,
  onToggleResetPassword,
  onToggleResetConfirmPassword,
}: AuthCardProps) => {
  if (verificationSent) {
    return (
      <div className="w-full space-y-6 rounded-2xl glass p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/10">
          <Mail size={22} />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Check your inbox/spam</h2>
          <p className="text-sm text-muted-foreground">
            We have sent a verification email.
          </p>
        </div>
        <Button
          onClick={() => {
            onSetVerificationSent(false)
            onSetAuthMode('login')
          }}
        >
          Go to login
        </Button>
      </div>
    )
  }

  if (resetMode === 'request') {
    return (
      <form className="w-full space-y-6 rounded-2xl glass p-8" onSubmit={onForgotPasswordSubmit}>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">Reset password</h2>
          <p className="text-sm text-muted-foreground">
            Enter your email and we&apos;ll send a reset link.
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
        <button
          type="button"
          className="w-full text-sm text-muted-foreground hover:underline"
          disabled={authLoading}
          onClick={() => onSetResetMode('')}
        >
          Back to login
        </button>
      </form>
    )
  }

  if (resetMode === 'reset') {
    return (
      <form className="w-full space-y-6 rounded-2xl glass p-8" onSubmit={onResetPasswordSubmit}>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">Set a new password</h2>
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
              onClick={onToggleResetPassword}
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
              onClick={onToggleResetConfirmPassword}
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
        <button
          type="button"
          className="w-full text-sm text-muted-foreground hover:underline"
          disabled={authLoading}
          onClick={() => onSetResetMode('')}
        >
          Back to login
        </button>
      </form>
    )
  }

  return (
    <form className="w-full space-y-6 rounded-2xl glass p-8" onSubmit={onAuthSubmit}>
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold">Welcome back</h2>
        <p className="text-sm text-muted-foreground">
          Sign in to pick up your conversations.
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
              <span className="pointer-events-none absolute bottom-full left-1/2 hidden -translate-x-1/2 -translate-y-2 whitespace-nowrap rounded-md bg-black px-3 py-2 text-xs text-white shadow-md group-hover:block">
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
            onClick={onTogglePassword}
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
              onClick={onToggleConfirmPassword}
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
      <div
        className={`flex flex-col gap-2 md:flex-row md:items-center ${
          authMode === 'login' ? 'md:justify-between' : 'md:justify-center'
        }`}
      >
        {authMode === 'login' ? (
          <button
            type="button"
            className="text-sm text-muted-foreground hover:underline"
            disabled={authLoading}
            onClick={() => onSetResetMode('request')}
          >
            Forgot password?
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          className="text-sm text-muted-foreground hover:underline"
          disabled={authLoading}
          onClick={onToggleAuthMode}
        >
          {authMode === 'login'
            ? 'New here? Create an account'
            : 'Already have an account? Sign in'}
        </button>
      </div>
    </form>
  )
}

export default AuthCard
