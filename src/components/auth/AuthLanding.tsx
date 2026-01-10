import type { FormEvent } from 'react'
import { MessageSquare, Info, Eye, EyeOff, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type AuthLandingProps = {
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

const AuthLanding = ({
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
}: AuthLandingProps) => {
  const renderAuthCard = () => {
    if (verificationSent) {
      return (
        <div className="w-full space-y-6 rounded-2xl glass p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/10">
            <Mail size={22} />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Check your inbox</h2>
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

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-20 h-72 w-72 rounded-full bg-indigo-500/30 blur-[120px]" />
        <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-cyan-400/20 blur-[140px]" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-purple-500/30 blur-[130px]" />
      </div>

      <header className="relative z-10 flex items-center justify-between px-6 py-6 md:px-12">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
            <MessageSquare size={18} />
          </div>
          ChatApp
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={() => {
              onSetAuthMode('login')
              onSetResetMode('')
            }}
          >
            Sign in
          </Button>
          <Button
            onClick={() => {
              onSetAuthMode('register')
              onSetResetMode('')
            }}
          >
            Get started
          </Button>
        </div>
      </header>

      <main className="relative z-10 mx-auto grid w-full max-w-6xl gap-10 px-6 pb-16 pt-6 md:grid-cols-[1.1fr_0.9fr] md:px-12">
        <div className="space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.25em] text-white/70">
            Private messaging that expires
          </div>
          <div className="space-y-4">
            <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
              A sleek, secure chat experience built for focus.
            </h1>
            <p className="text-base text-muted-foreground md:text-lg">
              ChatApp brings messaging, file sharing, and video calls into one clean
              space. Messages and files auto-expire after 7 days for privacy by
              default.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              className="px-6"
              onClick={() => {
                onSetAuthMode('register')
                onSetResetMode('')
              }}
            >
              Create account
            </Button>
            <Button
              variant="outline"
              className="px-6"
              onClick={() => {
                onSetAuthMode('login')
                onSetResetMode('')
              }}
            >
              Sign in
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                title: 'Live presence',
                description: 'See who is online and when they are typing.',
              },
              {
                title: 'Secure by design',
                description: 'Messages and files expire after 7 days.',
              },
              {
                title: 'Group ready',
                description: 'Create group chats and manage members easily.',
              },
              {
                title: 'HD calls',
                description: 'Instant audio and video with live controls.',
              },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl glass p-4">
                <p className="text-sm font-semibold">{item.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-start justify-center md:justify-end">
          <div className="w-full max-w-md">{renderAuthCard()}</div>
        </div>
      </main>

      <section className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-16 md:px-12">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              title: 'Media friendly',
              description: 'Share files, photos, and voice notes instantly.',
            },
            {
              title: 'Modern interface',
              description: 'Glassmorphism UI with light and dark modes.',
            },
            {
              title: 'Designed for mobile',
              description: 'Optimized layouts across phones, tablets, and desktop.',
            },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl glass p-6">
              <p className="text-base font-semibold">{item.title}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

export default AuthLanding
