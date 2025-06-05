"use client"

import { useState, useEffect } from "react"

interface User {
  id: number
  email: string
  first_name: string
  last_name: string
  age?: number
  weight?: number
  height?: number
  activity_level?: string
  goal?: string
  dietary_preferences?: string[]
  allergies?: string[]
  meals_per_day?: number
  daily_calorie_goal?: number
}

interface AuthState {
  user: User | null
  loading: boolean
  error: string | null
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    try {
      const response = await fetch("/api/auth/me")
      if (response.ok) {
        const data = await response.json()
        setAuthState({
          user: data.user,
          loading: false,
          error: null,
        })
      } else {
        setAuthState({
          user: null,
          loading: false,
          error: null,
        })
      }
    } catch (error) {
      setAuthState({
        user: null,
        loading: false,
        error: "Failed to check authentication status",
      })
    }
  }

  const login = async (email: string, password: string) => {
    try {
      setAuthState((prev) => ({ ...prev, loading: true, error: null }))

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (response.ok) {
        setAuthState({
          user: data.user,
          loading: false,
          error: null,
        })
        return { success: true }
      } else {
        setAuthState((prev) => ({
          ...prev,
          loading: false,
          error: data.error,
        }))
        return { success: false, error: data.error }
      }
    } catch (error) {
      const errorMessage = "Login failed"
      setAuthState((prev) => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }))
      return { success: false, error: errorMessage }
    }
  }

  const register = async (userData: {
    email: string
    password: string
    confirmPassword: string
    firstName: string
    lastName: string
  }) => {
    try {
      setAuthState((prev) => ({ ...prev, loading: true, error: null }))

      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      })

      const data = await response.json()

      if (response.ok) {
        setAuthState((prev) => ({
          ...prev,
          loading: false,
          error: null,
        }))
        return { success: true }
      } else {
        setAuthState((prev) => ({
          ...prev,
          loading: false,
          error: data.error,
        }))
        return { success: false, error: data.error, details: data.details }
      }
    } catch (error) {
      const errorMessage = "Registration failed"
      setAuthState((prev) => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }))
      return { success: false, error: errorMessage }
    }
  }

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
      setAuthState({
        user: null,
        loading: false,
        error: null,
      })
      return { success: true }
    } catch (error) {
      return { success: false, error: "Logout failed" }
    }
  }

  const completeOnboarding = async (onboardingData: any) => {
    try {
      const response = await fetch("/api/auth/onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(onboardingData),
      })

      const data = await response.json()

      if (response.ok) {
        // Refresh user data
        await checkAuthStatus()
        return { success: true }
      } else {
        return { success: false, error: data.error }
      }
    } catch (error) {
      return { success: false, error: "Onboarding failed" }
    }
  }

  return {
    ...authState,
    login,
    register,
    logout,
    completeOnboarding,
    refreshAuth: checkAuthStatus,
  }
}
