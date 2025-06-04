"use client"

import { Search, Filter, Star, Book, Home, Plus, ChevronLeft, User, Image as ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
// Removed: import Image from "next/image" 
import { useState, useEffect, useMemo, useCallback } from "react"

interface Recipe {
  id: string; // Should be string if coming from Firestore
  name: string;
  calories?: string; // Or caloriesPer100g: number;
  caloriesPer100g?: number;
  isFavorite: boolean;
  category?: string; // Make sure this is in your Firebase data for recipes
  image?: string; // Cloudinary link
}

interface RecipesPageProps {
  onNavigateToPublic?: () => void;
  onNavigateToHome: () => void;
  onNavigateToAdd: () => void; // For adding consumed food
  onNavigateToDetail?: (recipeId: string) => void; // Pass recipeId
  onNavigateToAddRecipe?: () => void; // For creating a new recipe
  onNavigateToSettings: () => void;
}

const flaskApiUrl = (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_API_BASE_URL) 
                    || "http://localhost:5000";

export default function RecipesPage({
  onNavigateToPublic,
  onNavigateToHome,
  onNavigateToAdd, // This is for adding consumed menu, not creating a recipe
  onNavigateToDetail,
  onNavigateToAddRecipe, // This is for navigating to a page to create a new recipe
  onNavigateToSettings,
}: RecipesPageProps) {
  const [allRecipes, setAllRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  
  // Derive unique categories from recipes for filters
  const categories = useMemo(() => {
    const uniqueCategories = new Set(allRecipes.map(r => r.category).filter(Boolean) as string[]);
    return ["All", "Favorites", ...Array.from(uniqueCategories)];
  }, [allRecipes]);


  const fetchRecipes = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const token = localStorage.getItem('firebaseIdToken');

    if (!token) {
      setError("Authentication required. Please log in.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${flaskApiUrl}/api/recipes/my-recipes`, {
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
      const data: Recipe[] = await response.json();
      // Format calories string if needed, or ensure backend sends it as desired
      const formattedData = data.map(recipe => ({
        ...recipe,
        calories: recipe.caloriesPer100g ? `~${recipe.caloriesPer100g} Cal/100g` : recipe.calories || "N/A",
      }));
      setAllRecipes(formattedData);
    } catch (err) {
      console.error("Failed to fetch recipes:", err);
       if (!error) { // Only set error if not already set by a specific condition (like 401)
        setError(err instanceof Error ? err.message : "Failed to load recipes.");
      }
    } finally {
      setIsLoading(false);
    }
  }, []); // Removed 'error' from dependencies to prevent potential infinite loops

  useEffect(() => {
    fetchRecipes();
  }, [fetchRecipes]);

  const toggleFavorite = async (recipeId: string) => {
    const token = localStorage.getItem('firebaseIdToken');
    if (!token) {
      setError("Authentication required to update favorites.");
      return;
    }

    // Optimistic update
    const originalRecipes = [...allRecipes];
    setAllRecipes(prevRecipes =>
      prevRecipes.map(recipe =>
        recipe.id === recipeId ? { ...recipe, isFavorite: !recipe.isFavorite } : recipe
      )
    );

    try {
      const response = await fetch(`${flaskApiUrl}/api/recipes/toggle-favorite`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ recipeId }),
      });

      if (!response.ok) {
        // Revert optimistic update on failure
        setAllRecipes(originalRecipes);
        const errorData = await response.json().catch(() => ({ error: "Failed to parse error" }));
        setError(errorData.error || "Failed to update favorite status.");
        throw new Error(errorData.error || "Failed to update favorite");
      }
      // const result = await response.json(); // Contains { isFavorite: boolean }
      // Optionally, re-fetch or update based on result if optimistic update is not precise enough
      // For now, optimistic update is fine.
      
    } catch (err) {
      setAllRecipes(originalRecipes); // Revert on network error
      setError(err instanceof Error ? err.message : "Error updating favorite.");
      console.error("Toggle favorite error:", err);
    }
  };

  const filteredRecipes = useMemo(() => {
    return allRecipes.filter(recipe => {
      const matchesSearch = recipe.name.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;

      if (activeFilter === "All") return true;
      if (activeFilter === "Favorites") return recipe.isFavorite;
      return recipe.category === activeFilter;
    });
  }, [allRecipes, searchTerm, activeFilter]);

  if (isLoading) {
    return <div className="max-w-sm mx-auto bg-white dark:bg-gray-900 min-h-screen flex items-center justify-center"><p className="text-gray-700 dark:text-gray-300">Loading recipes...</p></div>;
  }

  if (error) {
    return (
      <div className="max-w-sm mx-auto bg-white dark:bg-gray-900 min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <p className="text-red-500 dark:text-red-400 text-lg mb-4">Error</p>
        <p className="text-gray-700 dark:text-gray-300 mb-6">{error}</p>
        <Button onClick={fetchRecipes} className="bg-blue-500 hover:bg-blue-600 text-white">Try Again</Button>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto bg-white dark:bg-gray-800 min-h-screen text-gray-900 dark:text-white">
      {/* Header */}
      <div className="px-4 pt-6 pb-4 sticky top-0 bg-white dark:bg-gray-800 z-20 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Button variant="ghost" size="icon" className="mr-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700" onClick={onNavigateToHome}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">My Recipes</h1>
          </div>
          <button
            onClick={onNavigateToSettings}
            className="w-10 h-10 bg-gray-800 dark:bg-gray-700 rounded-full flex items-center justify-center hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
          >
            <User className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
          <Input 
            placeholder="Search my recipes..." 
            className="pl-10 pr-4 bg-gray-100 dark:bg-gray-700 border-transparent focus:border-blue-500 dark:focus:border-blue-400 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {/* Filter icon can be used to open a modal for more advanced filters if needed */}
          {/* <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" /> */}
        </div>

        <div className="flex gap-3 mb-4">
          <Button
            onClick={onNavigateToPublic}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-3"
          >
            <Book className="w-4 h-4 mr-2" /> {/* Changed icon */}
            Browse Public
          </Button>
          <Button
            onClick={onNavigateToAddRecipe}
            className="flex-1 bg-gray-800 hover:bg-gray-700 dark:bg-green-600 dark:hover:bg-green-700 text-white rounded-lg py-3"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add New Recipe
          </Button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map((filter) => (
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

      {/* Recipe Grid */}
      <div className="px-4 pb-24 pt-4"> {/* Added pt-4 */}
        {filteredRecipes.length > 0 ? (
          <div className="grid grid-cols-2 gap-4">
            {filteredRecipes.map((recipe) => (
              <div key={recipe.id} className="bg-gray-100 dark:bg-gray-700 rounded-2xl p-3 flex flex-col shadow-md">
                <div className="w-full h-32 rounded-xl mb-3 overflow-hidden relative bg-gray-300 dark:bg-gray-600">
                  {recipe.image ? (
                    <img
                      src={recipe.image} // Cloudinary link
                      alt={recipe.name}
                      className="w-full h-full object-cover"
                      onError={(e) => (e.currentTarget.style.display = 'none')} // Basic error handling
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
                        <ImageIcon size={40}/>
                    </div>
                  )}
                </div>
                <h4 className="font-semibold text-md truncate mb-1" title={recipe.name}>{recipe.name}</h4>
                <p className="text-gray-600 dark:text-gray-400 text-xs mb-3">{recipe.calories}</p>

                <div className="mt-auto flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-600">
                  <Button
                    size="sm"
                    className="bg-gray-700 hover:bg-gray-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-lg py-1 px-3 text-xs"
                    onClick={() => onNavigateToDetail && onNavigateToDetail(recipe.id)}
                  >
                    <Book className="w-3 h-3 mr-1" />
                    View
                  </Button>
                  <button
                    onClick={() => toggleFavorite(recipe.id)}
                    className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"
                    aria-label={recipe.isFavorite ? "Remove from favorites" : "Add to favorites"}
                  >
                    <Star className={`w-5 h-5 transition-colors ${recipe.isFavorite ? "text-yellow-400 fill-yellow-400" : "text-gray-400 dark:text-gray-500 hover:text-yellow-300"}`} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500 dark:text-gray-400 py-10">
            No recipes found matching your criteria.
          </p>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-sm bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-10">
        <div className="flex justify-around py-2">
          {[
            { label: "Home", icon: Home, action: onNavigateToHome, active: false },
            { label: "Add Food", icon: Plus, action: onNavigateToAdd, active: false }, // Changed label for clarity
            { label: "Recipes", icon: Book, action: () => {}, active: true }, // Current page
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
