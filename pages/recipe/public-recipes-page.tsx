"use client"

import { Search, Filter, Star, Book, Home, Plus, ChevronLeft, Download, Users, Clock, Image as ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
// Removed: import Image from "next/image"
import { useState, useEffect, useMemo, useCallback } from "react"

interface PublicRecipe {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string; // Mapped from 'image' in your schema
  category?: string;
  difficulty?: string; // This needs to be in your Firebase data if you want to filter by it
  cookTime?: string; // Formatted string e.g. "30 min", from 'time' in your schema
  caloriesPerServing?: number; // Mapped from 'calories' in your schema
  servings?: number; // From 'serving' in your schema
  
  authorName?: string; // Mapped from 'maker' in your schema
  ratingAvg?: number; // Assuming this is calculated or stored
  savesCount?: number; // Mapped from 'likes' in your schema
  isPopular?: boolean; // Assuming this is determined or stored
  isSavedByCurrentUser?: boolean;

  // Nutritional info from your schema
  carbs?: number;
  cholesterol?: number; // Note: your schema had 'cholestrol'
  fat?: number;
  protein?: number;
  sodium?: number;
  potassium?: number;
  iron?: number;

  // Complex fields from your schema
  ingredients?: Record<string, any>; // e.g., { amount: [1], ingredientId: [...] }
  steps?: string[];

  // Timestamps (optional for display)
  createdAt?: string; // ISO string
  updatedAt?: string; // ISO string
}

interface PublicRecipesPageProps {
  onNavigateBack?: () => void;
  onNavigateToHome: () => void;
  onNavigateToAdd: () => void;
  onNavigateToRecipes: () => void; // To "My Recipes"
  onNavigateToPublicRecipeDetail?: (recipeId: string) => void;
}

const flaskApiUrl = (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_API_BASE_URL) 
                    || "http://localhost:5000";

export default function PublicRecipesPage({
  onNavigateBack,
  onNavigateToHome,
  onNavigateToAdd,
  onNavigateToRecipes,
  onNavigateToPublicRecipeDetail,
}: PublicRecipesPageProps) {
  const [allPublicRecipes, setAllPublicRecipes] = useState<PublicRecipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");

  const filters = useMemo(() => {
    const uniqueCategories = new Set(allPublicRecipes.map(r => r.category).filter(Boolean) as string[]);
    const uniqueDifficulties = new Set(allPublicRecipes.map(r => r.difficulty).filter(Boolean) as string[]);
    return ["All", "Popular", ...Array.from(uniqueCategories), ...Array.from(uniqueDifficulties)].filter(Boolean);
  }, [allPublicRecipes]);

  const fetchPublicRecipes = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const token = localStorage.getItem('firebaseIdToken');

    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) { 
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${flaskApiUrl}/api/recipes/public`, {
        method: 'GET',
        headers: headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to parse error" }));
        setError(errorData.error || `Error: ${response.status}`);
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      const data: PublicRecipe[] = await response.json();
      // The backend now maps fields like 'image' to 'imageUrl', 'maker' to 'authorName',
      // 'time' to 'cookTime', 'calories' to 'caloriesPerServing', 'likes' to 'savesCount'.
      // We just need to construct the display string for calories.
      const formattedData = data.map(recipe => ({
        ...recipe,
        calories: recipe.caloriesPerServing ? `~${recipe.caloriesPerServing} Cal/serving` : "N/A",
      }));
      setAllPublicRecipes(formattedData);
    } catch (err) {
      console.error("Failed to fetch public recipes:", err);
      if (!error) {
        setError(err instanceof Error ? err.message : "Failed to load public recipes.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [error]);

  useEffect(() => {
    fetchPublicRecipes();
  }, [fetchPublicRecipes]);

  const toggleSaveRecipe = async (recipeId: string) => {
    const token = localStorage.getItem('firebaseIdToken');
    if (!token) {
      setError("Please log in to save recipes.");
      return;
    }

    const originalRecipes = [...allPublicRecipes];
    setAllPublicRecipes(prevRecipes =>
      prevRecipes.map(recipe => {
        if (recipe.id === recipeId) {
          const newSavedStatus = !recipe.isSavedByCurrentUser;
          const newSavesCount = (recipe.savesCount ?? 0) + (newSavedStatus ? 1 : -1);
          return { ...recipe, isSavedByCurrentUser: newSavedStatus, savesCount: newSavesCount };
        }
        return recipe;
      })
    );

    try {
      const response = await fetch(`${flaskApiUrl}/api/recipes/public/toggle-save`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ recipeId }),
      });

      if (!response.ok) {
        setAllPublicRecipes(originalRecipes); 
        const errorData = await response.json().catch(() => ({ error: "Failed to parse error" }));
        setError(errorData.error || "Failed to update save status.");
        throw new Error(errorData.error || "Failed to update save status");
      }
      
      const result = await response.json(); 
      setAllPublicRecipes(prevRecipes =>
        prevRecipes.map(recipe =>
          recipe.id === result.recipeId ? { ...recipe, isSavedByCurrentUser: result.isSaved, savesCount: result.newLikesCount } : recipe
        )
      );

    } catch (err) {
      setAllPublicRecipes(originalRecipes); 
      setError(err instanceof Error ? err.message : "Error updating save status.");
      console.error("Toggle save error:", err);
    }
  };

  const filteredRecipes = useMemo(() => {
    return allPublicRecipes.filter(recipe => {
      const searchTermLower = searchTerm.toLowerCase();
      const matchesSearch = recipe.name.toLowerCase().includes(searchTermLower) ||
                            (recipe.authorName && recipe.authorName.toLowerCase().includes(searchTermLower)) ||
                            (recipe.category && recipe.category.toLowerCase().includes(searchTermLower)) ||
                            (recipe.description && recipe.description.toLowerCase().includes(searchTermLower));
      if (!matchesSearch && searchTerm) return false;

      if (activeFilter === "All") return true;
      if (activeFilter === "Popular") return recipe.isPopular === true;
      if (recipe.difficulty === activeFilter) return true; 
      return recipe.category === activeFilter;
    });
  }, [allPublicRecipes, searchTerm, activeFilter]);


  if (isLoading) {
    return <div className="max-w-sm mx-auto bg-white dark:bg-gray-900 min-h-screen flex items-center justify-center"><p className="text-gray-700 dark:text-gray-300">Browsing public recipes...</p></div>;
  }

  if (error) {
    return (
      <div className="max-w-sm mx-auto bg-white dark:bg-gray-900 min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <p className="text-red-500 dark:text-red-400 text-lg mb-4">Error</p>
        <p className="text-gray-700 dark:text-gray-300 mb-6">{error}</p>
        <Button onClick={fetchPublicRecipes} className="bg-blue-500 hover:bg-blue-600 text-white">Try Again</Button>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto bg-white dark:bg-gray-800 min-h-screen text-gray-900 dark:text-white">
      {/* Header */}
      <div className="px-4 pt-6 pb-4 sticky top-0 bg-white dark:bg-gray-800 z-20 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center mb-4">
          <Button variant="ghost" size="icon" className="mr-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700" onClick={onNavigateBack || onNavigateToRecipes}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Public Recipes</h1>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
          <Input 
            placeholder="Search recipes, authors, category..." 
            className="pl-10 pr-4 bg-gray-100 dark:bg-gray-700 border-transparent focus:border-blue-500 dark:focus:border-blue-400 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {filters.map((filter) => (
            <Button
              key={filter}
              variant={activeFilter === filter ? "default" : "outline"}
              className={`rounded-full px-4 py-1 text-sm whitespace-nowrap ${
                activeFilter === filter 
                ? "bg-gray-900 dark:bg-blue-500 text-white" 
                : "bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600"
              }`}
              onClick={() => setActiveFilter(filter)}
            >
              {filter}
            </Button>
          ))}
        </div>
      </div>

      {/* Recipe List */}
      <div className="px-4 pb-24 pt-4">
        {filteredRecipes.length > 0 ? (
          <div className="space-y-4">
            {filteredRecipes.map((recipe) => (
              <div key={recipe.id} className="bg-gray-100 dark:bg-gray-700 rounded-2xl p-3 shadow-md">
                <div className="flex gap-3">
                  <div className="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 relative bg-gray-300 dark:bg-gray-600">
                    {recipe.imageUrl ? (
                      <img
                        src={recipe.imageUrl} 
                        alt={recipe.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if(parent) parent.innerHTML = '<div class="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg></div>';
                        }}
                      />
                    ) : (
                       <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
                           <ImageIcon size={40}/>
                       </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1">
                      <h4 className="font-semibold text-sm truncate" title={recipe.name}>{recipe.name}</h4>
                      {recipe.isPopular && (
                        <span className="bg-pink-500 text-white text-xs px-2 py-0.5 rounded-full ml-2 flex-shrink-0">Popular</span>
                      )}
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 text-xs mb-1 truncate">by {recipe.authorName}</p>
                    {/* Using the 'calories' field which is formatted in fetchPublicRecipes */}
                    <p className="text-gray-800 dark:text-gray-200 text-xs mb-2">{recipe.caloriesPerServing}</p>
                    <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400 mb-2">
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                        <span>{recipe.ratingAvg?.toFixed(1)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        <span>{recipe.savesCount}</span> {/* Mapped from 'likes' */}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{recipe.cookTime}</span> {/* Mapped from 'time' */}
                      </div>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <Button 
                        size="sm"
                        className="bg-gray-700 hover:bg-gray-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-lg py-1 px-3 text-xs"
                        onClick={() => onNavigateToPublicRecipeDetail && onNavigateToPublicRecipeDetail(recipe.id)}
                      >
                        <Book className="w-3 h-3 mr-1" />
                        View
                      </Button>
                      <button
                        onClick={() => toggleSaveRecipe(recipe.id)}
                        className="flex items-center gap-1 text-xs p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
                        aria-label={recipe.isSavedByCurrentUser ? "Unsave recipe" : "Save recipe"}
                      >
                        <Download className={`w-4 h-4 transition-colors ${recipe.isSavedByCurrentUser ? "text-blue-500 dark:text-blue-400" : "text-gray-400 dark:text-gray-500 hover:text-blue-400"}`} />
                        <span className={recipe.isSavedByCurrentUser ? "text-blue-500 dark:text-blue-400" : "text-gray-500 dark:text-gray-400"}>
                          {recipe.isSavedByCurrentUser ? "Saved" : "Save"}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
           <p className="text-center text-gray-500 dark:text-gray-400 py-10">
            No public recipes found matching your criteria. Try a different search or filter!
          </p>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-sm bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-10">
        <div className="flex justify-around py-2">
          {[
            { label: "Home", icon: Home, action: onNavigateToHome, active: false },
            { label: "Add Food", icon: Plus, action: onNavigateToAdd, active: false },
            { label: "My Recipes", icon: Book, action: onNavigateToRecipes, active: true }, 
          ].map((item) => (
             <div 
                key={item.label} 
                className={`flex flex-col items-center py-2 px-3 rounded-md cursor-pointer transition-colors ${
                    item.active 
                    ? "text-blue-600 dark:text-blue-400" 
                    : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
                onClick={item.action}
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
