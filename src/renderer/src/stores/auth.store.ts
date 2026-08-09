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
  login: (user: User) => void
  logout: () => void
  checkSession: () => void
}

const SESSION_TIMEOUT = 12 * 60 * 60 * 1000 // 12 hours in milliseconds

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      loginTime: null,
      login: (user) => set({ user, loginTime: Date.now() }),
      logout: () => {
        window.api?.auth?.logout?.()
        set({ user: null, loginTime: null })
      },
      checkSession: () => {
        const { loginTime, logout } = get()
        if (loginTime && Date.now() - loginTime > SESSION_TIMEOUT) {
          logout()
        }
      }
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
