import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface User {
  id: number
  username: string
  fullName: string
  role: string
}

interface AuthState {
  user: User | null
  loginTime: number | null
  appSessionId: string | null // Unique ID for each app launch
  login: (user: User) => void
  logout: () => void
  checkSession: () => void
  clearSessionOnAppRestart: () => void
}

const SESSION_TIMEOUT = 12 * 60 * 60 * 1000 // 12 hours in milliseconds

// Generate unique session ID for each app launch
const generateSessionId = () => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      loginTime: null,
      appSessionId: null,
      
      login: (user) => set({ 
        user, 
        loginTime: Date.now(),
        appSessionId: generateSessionId() // New session ID on login
      }),
      
      logout: () => {
        window.api?.auth?.logout?.()
        set({ user: null, loginTime: null, appSessionId: null })
      },
      
      checkSession: () => {
        const { loginTime, logout } = get()
        if (loginTime && Date.now() - loginTime > SESSION_TIMEOUT) {
          logout()
        }
      },
      
      // Called on app startup to check if this is a new app session
      clearSessionOnAppRestart: () => {
        const { user } = get()
        // If user exists, it means they were logged in, but app was closed
        // Clear the session to require re-login
        if (user) {
          set({ user: null, loginTime: null, appSessionId: null })
        }
      }
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
