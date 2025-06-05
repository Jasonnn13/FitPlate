"use client"

import { User, Plus, Star, Utensils, Book, Home as HomeIcon, Settings, Image as ImageIcon, ChevronRight, Download } from "lucide-react" 
import { Button } from "@/components/ui/button" 
import { useState, useEffect, useCallback } from "react"

// --- Interfaces for fetched data ---
interface GloballyRecommendedRecipeInfo {
  id: string;
  name?: string;
  image?: string; 
  description?: string;
  calories?: number;
  likes?: number;
}

interface ConsumedRecipeDetail {
    id: string;
    name: string;
    calories?: number;
    image?: string;
    protein?: number;
    fat?: number;
    carbs?: number;
}

interface UserHomeData {
  displayName?: string;
  caloriesToday?: number; // Total calories consumed today from user profile
  dailyCalorieGoal?: number;
  // consumedTodayIds?: string[]; // Raw IDs, might not be needed if details are always present
  consumedTodayDetails?: ConsumedRecipeDetail[]; // Detailed list for summary/download
  globallyRecommendedRecipe?: GloballyRecommendedRecipeInfo | null; 
  totalProteinToday?: number;
  totalFatToday?: number;
  totalCarbsToday?: number;
}

interface HomePageProps {
  onNavigateToAdd: () => void; // For the bottom nav "Add Meal" button
  onNavigateToRecipes: () => void;
  onNavigateToSettings: () => void;
  onNavigateToRecipeDetail?: (recipeId: string) => void; 
}

const flaskApiUrl = (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_API_BASE_URL) || "http://localhost:5000"; // Ensure this is your Flask API URL
const DEFAULT_CALORIE_GOAL = 2240; 

