import { useEffect, useState } from 'react'
import { useAuthStore } from '../stores/auth.store'
import { ForgotPassword } from './ForgotPassword'
import { SecurityQuestionsSetup } from './SecurityQuestionsSetup'

type View = 'login' | 'setup' | 'forgotPassword' | 'securityQuestionsSetup'

export default function Auth() {
  const [hasAdmin, setHasAdmin] = useState<boolean | null>(null)
  const [view, setView] = useState<View>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [newAdminId, setNewAdminId] = useState<number | null>(null)
  const login = useAuthStore(state => state.login)

  useEffect(() => {
    window.api.auth.hasAdmin().then((exists) => {
      setHasAdmin(exists)
      setView(exists ? 'login' : 'setup')
    }).catch(console.error)
  }, [])

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      const user = await window.api.auth.setupFirstAdmin({ username, password, fullName })
      setNewAdminId(user.id)
      setView('securityQuestionsSetup')
    } catch (err: any) {
      setError(err.message || 'Setup failed')
    }
  }

  const handleSecurityQuestionsComplete = () => {
    // Login the admin after security questions are set
    if (newAdminId) {
      login({ id: newAdminId, username, fullName, role: 'admin' })
    }
  }

  const handleSkipSecurityQuestions = () => {
    // Allow skipping security questions during initial setup
    if (newAdminId) {
      login({ id: newAdminId, username, fullName, role: 'admin' })
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      const user = await window.api.auth.login({ username, password })
      login(user)
    } catch (err: any) {
      setError(err.message || 'Login failed')
    }
  }

  if (hasAdmin === null) return <div className="p-8 text-center text-muted-foreground">Loading...</div>

  // Show forgot password flow
  if (view === 'forgotPassword') {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background p-4">
        <ForgotPassword onBack={() => setView('login')} />
      </div>
    )
  }

  // Show security questions setup after initial admin creation
  if (view === 'securityQuestionsSetup' && newAdminId) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-2xl rounded-xl border border-border bg-card p-6 shadow-md">
          <SecurityQuestionsSetup
            userId={newAdminId}
            onComplete={handleSecurityQuestionsComplete}
            onSkip={handleSkipSecurityQuestions}
            isOptional={true}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-md">
        <h1 className="text-2xl font-bold text-foreground mb-6 text-center">
          {view === 'setup' ? 'Initial Admin Setup' : 'Khan Trader Login'}
        </h1>

        {error && <div className="mb-4 rounded bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

        <form onSubmit={view === 'setup' ? handleSetup : handleLogin} className="space-y-4">
          {view === 'setup' && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Full Name</label>
              <input
                type="text"
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required
              />
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Username</label>
            <input
              type="text"
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Password</label>
            <input
              type="password"
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            {view === 'setup' ? 'Create Admin Account' : 'Login'}
          </button>

          {/* Forgot Password Link - Only show on login page */}
          {view === 'login' && (
            <div className="text-center">
              <button
                type="button"
                onClick={() => setView('forgotPassword')}
                className="text-sm text-primary hover:underline focus:outline-none"
              >
                Forgot Password?
              </button>
            </div>
          )}
        </form>
        
        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground/60 tracking-wider">
            DEVELOPED BY SAAD AFRIDI
          </p>
        </div>
      </div>
    </div>
  )
}
