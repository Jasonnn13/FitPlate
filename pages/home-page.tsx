"use client"

import { User, Plus, Star, Utensils, Book, Home as HomeIcon, Settings, Image as ImageIcon, ChevronRight } from "lucide-react" 
import { Button } from "@/components/ui/button" 
import { useState, useEffect, useCallback } from "react"

// --- Interfaces for fetched data ---
interface Recipe {
  id: string;
  name: string;
  image?: string; 
  caloriesPer100g?: number; 
  isFavorite?: boolean; 
  createdAt?: string | Date; // Keep for potential future use or if other parts rely on it
}

interface UserHomeData {
  displayName?: string;
  caloriesToday?: number;
  dailyCalorieGoal?: number;
  consumedToday?: any[]; 
  recipeMade?: Recipe[]; 
  favouriteRecipes?: string[]; 
}

interface HomePageProps {
  onNavigateToAdd: () => void;
  onNavigateToRecipes: () => void;
  onNavigateToSettings: () => void;
  onNavigateToRecommendedRecipe: () => void; 
  onNavigateToRecipeDetail?: (recipeId: string) => void; 
  // toggleFavorite?: (recipeId: string) => void; 
}

const flaskApiUrl = (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_API_BASE_URL) || "http://localhost:5000";
const DEFAULT_CALORIE_GOAL = 2240; 

