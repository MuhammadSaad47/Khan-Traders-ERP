import { Search, Moon, Sun } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

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

  // Handle global shortcut Ctrl+K
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

  return (
    <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 transition-colors">
      <div className="flex-1 max-w-md relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
        <Input 
          id="global-search"
          placeholder="Search items, invoices... (⌘K)" 
          className="pl-10 bg-background/50 focus:bg-background border-none ring-1 ring-border focus-visible:ring-primary transition-all shadow-sm" 
        />
      </div>
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-muted-foreground hover:text-foreground">
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </Button>
        <div className="flex items-center gap-3 border-l border-border pl-4">
          <div className="flex flex-col items-end">
            <span className="text-sm font-medium leading-none">{user?.fullName}</span>
            <span className="text-xs text-muted-foreground mt-1 capitalize">{user?.role}</span>
          </div>
          <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
            {user?.fullName.charAt(0).toUpperCase()}
          </div>
          <Button variant="outline" size="sm" onClick={logout} className="ml-2">
            Logout
          </Button>
        </div>
      </div>
    </header>
  )
}
