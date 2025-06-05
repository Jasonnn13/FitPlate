"use client"

import { ChevronLeft, Heart, Share, Clock, Home, Plus, Book, Image as ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button" // Assuming this path is correct
// import Image from "next/image" // Removed as per consistency with RecipesPage
import { useState, useEffect, useCallback } from "react"

const flaskApiUrl = (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_API_BASE_URL)
                      || "http://localhost:5000"; 

// Interface for the detailed recipe structure expected from the API
interface RecipeNutritionClient {
  calories?: number
  totalFat?: number
  protein?: number
  carbohydrates?: number
  cholesterol?: number
  sodium?: number
  iron?: number
  potassium?: number
}

interface RecipeDetail {
  id: string
  name: string
  author: string // Author's display name
  authorId?: string // UID of the author
  likes: number
  cookTime: string // e.g., "30 Mins"
  servings: number
  image?: string // URL for the image
  description?: string
  nutrition: RecipeNutritionClient
  ingredients: string[]
  steps: string[]
  category?: string
  isFavoriteByCurrentUser?: boolean // Set by the API based on logged-in user
  // Add any other fields your API might return for the detail view
}

interface RecipeDetailPageProps {
  recipeId: string; // The ID of the recipe to display
  onNavigateBack?: () => void
  onNavigateToHome: () => void
  onNavigateToAdd: () => void // For "Add Food" (consumed)
  onNavigateToRecipes: () => void // To go back to the recipes list
}

export default function RecipeDetailPage({
  recipeId,
  onNavigateBack,
  onNavigateToHome,
  onNavigateToAdd,
  onNavigateToRecipes,
}: RecipeDetailPageProps) {
  const [recipeData, setRecipeData] = useState<RecipeDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Local state for like button, initialized by recipeData.isFavoriteByCurrentUser
  const [isLiked, setIsLiked] = useState(false);
  const [currentLikes, setCurrentLikes] = useState(0);

  const fetchRecipeDetail = useCallback(async () => {
    if (!recipeId) {
      setError("No recipe ID provided.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    const token = localStorage.getItem('firebaseIdToken'); // Get token for auth-dependent fields like isFavorite

    try {
      const response = await fetch(`${flaskApiUrl}/api/recipes/public/${recipeId}`, {
        method: 'GET',
        headers: token ? {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        } : {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to parse error response" }));
        if (response.status === 401 && token) { // Only treat as session expired if a token was sent
          localStorage.removeItem('firebaseIdToken');
          localStorage.removeItem('currentUser'); // Assuming you store user info here
          setError("Session expired or unauthorized. Please log in again.");
        } else if (response.status === 404) {
          setError("Recipe not found.");
        } else {
          setError(errorData.error || `Error: ${response.status}`);
        }
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      const data: RecipeDetail = await response.json();
      setRecipeData(data);
      setIsLiked(!!data.isFavoriteByCurrentUser); // Initialize like state from fetched data
      setCurrentLikes(data.likes || 0);

    } catch (err) {
      console.error("Failed to fetch recipe details:", err);
      if (!error) { // Avoid overwriting specific error messages like 401 or 404
        setError(err instanceof Error ? err.message : "Failed to load recipe details.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [recipeId, error]); // Added error to dependency array to allow re-fetching if error state changes (e.g. user clicks retry)

  useEffect(() => {
    fetchRecipeDetail();
  }, [fetchRecipeDetail]); // fetchRecipeDetail is memoized by useCallback

  const handleLikeToggle = async () => {
    if (!recipeData) return;

    const token = localStorage.getItem('firebaseIdToken');
    if (!token) {
      setError("Authentication required to update favorites.");
      // Optionally, redirect to login or show a modal
      return;
    }

    const originalIsLiked = isLiked;
    const originalLikes = currentLikes;

    // Optimistic update
    setIsLiked(!originalIsLiked);
    setCurrentLikes(prevLikes => originalIsLiked ? prevLikes - 1 : prevLikes + 1);

    try {
      // Determine which endpoint to call.
      // The /api/recipes/toggle-favorite was originally for "my-recipes" list.
      // The /api/recipes/public/toggle-save was for public recipes, updating 'likes' on the recipe doc.
      // Let's assume /api/recipes/public/toggle-save is more appropriate here as it affects the recipe's like count.
      // Or, ideally, a unified endpoint like `/api/recipes/toggle-like-status`
      const response = await fetch(`${flaskApiUrl}/api/recipes/public/toggle-save`, { // Or your unified endpoint
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ recipeId: recipeData.id }),
      });

      if (!response.ok) {
        // Revert optimistic update
        setIsLiked(originalIsLiked);
        setCurrentLikes(originalLikes);
        const errorData = await response.json().catch(() => ({ error: "Failed to parse error" }));
         if (response.status === 401) {
          localStorage.removeItem('firebaseIdToken');
          localStorage.removeItem('currentUser');
          setError("Session expired. Please log in again to update favorites.");
        } else {
          setError(errorData.error || "Failed to update favorite status.");
        }
        throw new Error(errorData.error || "Failed to update favorite");
      }
      
      const result = await response.json();
      // Update likes count from server response if it's provided and differs (e.g., result.newLikesCount)
      if (typeof result.newLikesCount === 'number') {
        setCurrentLikes(result.newLikesCount);
      }
      setIsLiked(result.isSaved); // Ensure isLiked state matches server state

    } catch (err) {
      // Revert optimistic update on network or other errors
      setIsLiked(originalIsLiked);
      setCurrentLikes(originalLikes);
      if (!error && !(err instanceof Error && err.message.includes("Session expired"))) { // Avoid overwriting specific session expired message
         setError(err instanceof Error ? err.message : "Error updating favorite.");
      }
      console.error("Toggle favorite error:", err);
    }
  };
  
  if (isLoading) {
    return <div className="max-w-sm mx-auto bg-white dark:bg-gray-900 min-h-screen flex items-center justify-center"><p className="text-gray-700 dark:text-gray-300">Loading recipe...</p></div>;
  }

  if (error) {
    return (
      <div className="max-w-sm mx-auto bg-white dark:bg-gray-900 min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <p className="text-red-500 dark:text-red-400 text-lg mb-4">Error</p>
        <p className="text-gray-700 dark:text-gray-300 mb-6">{error}</p>
        <Button onClick={fetchRecipeDetail} className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:hover:bg-blue-600">
          Try Again
        </Button>
         <Button variant="outline" onClick={onNavigateBack || onNavigateToRecipes} className="mt-4">
            Go Back
        </Button>
      </div>
    );
  }

  if (!recipeData) {
    return <div className="max-w-sm mx-auto bg-white dark:bg-gray-900 min-h-screen flex items-center justify-center"><p className="text-gray-700 dark:text-gray-300">Recipe not found.</p></div>;
  }

  return (
    <div className="max-w-sm mx-auto bg-white dark:bg-gray-800 min-h-screen text-gray-900 dark:text-white">
      {/* Header */}
      <div className="px-4 pt-6 pb-4 sticky top-0 bg-white dark:bg-gray-800 z-10 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={onNavigateBack || onNavigateToRecipes} className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold truncate px-2" title={recipeData.name}>{recipeData.name}</h1>
          <Button variant="ghost" size="icon" className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
            <Share className="h-5 w-5" /> {/* Add actual share functionality if needed */}
          </Button>
        </div>
      </div>

      {/* Recipe Content */}
      <div className="pb-24 pt-4">
        {/* Recipe Image */}
        <div className="px-4 mb-4">
          <div className="w-full h-48 bg-gray-200 dark:bg-gray-700 rounded-2xl overflow-hidden flex items-center justify-center">
            {recipeData.image ? (
              <img
                src={recipeData.image}
                alt={recipeData.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    // Optionally, show a placeholder icon within its parent
                    const parent = target.parentElement;
                    if (parent) {
                        const placeholder = document.createElement('div');
                        placeholder.className = 'w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500';
                        placeholder.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>'; // ImageIcon
                        if (parent.firstChild) parent.insertBefore(placeholder, parent.firstChild); else parent.appendChild(placeholder);
                    }
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
                <ImageIcon size={48} />
              </div>
            )}
          </div>
        </div>

        {/* Recipe Info */}
        <div className="px-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{recipeData.name}</h2>
            <button onClick={handleLikeToggle} className="flex items-center gap-1 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
              <Heart className={`w-5 h-5 transition-colors ${isLiked ? "text-red-500 fill-current" : "text-gray-500 dark:text-gray-400"}`} />
              <span className="text-gray-600 dark:text-gray-300 text-sm">{currentLikes}</span>
            </button>
          </div>

          <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-gray-600 dark:text-gray-400 text-sm mb-4">
            <span>by {recipeData.author}</span>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{recipeData.cookTime}</span>
            </div>
            <span>{recipeData.servings} servings</span>
          </div>

          {recipeData.description && <p className="text-gray-700 dark:text-gray-300 text-sm mb-4">{recipeData.description}</p>}
        </div>

        {/* Nutrition Information */}
        {recipeData.nutrition && (Object.keys(recipeData.nutrition).length > 0 || recipeData.nutrition.calories) && (
          <div className="px-4 mb-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Nutrition Facts</h3>
            <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl p-4">
              {recipeData.nutrition.calories !== undefined && (
                 <div className="bg-blue-600 dark:bg-blue-500 text-white rounded-xl p-4 mb-4">
                    <div className="text-center">
                    <div className="text-3xl font-bold">{recipeData.nutrition.calories}</div>
                    <div className="text-sm opacity-90">Calories per serving</div>
                    </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3 mb-4">
                {recipeData.nutrition.totalFat !== undefined && (
                  <div className="text-center">
                    <div className="text-lg font-bold text-gray-900 dark:text-white">{recipeData.nutrition.totalFat}g</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Total Fat</div>
                  </div>
                )}
                {recipeData.nutrition.protein !== undefined && (
                  <div className="text-center">
                    <div className="text-lg font-bold text-gray-900 dark:text-white">{recipeData.nutrition.protein}g</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Protein</div>
                  </div>
                )}
                {recipeData.nutrition.carbohydrates !== undefined && (
                  <div className="text-center">
                    <div className="text-lg font-bold text-gray-900 dark:text-white">{recipeData.nutrition.carbohydrates}g</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Carbs</div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {[
                  { label: "Cholesterol", value: recipeData.nutrition.cholesterol, unit: "mg" },
                  { label: "Sodium", value: recipeData.nutrition.sodium, unit: "mg" },
                  { label: "Iron", value: recipeData.nutrition.iron, unit: "mg" },
                  { label: "Potassium", value: recipeData.nutrition.potassium, unit: "mg" },
                ].map(item => item.value !== undefined && (
                  <div key={item.label} className="flex justify-between items-center">
                    <span className="text-gray-800 dark:text-gray-200 text-sm">{item.label}</span>
                    <span className="text-gray-600 dark:text-gray-400 text-sm">{item.value}{item.unit}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Ingredients */}
        {recipeData.ingredients && recipeData.ingredients.length > 0 && (
          <div className="px-4 mb-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Ingredients</h3>
            <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl p-4">
              <ul className="space-y-3 list-disc list-inside">
                {recipeData.ingredients.map((ingredient: string, index: number) => (
                  <li key={index} className="text-gray-800 dark:text-gray-200 text-sm">
                     <span className="ml-[-0.5em]">{ingredient}</span> {/* Custom bullet alignment if needed */}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Steps */}
        {recipeData.steps && recipeData.steps.length > 0 && (
          <div className="px-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Steps</h3>
            <div className="space-y-4">
              {recipeData.steps.map((step: string, index: number) => (
                <div key={index} className="flex gap-3 items-start">
                  <div className="w-7 h-7 bg-gray-800 dark:bg-gray-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                    {index + 1}
                  </div>
                  <p className="text-gray-800 dark:text-gray-200 text-sm leading-relaxed flex-1">{step}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-sm bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-10">
        <div className="flex justify-around py-2">
          {[
            { label: "Home", icon: Home, action: onNavigateToHome, activePathSegment: "home" }, // Example active logic
            { label: "Add Food", icon: Plus, action: onNavigateToAdd, activePathSegment: "add" },
            { label: "Recipes", icon: Book, action: onNavigateToRecipes, activePathSegment: "recipes" },
          ].map((item) => {
            // Basic active state logic: Check if current page's recipeId means we are in a "recipe detail" under "recipes"
            const isActive = item.label === "Recipes"; // Simplistic: mark Recipes tab active
            return (
                <div 
                    key={item.label} 
                    className={`flex flex-col items-center py-2 px-3 rounded-md cursor-pointer transition-colors ${
                        isActive 
                        ? "text-blue-600 dark:text-blue-400" 
                        : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                    onClick={item.action}
                >
                    <item.icon className={`w-6 h-6 mb-1 ${isActive ? "text-blue-600 dark:text-blue-400" : ""}`} />
                    <span className={`text-xs font-medium ${isActive ? "text-blue-600 dark:text-blue-400" : ""}`}>{item.label}</span>
                </div>
            );
          })}
        </div>
      </div>
    </div>
  )
}

