"use client"

import { Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState } from "react"

interface LoginPageProps {
  onNavigateToRegister: () => void
  onNavigateToHome: (userData: any) => void // Pass user data to home or store in context
  onShowMessage: (message: string, type: 'success' | 'error') => void // For alerts/toasts
}

export default function LoginPage({
  onNavigateToRegister,
  onNavigateToHome,
  onShowMessage,
}: LoginPageProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isForgotLoading, setIsForgotLoading] = useState(false)

  const flaskApiUrl = process.env.NEXT_PUBLIC_FLASK_API_URL || "http://localhost:5000"

  const handleLogin = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`${flaskApiUrl}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (response.ok) {
        onShowMessage(data.message || "Login successful!", 'success')
        // Typically, you'd store the user data/token here (e.g., in context or Zustand/Redux)
        // For now, just navigating with basic user data
        onNavigateToHome(data.user)
      } else {
        onShowMessage(data.error || "Login failed. Please check your credentials.", 'error')
      }
    } catch (error) {
      console.error("Login error:", error)
      onShowMessage("An error occurred during login. Please try again.", 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    if (!email) {
      onShowMessage("Please enter your email address to reset password.", 'error');
      return;
    }
    setIsForgotLoading(true);
    try {
      const response = await fetch(`${flaskApiUrl}/api/auth/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (response.ok) {
        onShowMessage(data.message || "Password reset email sent. Please check your inbox.", 'success');
      } else {
        onShowMessage(data.error || "Failed to send password reset email.", 'error');
      }
    } catch (error) {
      console.error("Forgot password error:", error);
      onShowMessage("An error occurred. Please try again.", 'error');
    } finally {
      setIsForgotLoading(false);
    }
  };

  return (
    <div className="max-w-sm mx-auto bg-[#ffffff] min-h-screen flex flex-col">
      {/* Header */}
      <div className="px-4 pt-12 pb-8 text-center">
        <h1 className="text-3xl font-bold text-[#000000] mb-2">FitPlate</h1>
        <p className="text-[#787880] text-base">Welcome back! Sign in to continue</p>
      </div>

      {/* Login Form */}
      <div className="flex-1 px-4 space-y-6">
        <div className="space-y-4">
          <div>
            <label className="block text-[#000000] font-medium mb-2">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="bg-[#f5f5f5] border-none rounded-lg h-12"
            />
          </div>

          <div>
            <label className="block text-[#000000] font-medium mb-2">Password</label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="bg-[#f5f5f5] border-none rounded-lg h-12 pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#999999]"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="text-right">
            <button
              onClick={handleForgotPassword}
              disabled={isForgotLoading}
              className="text-[#007aff] text-sm font-medium disabled:opacity-50"
            >
              {isForgotLoading ? "Sending..." : "Forgot Password?"}
            </button>
          </div>
        </div>

        <Button
          onClick={handleLogin}
          disabled={!email || !password || isLoading}
          className="w-full bg-[#007aff] hover:bg-[#0056b3] text-white rounded-2xl py-4 text-base font-medium disabled:opacity-50"
        >
          {isLoading ? "Signing In..." : "Sign In"}
        </Button>

        <div className="text-center">
          <span className="text-[#787880] text-sm">Don't have an account? </span>
          <button onClick={onNavigateToRegister} className="text-[#007aff] text-sm font-medium">
            Sign Up
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 pb-8 text-center">
        <p className="text-[#999999] text-xs">By signing in, you agree to our Terms of Service and Privacy Policy</p>
      </div>
    </div>
  )
}