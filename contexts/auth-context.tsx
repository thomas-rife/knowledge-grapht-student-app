import React, { createContext, useState, useEffect, useContext, type ReactNode } from 'react'
import { supabase } from '@/supabaseClient'

interface AuthContextType {
  authCookie: string | null
  updateAuthCookie: () => Promise<void>
  clearAuthCookie: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [authCookie, setAuthCookie] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.auth.getSession()
      setAuthCookie(data.session?.access_token ?? null)
    })()
  }, [])

  const updateAuthCookie = async () => {
    const { data } = await supabase.auth.getSession()
    setAuthCookie(data.session?.access_token ?? null)
  }

  const clearAuthCookie = async () => {
    await supabase.auth.signOut()
    setAuthCookie(null)
  }

  return (
    <AuthContext.Provider value={{ authCookie, updateAuthCookie, clearAuthCookie }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuthContext = () => useContext(AuthContext)
