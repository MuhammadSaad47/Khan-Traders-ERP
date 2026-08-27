import { Search, Moon, Sun, LogOut } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

// Detect platform once at module load — window.navigator.platform is available in Electron renderer
const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
const searchShortcutLabel = isMac ? '⌘K' : 'Ctrl+K'

export default function Topbar() {
  const user = useAuthStore(state => state.user)
  const logout = useAuthStore(state => state.logout)
  const [theme, setTheme] = useState<'light' | 'dark'>(
    (document.documentElement.getAttribute('data-theme') as 'light' | 'dark') || 'light'
  )

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
  }

  // Global search shortcut — Ctrl+K on Windows/Linux, Cmd+K on Mac
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        document.getElementById('global-search')?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const initials = user?.fullName
    ? user.fullName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  return (
    <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 shrink-0 transition-colors">
      {/* Search */}
      <div className="flex-1 max-w-md relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={16} />
        <Input
          id="global-search"
          placeholder={`Search items, invoices... (${searchShortcutLabel})`}
          className="pl-9 bg-background/50 focus:bg-background border-none ring-1 ring-border focus-visible:ring-primary transition-all shadow-sm text-sm"
        />
      </div>

      {/* Right side controls */}
      <div className="flex items-center gap-3 ml-4">
        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="text-muted-foreground hover:text-foreground"
          title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </Button>

        {/* User info + logout */}
        <div className="flex items-center gap-3 border-l border-border pl-3">
          {/* Avatar */}
          <div className="h-8 w-8 rounded-full bg-primary/15 flex items-center justify-center text-primary text-xs font-bold select-none shrink-0">
            {initials}
          </div>
          {/* Name + role */}
          <div className="flex flex-col items-start leading-tight min-w-0">
            <span className="text-sm font-medium truncate max-w-[120px]">{user?.fullName}</span>
            <span className="text-[11px] text-muted-foreground capitalize">{user?.role?.replace('_', ' ')}</span>
          </div>
          {/* Logout */}
          <Button
            variant="ghost"
            size="icon"
            onClick={logout}
            className="text-muted-foreground hover:text-destructive ml-1 shrink-0"
            title="Logout"
          >
            <LogOut size={16} />
          </Button>
        </div>
      </div>
    </header>
  )
}
