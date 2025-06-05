"use client"

import { Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState } from "react"

interface RegisterPageProps {
  onNavigateToLogin: () => void
  onNavigateToOnboarding: () => void
}

export default function RegisterPage({ onNavigateToLogin, onNavigateToOnboarding }: RegisterPageProps) {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleRegister = async () => {
    if (formData.password !== formData.confirmPassword) {
      alert("Passwords don't match!")
      return
    }

    setIsLoading(true)
    // Simulate registration process
    setTimeout(() => {
      setIsLoading(false)
      onNavigateToOnboarding()
    }, 1500)
  }

  const isFormValid =
    formData.firstName &&
    formData.lastName &&
    formData.email &&
    formData.password &&
    formData.confirmPassword &&
    formData.password === formData.confirmPassword

  return (
    <div className="max-w-sm mx-auto bg-[#ffffff] min-h-screen flex flex-col">
      {/* Header */}
      <div className="px-4 pt-12 pb-8 text-center">
        <h1 className="text-3xl font-bold text-[#000000] mb-2">FitPlate</h1>
        <p className="text-[#787880] text-base">Create your account to get started</p>
      </div>

      {/* Register Form */}
      <div className="flex-1 px-4 space-y-6">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#000000] font-medium mb-2">First Name</label>
              <Input
                value={formData.firstName}
                onChange={(e) => handleInputChange("firstName", e.target.value)}
                placeholder="First name"
                className="bg-[#f5f5f5] border-none rounded-lg h-12"
              />
            </div>
            <div>
              <label className="block text-[#000000] font-medium mb-2">Last Name</label>
              <Input
                value={formData.lastName}
                onChange={(e) => handleInputChange("lastName", e.target.value)}
                placeholder="Last name"
                className="bg-[#f5f5f5] border-none rounded-lg h-12"
              />
            </div>
          </div>

          <div>
            <label className="block text-[#000000] font-medium mb-2">Email</label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              placeholder="Enter your email"
              className="bg-[#f5f5f5] border-none rounded-lg h-12"
            />
          </div>

          <div>
            <label className="block text-[#000000] font-medium mb-2">Password</label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                placeholder="Create a password"
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

          <div>
            <label className="block text-[#000000] font-medium mb-2">Confirm Password</label>
            <div className="relative">
              <Input
                type={showConfirmPassword ? "text" : "password"}
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                placeholder="Confirm your password"
                className="bg-[#f5f5f5] border-none rounded-lg h-12 pr-12"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#999999]"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        <Button
          onClick={handleRegister}
          disabled={!isFormValid || isLoading}
          className="w-full bg-[#007aff] hover:bg-[#0056b3] text-white rounded-2xl py-4 text-base font-medium disabled:opacity-50"
        >
          {isLoading ? "Creating Account..." : "Create Account"}
        </Button>

        <div className="text-center">
          <span className="text-[#787880] text-sm">Already have an account? </span>
          <button onClick={onNavigateToLogin} className="text-[#007aff] text-sm font-medium">
            Sign In
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 pb-8 text-center">
        <p className="text-[#999999] text-xs">
          By creating an account, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  )
}
