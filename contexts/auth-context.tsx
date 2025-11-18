import React, { createContext, useState, useEffect, useContext, type ReactNode } from 'react'
import CookieManager from '@react-native-cookies/cookies'

interface AuthContextType {
  authCookie: string | null
  updateAuthCookie: () => Promise<void>
  clearAuthCookie: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [authCookie, setAuthCookie] = useState<string | null>(null)

  useEffect(() => {
    // Load cookies on mount
    ;(async () => {
      const cookies = await CookieManager.get('https://your-api-url')
      setAuthCookie(cookies.session?.value || null)
    })()
  }, [])

  const updateAuthCookie = async () => {
    const cookies = await CookieManager.get('https://your-api-url')
    setAuthCookie(cookies.session?.value || null)
  }

  const clearAuthCookie = async () => {
    await CookieManager.clearAll()
    setAuthCookie(null)
  }

  return (
    <AuthContext.Provider value={{ authCookie, updateAuthCookie, clearAuthCookie }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuthContext = () => useContext(AuthContext)