export default function HomePage({
  onNavigateToAdd,
  onNavigateToRecipes,
  onNavigateToSettings,
  onNavigateToRecommendedRecipe,
  onNavigateToRecipeDetail,
  // toggleFavorite 
}: HomePageProps) {
  const [userData, setUserData] = useState<UserHomeData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHomeData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const token = localStorage.getItem('firebaseIdToken');

    if (!token) {
      setError("Authentication required. Please log in.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${flaskApiUrl}/api/user/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to parse error response" }));
        if (response.status === 401) {
          localStorage.removeItem('firebaseIdToken');
          localStorage.removeItem('currentUser');
          setError("Session expired. Please log in again.");
        } else {
          setError(errorData.error || `Error: ${response.status}`);
        }
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const fetchedData: UserHomeData = await response.json();
      
      const processedRecipes = (fetchedData.recipeMade || []).map(recipe => ({
        ...recipe,
        isFavorite: fetchedData.favouriteRecipes?.includes(recipe.id) ?? false,
      }));

      setUserData({
        ...fetchedData,
        recipeMade: processedRecipes,
        dailyCalorieGoal: fetchedData.dailyCalorieGoal || DEFAULT_CALORIE_GOAL,
        caloriesToday: fetchedData.caloriesToday || 0,
        consumedToday: fetchedData.consumedToday || [],
      });

    } catch (err) {
      console.error("Failed to fetch home data:", err);
      if (!error) { 
        setError(err instanceof Error ? err.message : "Failed to load home data.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [error]); 

  useEffect(() => {
    fetchHomeData();
  }, [fetchHomeData]);

  const consumedCalories = userData?.caloriesToday ?? 0;
  const calorieGoal = userData?.dailyCalorieGoal ?? DEFAULT_CALORIE_GOAL;
  const remainingCalories = Math.max(0, calorieGoal - consumedCalories);
  const calorieProgress = calorieGoal > 0 ? (consumedCalories / calorieGoal) * 100 : 0;
  const circumference = 2 * Math.PI * 40; 
  const strokeDashoffset = circumference - (calorieProgress / 100) * circumference;

  const menusConsumedToday = userData?.consumedToday?.length ?? 0;
  
  // All user recipes from their profile
  const allUserRecipes = userData?.recipeMade ?? [];

  if (isLoading) {
    return (
      <div className="max-w-sm mx-auto bg-white dark:bg-gray-900 min-h-screen flex items-center justify-center">
        <p className="text-gray-700 dark:text-gray-300">Loading your FitPlate...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-sm mx-auto bg-white dark:bg-gray-900 min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <p className="text-red-500 dark:text-red-400 text-lg mb-4">Oops!</p>
        <p className="text-gray-700 dark:text-gray-300 mb-6">{error}</p>
        <Button 
          onClick={() => {
            if (error.toLowerCase().includes("log in") || error.toLowerCase().includes("authentication required")) {
              console.log("Navigate to login needed"); 
            } else {
              fetchHomeData(); 
            }
          }}
          className="bg-blue-500 hover:bg-blue-600 text-white"
        >
          {error.toLowerCase().includes("log in") ? "Go to Login" : "Try Again"}
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto bg-white dark:bg-gray-800 text-gray-900 dark:text-white min-h-screen">
      <div className="px-4 pt-6 space-y-6">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">FitPlate</h2>
            <p className="text-lg font-semibold mt-1">
              Hi, {userData?.displayName || "User"}!
            </p>
          </div>
          <button
            onClick={onNavigateToSettings}
            className="w-10 h-10 bg-gray-800 dark:bg-gray-700 rounded-full flex items-center justify-center hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
          >
            <User className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Calories Section */}
        <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-4">Calories</h3>
              <div className="relative w-24 h-24 mb-4">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" strokeWidth="8" fill="none" className="text-gray-300 dark:text-gray-600 stroke-current" />
                  <circle
                    cx="50" cy="50" r="40"
                    strokeWidth="8" fill="none"
                    className="text-green-500 stroke-current"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-bold">{Math.round(remainingCalories)}</span>
                  <span className="text-xs text-gray-600 dark:text-gray-400">Remaining</span>
                </div>
              </div>
            </div>
            <div className="space-y-4 text-sm">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-4 h-4 bg-black dark:bg-white rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white dark:bg-black rounded-full"></div>
                  </div>
                  <span className="font-medium">Consumed (kcal)</span>
                </div>
                <p className="font-semibold">{Math.round(consumedCalories)} / {Math.round(calorieGoal)}</p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Utensils className="w-4 h-4" />
                  <span className="font-medium">Menus Consumed</span>
                </div>
                <p className="font-semibold">{menusConsumedToday}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Add Consumed Menu Button */}
        <Button
          onClick={onNavigateToAdd}
          className="w-full bg-gray-800 hover:bg-gray-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-2xl py-4 text-base font-medium"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Consumed Menu
        </Button>

        {/* Today's Recommended Menu Section */}
        <div>
          <h3 className="text-xl font-bold mb-4">Today's Recommended Menu</h3>
          <div
            onClick={onNavigateToRecommendedRecipe}
            className="bg-gray-100 dark:bg-gray-700 rounded-2xl p-4 flex gap-4 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 relative bg-gray-300 dark:bg-gray-500">
               <img
                src="/rendang-dish.png" 
                alt="Rendang dish"
                className="w-full h-full object-cover"
                onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none'; 
                    const parent = target.parentElement;
                    if (parent) {
                        const fallback = document.createElement('div');
                        fallback.className = "w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500";
                        fallback.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>`;
                        parent.appendChild(fallback);
                    }
                }}
              />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-lg mb-1">Rendang</h4>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">
                Slow-cooked beef braised in coconut milk and spices.
              </p>
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">~195 Cal/100g</span>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 bg-black dark:bg-white rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white dark:bg-black rounded-full"></div>
                  </div>
                  <span className="font-medium text-sm">Indonesia</span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-center pl-2">
              <ChevronRight className="w-5 h-5 text-blue-500 dark:text-blue-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-sm bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-10">
        <div className="flex justify-around py-2">
          {[
            { label: "Home", icon: HomeIcon, action: () => {}, active: true }, 
            { label: "Add", icon: Plus, action: onNavigateToAdd, active: false },
            { label: "Recipes", icon: Book, action: onNavigateToRecipes, active: false },
          ].map((item) => (
            <div 
                key={item.label} 
                className={`flex flex-col items-center py-2 px-3 rounded-md cursor-pointer transition-colors ${
                    item.active 
                    ? "text-blue-600 dark:text-blue-400" 
                    : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
                onClick={item.action}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') item.action();}}
            >
              <item.icon className={`w-6 h-6 mb-1 ${item.active ? "text-blue-600 dark:text-blue-400" : ""}`} />
              <span className={`text-xs font-medium ${item.active ? "text-blue-600 dark:text-blue-400" : ""}`}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
