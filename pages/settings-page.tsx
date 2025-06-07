"use client"

import { ChevronLeft, ChevronRight, User, Bell, Shield, HelpCircle, LogOut, Edit, Home, PlusSquare, BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button" // Assuming shadcn/ui Button
import { Switch } from "@/components/ui/switch" // Assuming shadcn/ui Switch
import { useState, useEffect, useCallback } from "react"

// Define an interface for the expected user profile data from the API
interface UserProfileData {
  displayName: string;
  email: string;
  joinDate: string; 
  totalRecipes: number;
  favoriteRecipesCount: number;
  username?: string; // Optional
  uid?: string; // Optional
}

interface SettingsPageProps {
  onNavigateBack: () => void;
  onNavigateToLogin: () => void;
  onNavigateToHome: () => void;
  onNavigateToAdd: () => void;
  onNavigateToRecipes: () => void;
}

// Ensure this is defined, likely from environment variables
const flaskApiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";

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
  });

  const [preferences, setPreferences] = useState({
    darkMode: false,
    metricUnits: true,
    autoSync: true,
  });

  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  const fetchUserProfile = useCallback(async () => {
    setIsLoadingProfile(true);
    setProfileError(null);
    const token = localStorage.getItem('firebaseIdToken');

    if (!token) {
      setProfileError("Authentication token not found. Please log in.");
      setIsLoadingProfile(false);
      // Redirect to login after a short delay to allow error message to be seen if desired
      // setTimeout(onNavigateToLogin, 1500);
      return; // Stop execution if no token
    }

    try {
      const response = await fetch(`${flaskApiUrl}/api/user/home`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to parse error response" }));
        if (response.status === 401) { // Unauthorized, possibly expired token
            localStorage.removeItem('firebaseIdToken'); // Clear potentially invalid token
            localStorage.removeItem('currentUser');
            setProfileError("Session expired or invalid. Please log in again.");
            // setTimeout(onNavigateToLogin, 1500);
        } else {
            setProfileError(errorData.error || `Error: ${response.status}`);
        }
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data: UserProfileData = await response.json();
      setUserProfile(data);
    } catch (error) {
      console.error("Failed to fetch user profile:", error);
      if (!profileError) { // Avoid overwriting specific 401 error
        setProfileError(error instanceof Error ? error.message : "Failed to load profile data.");
      }
    } finally {
      setIsLoadingProfile(false);
    }
  }, [onNavigateToLogin, profileError]); // Added profileError to dependencies

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  const handleLogout = async () => {  
    console.log("Attempting logout...");
    const token = localStorage.getItem('firebaseIdToken');
    if (token) {
        try {
            // Optional: Call Flask logout to clear server session if it's stateful beyond token verification
            await fetch(`${flaskApiUrl}/api/auth/logout`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });
            console.log("Flask logout endpoint called (if applicable).");
        } catch (error) {
            console.error("Error calling Flask logout endpoint:", error);
            // Proceed with client-side logout regardless
        }
    }

    localStorage.removeItem('firebaseIdToken');
    localStorage.removeItem('currentUser'); // Clear stored user data
    console.log("Tokens and user data cleared from localStorage.");
    onNavigateToLogin(); // Navigate to login page
  };

  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
    // TODO: API call to persist notification settings
    console.log(`Notification ${key} toggled. Persist this change.`);
  };

  const togglePreference = (key: keyof typeof preferences) => {
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
    // TODO: API call to persist preference settings
    console.log(`Preference ${key} toggled. Persist this change.`);
     if (key === 'darkMode') {
        // Example: toggle dark mode class on body
        document.documentElement.classList.toggle('dark', !preferences.darkMode);
    }
  };
  
  // Early return for loading state
  if (isLoadingProfile) {
    return (
      <div className="max-w-sm mx-auto bg-white dark:bg-gray-900 min-h-screen flex items-center justify-center">
        <p className="text-gray-700 dark:text-gray-300">Loading profile...</p>
        {/* You can add a spinner here */}
      </div>
    );
  }

  // Early return if there's an error and no profile data (e.g., token missing)
  if (profileError && !userProfile) {
    return (
      <div className="max-w-sm mx-auto bg-white dark:bg-gray-900 min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <p className="text-red-500 dark:text-red-400 text-lg mb-4">Error:</p>
        <p className="text-gray-700 dark:text-gray-300 mb-6">{profileError}</p>
        <Button 
          onClick={() => {
            if (profileError.toLowerCase().includes("log in")) {
              onNavigateToLogin();
            } else {
              fetchUserProfile(); // Attempt to refetch
            }
          }}
          className="bg-blue-500 hover:bg-blue-600 text-white"
        >
          {profileError.toLowerCase().includes("log in") ? "Go to Login" : "Try Again"}
        </Button>
      </div>
    );
  }
  
  // If profile is loaded successfully (or if there was an error but we still have some old profile data to show)
  return (
    <div className="max-w-sm mx-auto bg-white dark:bg-gray-800 text-gray-900 dark:text-white min-h-screen">
      {/* Header */}
      <div className="px-4 pt-6 pb-4 sticky top-0 bg-white dark:bg-gray-800 z-10 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={onNavigateBack} className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Settings</h1>
          <div className="w-10"></div> {/* Placeholder for alignment */}
        </div>
      </div>

      {/* Content */}
      <div className="pb-24"> {/* Padding for bottom nav */}
        {/* Profile Section */}
        {userProfile ? (
          <div className="px-4 py-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center">
                {/* Placeholder for profile picture or initials */}
                <User className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold">{userProfile.displayName || userProfile.username || "User"}</h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm">{userProfile.email}</p>
              </div>
              <Button variant="ghost" size="icon" className="text-blue-500 hover:bg-blue-50 dark:hover:bg-gray-700">
                <Edit className="h-5 w-5" />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-center">
                <div className="text-xl font-bold">{userProfile.totalRecipes}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Total Recipes</div>
              </div>
              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-center">
                <div className="text-xl font-bold">{userProfile.favoriteRecipesCount}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Favorites</div>
              </div>
            </div>
          </div>
        ) : (
          !isLoadingProfile && <div className="px-4 py-6 text-center text-gray-500 dark:text-gray-400">Could not load profile information.</div>
        )}

        {/* Notifications Section */}
        <div className="px-4 py-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <Bell className="w-5 h-5 text-blue-500" />
            <h3 className="text-lg font-semibold">Notifications</h3>
          </div>
          <div className="space-y-4">
            {(Object.keys(notifications) as Array<keyof typeof notifications>).map((key) => (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  </p>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    {/* Add descriptive text based on key */}
                    {key === 'mealReminders' && 'Get reminded about meal times'}
                    {key === 'recipeUpdates' && 'New recipes from followed users'}
                    {key === 'weeklyReports' && 'Your nutrition summary'}
                    {key === 'socialActivity' && 'Likes and comments on recipes'}
                  </p>
                </div>
                <Switch
                  checked={notifications[key]}
                  onCheckedChange={() => toggleNotification(key)}
                  // Add appropriate classes for styling the Switch if needed
                />
              </div>
            ))}
          </div>
        </div>

        {/* Preferences Section */}
        <div className="px-4 py-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-4">Preferences</h3>
          <div className="space-y-4">
            {(Object.keys(preferences) as Array<keyof typeof preferences>).map((key) => (
               <div key={key} className="flex items-center justify-between">
               <div>
                 <p className="font-medium">
                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                 </p>
                 <p className="text-gray-600 dark:text-gray-400 text-sm">
                    {key === 'darkMode' && 'Switch to dark theme'}
                    {key === 'metricUnits' && 'Use kg, cm instead of lbs, ft'}
                    {key === 'autoSync' && 'Sync data across devices'}
                 </p>
               </div>
               <Switch
                 checked={preferences[key]}
                 onCheckedChange={() => togglePreference(key)}
               />
             </div>
            ))}
          </div>
        </div>

        {/* Menu Items Section */}
        <div className="px-4 py-6">
          <div className="space-y-1">
            {[
              { label: "Privacy & Security", icon: Shield, action: () => console.log("Nav to Privacy") },
              { label: "Help & Support", icon: HelpCircle, action: () => console.log("Nav to Help") },
              { label: "About FitPlate", action: () => console.log("Nav to About") },
              { label: "Terms of Service", action: () => console.log("Nav to ToS") },
              { label: "Privacy Policy", action: () => console.log("Nav to Privacy Policy") },
            ].map((item, index) => (
              <button 
                key={index} 
                onClick={item.action}
                className="w-full flex items-center justify-between p-4 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {item.icon && <item.icon className="w-5 h-5 text-gray-500 dark:text-gray-400" />}
                  <span className="font-medium">{item.label}</span>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
              </button>
            ))}
          </div>
        </div>

        {/* Logout Button */}
        <div className="px-4 pb-6">
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full border-red-500 text-red-500 hover:bg-red-50 dark:border-red-400 dark:text-red-400 dark:hover:bg-red-900/30 rounded-lg py-3"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-sm bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="flex justify-around py-2">
          {[
            { label: "Home", icon: Home, action: onNavigateToHome },
            { label: "Add", icon: PlusSquare, action: onNavigateToAdd },
            { label: "Recipes", icon: BookOpen, action: onNavigateToRecipes },
          ].map((item, index) => (
            <div 
                key={index} 
                className="flex flex-col items-center py-2 px-3 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer" 
                onClick={item.action}
            >
              <item.icon className="w-6 h-6 text-gray-500 dark:text-gray-400 mb-1" />
              <span className="text-xs text-gray-500 dark:text-gray-400">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
