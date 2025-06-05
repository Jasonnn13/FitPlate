"use client"

import { ChevronLeft, ChevronRight, User, Bell, Shield, HelpCircle, LogOut, Edit, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { useState } from "react"
import { Plus, Book } from "lucide-react"

interface SettingsPageProps {
  onNavigateBack: () => void
  onNavigateToLogin: () => void
  onNavigateToHome: () => void
  onNavigateToAdd: () => void
  onNavigateToRecipes: () => void
}

export default function SettingsPage({
  onNavigateBack,
  onNavigateToLogin,
  onNavigateToHome,
  onNavigateToAdd,
  onNavigateToRecipes,
}: SettingsPageProps) {
  const [notifications, setNotifications] = useState({
    mealReminders: true,
    recipeUpdates: false,
    weeklyReports: true,
    socialActivity: false,
  })

  const [preferences, setPreferences] = useState({
    darkMode: false,
    metricUnits: true,
    autoSync: true,
  })

  const userProfile = {
    name: "John Doe",
    email: "john.doe@example.com",
    joinDate: "January 2024",
    totalRecipes: 12,
    favoriteRecipes: 8,
  }

  const handleLogout = () => {
    // Handle logout logic
    onNavigateToLogin()
  }

  const toggleNotification = (key: string) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))
  }

  const togglePreference = (key: string) => {
    setPreferences((prev) => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))
  }

  return (
    <div className="max-w-sm mx-auto bg-[#ffffff] min-h-screen">
      {/* Header */}
      <div className="px-4 pt-6 pb-4 sticky top-0 bg-white z-10 border-b border-[#f5f5f5]">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={onNavigateBack}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Settings</h1>
          <div className="w-10"></div>
        </div>
      </div>

      {/* Content */}
      <div className="pb-20">
        {/* Profile Section */}
        <div className="px-4 py-6 border-b border-[#f5f5f5]">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-[#007aff] rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-[#000000]">{userProfile.name}</h2>
              <p className="text-[#787880] text-sm">{userProfile.email}</p>
              <p className="text-[#999999] text-xs">Member since {userProfile.joinDate}</p>
            </div>
            <Button variant="ghost" size="icon">
              <Edit className="h-5 w-5 text-[#007aff]" />
            </Button>
          </div>

          {/* Profile Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#f5f5f5] rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-[#000000]">{userProfile.totalRecipes}</div>
              <div className="text-xs text-[#787880]">Total Recipes</div>
            </div>
            <div className="bg-[#f5f5f5] rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-[#000000]">{userProfile.favoriteRecipes}</div>
              <div className="text-xs text-[#787880]">Favorites</div>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="px-4 py-6 border-b border-[#f5f5f5]">
          <div className="flex items-center gap-3 mb-4">
            <Bell className="w-5 h-5 text-[#007aff]" />
            <h3 className="text-lg font-semibold text-[#000000]">Notifications</h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#000000] font-medium">Meal Reminders</p>
                <p className="text-[#787880] text-sm">Get reminded about meal times</p>
              </div>
              <Switch
                checked={notifications.mealReminders}
                onCheckedChange={() => toggleNotification("mealReminders")}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#000000] font-medium">Recipe Updates</p>
                <p className="text-[#787880] text-sm">New recipes from followed users</p>
              </div>
              <Switch
                checked={notifications.recipeUpdates}
                onCheckedChange={() => toggleNotification("recipeUpdates")}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#000000] font-medium">Weekly Reports</p>
                <p className="text-[#787880] text-sm">Your nutrition summary</p>
              </div>
              <Switch
                checked={notifications.weeklyReports}
                onCheckedChange={() => toggleNotification("weeklyReports")}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#000000] font-medium">Social Activity</p>
                <p className="text-[#787880] text-sm">Likes and comments on recipes</p>
              </div>
              <Switch
                checked={notifications.socialActivity}
                onCheckedChange={() => toggleNotification("socialActivity")}
              />
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className="px-4 py-6 border-b border-[#f5f5f5]">
          <h3 className="text-lg font-semibold text-[#000000] mb-4">Preferences</h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#000000] font-medium">Dark Mode</p>
                <p className="text-[#787880] text-sm">Switch to dark theme</p>
              </div>
              <Switch checked={preferences.darkMode} onCheckedChange={() => togglePreference("darkMode")} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#000000] font-medium">Metric Units</p>
                <p className="text-[#787880] text-sm">Use kg, cm instead of lbs, ft</p>
              </div>
              <Switch checked={preferences.metricUnits} onCheckedChange={() => togglePreference("metricUnits")} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#000000] font-medium">Auto Sync</p>
                <p className="text-[#787880] text-sm">Sync data across devices</p>
              </div>
              <Switch checked={preferences.autoSync} onCheckedChange={() => togglePreference("autoSync")} />
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="px-4 py-6">
          <div className="space-y-1">
            <button className="w-full flex items-center justify-between p-4 rounded-lg hover:bg-[#f5f5f5] transition-colors">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-[#787880]" />
                <span className="text-[#000000] font-medium">Privacy & Security</span>
              </div>
              <ChevronRight className="w-5 h-5 text-[#999999]" />
            </button>

            <button className="w-full flex items-center justify-between p-4 rounded-lg hover:bg-[#f5f5f5] transition-colors">
              <div className="flex items-center gap-3">
                <HelpCircle className="w-5 h-5 text-[#787880]" />
                <span className="text-[#000000] font-medium">Help & Support</span>
              </div>
              <ChevronRight className="w-5 h-5 text-[#999999]" />
            </button>

            <button className="w-full flex items-center justify-between p-4 rounded-lg hover:bg-[#f5f5f5] transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-[#000000] font-medium">About FitPlate</span>
              </div>
              <ChevronRight className="w-5 h-5 text-[#999999]" />
            </button>

            <button className="w-full flex items-center justify-between p-4 rounded-lg hover:bg-[#f5f5f5] transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-[#000000] font-medium">Terms of Service</span>
              </div>
              <ChevronRight className="w-5 h-5 text-[#999999]" />
            </button>

            <button className="w-full flex items-center justify-between p-4 rounded-lg hover:bg-[#f5f5f5] transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-[#000000] font-medium">Privacy Policy</span>
              </div>
              <ChevronRight className="w-5 h-5 text-[#999999]" />
            </button>
          </div>
        </div>

        {/* Logout Button */}
        <div className="px-4 pb-6">
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full border-red-200 text-red-600 hover:bg-red-50 rounded-lg py-3"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-sm bg-[#ffffff] border-t border-[#f5f5f5]">
        <div className="flex justify-around py-2">
          <div className="flex flex-col items-center py-2" onClick={onNavigateToHome}>
            <Home className="w-6 h-6 text-[#999999] mb-1" />
            <span className="text-xs text-[#999999]">Home</span>
          </div>
          <div className="flex flex-col items-center py-2" onClick={onNavigateToAdd}>
            <Plus className="w-6 h-6 text-[#999999] mb-1" />
            <span className="text-xs text-[#999999]">Add</span>
          </div>
          <div className="flex flex-col items-center py-2" onClick={onNavigateToRecipes}>
            <Book className="w-6 h-6 text-[#999999] mb-1" />
            <span className="text-xs text-[#999999]">Recipes</span>
          </div>
        </div>
      </div>
    </div>
  )
}
