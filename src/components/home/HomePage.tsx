import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { buttonVariants } from '@/components/ui/button'

const HomePage = () => {
  const features = [
    {
      title: 'Live presence',
      description: 'See who is online and when they are typing.',
      tags: ['Typing status', 'Online badges', 'Instant updates', 'Active now'],
    },
    {
      title: 'Secure by design',
      description: 'Messages and files expire after 7 days.',
      tags: ['Auto-expire', 'Privacy first', 'No clutter', 'Secure storage'],
    },
    {
      title: 'Group ready',
      description: 'Create group chats and manage members easily.',
      tags: ['Member roles', 'Group calls', 'Mentions', 'Shared context'],
    },
    {
      title: 'HD calls',
      description: 'Instant audio and video with live controls.',
      tags: ['Noise control', 'Low latency', 'Screen ready', 'Live indicators'],
    },
    {
      title: 'Media friendly',
      description: 'Share files, photos, and voice notes instantly.',
      tags: ['Fast uploads', 'Inline previews', 'Download links', 'File types'],
    },
    {
      title: 'Modern interface',
      description: 'Glassmorphism UI with light and dark modes.',
      tags: ['Adaptive themes', 'Soft blur', 'Clean layout', 'Responsive'],
    },
    {
      title: 'Designed for mobile',
      description: 'Optimized layouts across phones, tablets, and desktop.',
      tags: ['Thumb friendly', 'Quick nav', 'Compact views', 'Touch gestures'],
    },
  ]
  const [activeIndex, setActiveIndex] = useState(0)

  const handlePrev = () => {
    setActiveIndex((prev) => (prev === 0 ? features.length - 1 : prev - 1))
  }

  const handleNext = () => {
    setActiveIndex((prev) => (prev === features.length - 1 ? 0 : prev + 1))
  }

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev === features.length - 1 ? 0 : prev + 1))
    }, 5000)
    return () => window.clearInterval(timer)
  }, [features.length])

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-20 h-72 w-72 rounded-full bg-indigo-500/30 blur-[120px]" />
        <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-cyan-400/20 blur-[140px]" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-purple-500/30 blur-[130px]" />
      </div>

      <header className="relative z-10 flex items-center justify-between px-6 py-6 md:px-12">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <div className="flex h-9 w-9 items-center justify-center">
            <img src="/logo.svg" alt="SafeChat" />
          </div>
          SafeChat
        </div>
        <div className="flex items-center gap-2">
          <Link to="/login" className={buttonVariants({ variant: 'ghost' })}>
            Sign in
          </Link>
          <Link to="/register" className={buttonVariants({})}>
            Get started
          </Link>
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
              SafeChat brings messaging, file sharing, and video calls into one clean
              space. Messages and files auto-expire after 7 days for privacy by
              default.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link to="/register" className={buttonVariants({ className: 'px-6' })}>
              Create account
            </Link>
            <Link
              to="/login"
              className={buttonVariants({ variant: 'outline', className: 'px-6' })}
            >
              Sign in
            </Link>
          </div>
          <div className="mt-2 relative">
            <div className="relative rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <p className="text-sm font-semibold">{features[activeIndex].title}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {features[activeIndex].description}
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-[11px] text-muted-foreground">
                    {features[activeIndex].tags.map((tag) => (
                      <div
                        key={tag}
                        className="rounded-lg border border-white/10 bg-white/5 px-3 py-2"
                      >
                        {tag}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="hidden w-28 shrink-0 md:block">
                  <svg viewBox="0 0 120 120" className="h-28 w-28">
                    <defs>
                      <linearGradient id="featureGlow" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0" stopColor="#7c5cff" />
                        <stop offset="1" stopColor="#22d3ee" />
                      </linearGradient>
                    </defs>
                    <circle cx="60" cy="60" r="52" fill="url(#featureGlow)" opacity="0.2" />
                    <circle cx="60" cy="60" r="38" fill="url(#featureGlow)" opacity="0.45" />
                    <path
                      d="M36 60c6-14 18-22 30-22 12 0 24 8 30 22-6 14-18 22-30 22-12 0-24-8-30-22Z"
                      fill="#0f172a"
                      opacity="0.7"
                    />
                    <circle cx="60" cy="60" r="10" fill="#e2e8f0" />
                  </svg>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handlePrev}
              className="absolute top-1/2 -translate-y-1/2 rounded-full border border-white/25 bg-white/20 p-2 text-white shadow-lg backdrop-blur hover:bg-white/30"
              aria-label="Previous feature"
              style={{ left: -15 }}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor">
                <path d="M15 18l-6-6 6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="absolute top-1/2 -translate-y-1/2 rounded-full border border-white/25 bg-white/20 p-2 text-white shadow-lg backdrop-blur hover:bg-white/30"
              aria-label="Next feature"
              style={{ right: -15 }}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor">
                <path d="M9 6l6 6-6 6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <div className="mt-4 flex items-center justify-center gap-2">
              {features.map((item, index) => (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className={`rounded-full transition ${
                    index === activeIndex
                      ? 'bg-white'
                      : 'bg-muted'
                  }`}
                  style={{ height: 10, width: 10 }}
                  aria-label={`Go to ${item.title}`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-start justify-center md:justify-end">
          <div className="w-full max-w-md rounded-2xl glass p-8">
            <h2 className="text-2xl font-semibold">Why SafeChat works</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Built for privacy-first teams and families who want calm, clutter-free
              communication.
            </p>
            <div className="mt-6 space-y-4 text-sm text-muted-foreground">
              <div className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-2 w-2 rounded-full bg-violet-400" />
                <div>
                  <p className="font-semibold text-foreground">Auto-expiring history</p>
                  <p>Messages and files vanish after 7 days.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-2 w-2 rounded-full bg-cyan-400" />
                <div>
                  <p className="font-semibold text-foreground">Focused threads</p>
                  <p>Reply, edit, and manage chats without noise.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                <div>
                  <p className="font-semibold text-foreground">Instant calls</p>
                  <p>Crystal-clear audio and video on any device.</p>
                </div>
              </div>
            </div>
            <div className="mt-8 grid gap-3">
              {[
                { label: 'Uptime', value: '99.9%' },
                { label: 'Media retention', value: '7 days' },
                { label: 'Latency', value: 'Low-ms' },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm"
                >
                  <span className="text-muted-foreground">{stat.label}</span>
                  <span className="font-semibold text-foreground">{stat.value}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-white/50">
                Quick start
              </p>
              <ol className="mt-3 space-y-3 text-sm text-muted-foreground">
                {[
                  'Create your SafeChat profile.',
                  'Add friends or start a group.',
                  'Share files or start a call instantly.',
                ].map((step, index) => (
                  <li key={step} className="flex items-center gap-3">
                    <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-violet-500/20 text-xs font-semibold text-violet-200">
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </main>
      <footer className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-10 md:px-12">
        <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-5 text-sm text-muted-foreground">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <p>SafeChat © {new Date().getFullYear()} • Privacy-first messaging</p>
            <div className="flex flex-wrap gap-4 text-xs uppercase tracking-[0.3em] text-white/50">
              <span>Security</span>
              <span>Support</span>
              <span>Status</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default HomePage
