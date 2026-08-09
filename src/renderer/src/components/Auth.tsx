import { useEffect, useState } from 'react'
import { useAuthStore } from '../stores/auth.store'

export default function Auth() {
  const [hasAdmin, setHasAdmin] = useState<boolean | null>(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const login = useAuthStore(state => state.login)

  useEffect(() => {
    window.api.auth.hasAdmin().then(setHasAdmin).catch(console.error)
  }, [])

  if (hasAdmin === null) return <div className="p-8 text-center text-muted-foreground">Loading...</div>

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      const user = await window.api.auth.setupFirstAdmin({ username, password, fullName })
      login(user)
    } catch (err: any) {
      setError(err.message || 'Setup failed')
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

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-md">
        <h1 className="text-2xl font-bold text-foreground mb-6 text-center">
          {hasAdmin ? 'Khan Trader Login' : 'Initial Admin Setup'}
        </h1>

        {error && <div className="mb-4 rounded bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

        <form onSubmit={hasAdmin ? handleLogin : handleSetup} className="space-y-4">
          {!hasAdmin && (
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
            {hasAdmin ? 'Login' : 'Create Admin Account'}
          </button>
        </form>
      </div>
    </div>
  )
}