export default function HomePage({
  onNavigateToAdd,
  onNavigateToRecipes,
  onNavigateToSettings,
  onNavigateToRecipeDetail,
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
      // Consider calling a passed-in function to navigate to login if this component doesn't handle routing itself
      return;
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
      setUserData({
        ...fetchedData,
        dailyCalorieGoal: fetchedData.dailyCalorieGoal || DEFAULT_CALORIE_GOAL,
        caloriesToday: fetchedData.caloriesToday || 0,
        consumedTodayDetails: fetchedData.consumedTodayDetails || [],
        totalProteinToday: fetchedData.totalProteinToday || 0,
        totalFatToday: fetchedData.totalFatToday || 0,
        totalCarbsToday: fetchedData.totalCarbsToday || 0,
        globallyRecommendedRecipe: fetchedData.globallyRecommendedRecipe || null,
      });

    } catch (err) {
      console.error("Failed to fetch home data:", err);
      if (!error) { // Avoid overwriting more specific error messages
        setError(err instanceof Error ? err.message : "Failed to load home data.");
      }
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // error removed from deps to avoid re-fetch loops on error state change

  useEffect(() => {
    fetchHomeData();
  }, [fetchHomeData]);

  const handleDownloadSummary = () => {
    if (!userData) return;

    let summaryText = `Today's Consumption Summary (${new Date().toLocaleDateString()}):\n`;
    summaryText += `-------------------------------------------------\n`;
    summaryText += `User: ${userData.displayName || "User"}\n`;
    summaryText += `Daily Calorie Goal: ${userData.dailyCalorieGoal?.toFixed(0) || DEFAULT_CALORIE_GOAL} kcal\n\n`;
    
    summaryText += `TOTALS FOR TODAY:\n`;
    summaryText += `  Calories Consumed: ${userData.caloriesToday?.toFixed(0) || 0} kcal\n`;
    const remaining = Math.max(0, (userData.dailyCalorieGoal || DEFAULT_CALORIE_GOAL) - (userData.caloriesToday || 0));
    summaryText += `  Calories Remaining: ${remaining.toFixed(0)} kcal\n`;
    summaryText += `  Protein: ${userData.totalProteinToday?.toFixed(1) || 0} g\n`;
    summaryText += `  Fat: ${userData.totalFatToday?.toFixed(1) || 0} g\n`;
    summaryText += `  Carbohydrates: ${userData.totalCarbsToday?.toFixed(1) || 0} g\n\n`;
    
    summaryText += `CONSUMED MEALS/RECIPES (${userData.consumedTodayDetails?.length || 0}):\n`;
    if (userData.consumedTodayDetails && userData.consumedTodayDetails.length > 0) {
      userData.consumedTodayDetails.forEach((item, index) => {
        summaryText += `${index + 1}. ${item.name}`;
        let nutritionInfo = [];
        if (item.calories !== undefined) nutritionInfo.push(`~${item.calories.toFixed(0)}kcal`);
        // Include individual P/F/C for each item in summary if available
        if (item.protein !== undefined) nutritionInfo.push(`${item.protein.toFixed(1)}P`);
        if (item.fat !== undefined) nutritionInfo.push(`${item.fat.toFixed(1)}F`);
        if (item.carbs !== undefined) nutritionInfo.push(`${item.carbs.toFixed(1)}C`);
        
        if (nutritionInfo.length > 0) {
            summaryText += ` (${nutritionInfo.join(', ')})\n`;
        } else {
            summaryText += ` (nutrition N/A)\n`;
        }
      });
    } else {
      summaryText += "  No meals logged today.\n";
    }
    summaryText += `-------------------------------------------------\n`;

    const blob = new Blob([summaryText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FitPlate_Summary_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const consumedCalories = userData?.caloriesToday ?? 0;
  const calorieGoal = userData?.dailyCalorieGoal ?? DEFAULT_CALORIE_GOAL;
  const remainingCalories = Math.max(0, calorieGoal - consumedCalories);
  const calorieProgress = calorieGoal > 0 ? Math.min(100, (consumedCalories / calorieGoal) * 100) : 0;
  const circumference = 2 * Math.PI * 40; 
  const strokeDashoffset = circumference - (calorieProgress / 100) * circumference;
  const menusConsumedToday = userData?.consumedTodayDetails?.length ?? 0;

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
            // Basic navigation for login error, otherwise retry fetch
            if (error.toLowerCase().includes("log in") || error.toLowerCase().includes("authentication required")) {
              // This assumes your parent component handles actual navigation based on some global state or router
              // For now, just logging or you could call a prop like `onNavigateToLogin` if you add it.
              console.log("Login required, navigation should be handled by parent app structure.");
            } else {
              fetchHomeData(); 
            }
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:hover:bg-blue-600"
        >
          {error.toLowerCase().includes("log in") || error.toLowerCase().includes("authentication required") ? "Go to Login" : "Try Again"}
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto bg-white dark:bg-gray-800 text-gray-900 dark:text-white min-h-screen pb-20"> {/* Added pb-20 for bottom nav */}
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
            aria-label="Settings"
          >
            <Settings className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Calories Section */}
        <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-100">Calories</h3>
              <div className="relative w-24 h-24 mb-4">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" strokeWidth="8" fill="none" className="text-gray-300 dark:text-gray-600 stroke-current" />
                  <circle
                    cx="50" cy="50" r="40"
                    strokeWidth="8" fill="none"
                    className="text-green-500 dark:text-green-400 stroke-current"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-bold text-gray-900 dark:text-white">{Math.round(remainingCalories)}</span>
                  <span className="text-xs text-gray-600 dark:text-gray-400">Remaining</span>
                </div>
              </div>
            </div>
            <div className="space-y-4 text-sm text-gray-700 dark:text-gray-200">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-4 h-4 bg-gray-900 dark:bg-white rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white dark:bg-gray-900 rounded-full"></div>
                  </div>
                  <span className="font-medium">Consumed (kcal)</span>
                </div>
                <p className="font-semibold">{Math.round(consumedCalories)} / {Math.round(calorieGoal)}</p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Utensils className="w-4 h-4" />
                  <span className="font-medium">Meals consumed</span>
                </div>
                <p className="font-semibold">{menusConsumedToday}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Download Summary Button with Nutrition Totals */}
        <Button
          onClick={handleDownloadSummary}
          className="w-full bg-gray-800 hover:bg-gray-700 dark:bg-teal-600 dark:hover:bg-teal-700 text-white rounded-2xl py-3 text-xs font-medium flex-col items-center h-auto"
          style={{ lineHeight: '1.3' }} 
        >
          <div className="flex items-center"> 
            <Download className="w-4 h-4 mr-2" />
            <span>Download Consumption Summary</span>
          </div>
          {/* (userData?.totalProteinToday !== undefined || userData?.totalFatToday !== undefined || userData?.totalCarbsToday !== undefined) && ( ... ) */}
        </Button>

        {/* Today's Recommended Menu Section */}
        <div>
          <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-100">Chef's Global Pick</h3>
          {userData?.globallyRecommendedRecipe ? (
            <div
              onClick={() => onNavigateToRecipeDetail && userData.globallyRecommendedRecipe && onNavigateToRecipeDetail(userData.globallyRecommendedRecipe.id)}
              className="bg-gray-100 dark:bg-gray-700 rounded-2xl p-4 flex gap-4 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors shadow-md"
            >
              <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 relative bg-gray-300 dark:bg-gray-500">
                {userData.globallyRecommendedRecipe.image ? (
                    <img
                        src={userData.globallyRecommendedRecipe.image} 
                        alt={userData.globallyRecommendedRecipe.name || "Recommended Recipe"}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none'; 
                            const parent = target.parentElement;
                            if (parent && !parent.querySelector('.placeholder-icon')) {
                                const fallback = document.createElement('div');
                                fallback.className = "placeholder-icon w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500";
                                fallback.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>`;
                                parent.appendChild(fallback);
                            }
                        }}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
                        <ImageIcon size={32} />
                    </div>
                )}
              </div>
              <div className="flex-1 min-w-0"> {/* Added min-w-0 for better truncation */}
                <h4 className="font-bold text-lg mb-1 text-gray-800 dark:text-gray-50 truncate" title={userData.globallyRecommendedRecipe.name}>{userData.globallyRecommendedRecipe.name || "Special Dish"}</h4>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-2 line-clamp-2"> {/* line-clamp-2 for description */}
                  {userData.globallyRecommendedRecipe.description || "A popular choice for you to try!"}
                </p>
                <div className="flex items-center justify-between mt-auto">
                  <span className="font-medium text-sm text-gray-700 dark:text-gray-200">
                    {userData.globallyRecommendedRecipe.calories ? `~${userData.globallyRecommendedRecipe.calories.toFixed(0)} Cal` : (userData.globallyRecommendedRecipe.likes !== undefined ? `${userData.globallyRecommendedRecipe.likes} Likes` : "View Details")}
                  </span>
                  {userData.globallyRecommendedRecipe.likes !== undefined && <Star className="w-4 h-4 text-yellow-400 fill-yellow-400"/>}
                </div>
              </div>
              <div className="flex items-center justify-center pl-2 self-center"> {/* Aligned chevron to center */}
                <ChevronRight className="w-5 h-5 text-blue-500 dark:text-blue-400" />
              </div>
            </div>
          ) : (
            <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl p-6 text-center text-gray-500 dark:text-gray-400">
                <p>No global recommendations available at the moment.</p>
                <Button onClick={onNavigateToRecipes} variant="link" className="mt-2 text-blue-600 dark:text-blue-400">Browse Recipes</Button>
            </div>
          )}
        </div>
         <div className="h-12"></div> {/* Spacer for bottom nav */}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-sm bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-10">
        <div className="flex justify-around py-2">
          {[
            { label: "Home", icon: HomeIcon, action: () => {}, active: true }, 
            { label: "Add Meal", icon: Plus, action: onNavigateToAdd, active: false },
            { label: "My Recipes", icon: Book, action: onNavigateToRecipes, active: false },
          ].map((item) => (
            <button // Changed div to button for better accessibility
              key={item.label} 
              className={`flex flex-col items-center py-2 px-3 rounded-md cursor-pointer transition-colors w-1/3 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${ // Added focus styles and w-1/3
                item.active 
                ? "text-blue-600 dark:text-blue-400" 
                : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
              onClick={item.active ? undefined : item.action} // Prevent action if already active
              aria-current={item.active ? "page" : undefined}
            >
              <item.icon className={`w-6 h-6 mb-1 ${item.active ? "text-blue-600 dark:text-blue-400" : ""}`} />
              <span className={`text-xs font-medium ${item.active ? "text-blue-600 dark:text-blue-400" : ""}`}>{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
