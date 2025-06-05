"use client"

import { Search, Star, Book, Home, Plus, ChevronLeft, Users, Clock, Image as ImageIcon, Zap, Thermometer, AlertTriangle, Loader2 } from "lucide-react" // Star is already here
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState, useEffect, useMemo, useCallback } from "react"

interface PublicRecipe {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  category?: string;
  difficulty?: string; 
  cookTime?: string; 
  caloriesPerServing?: number; 
  servings?: number;
  authorName?: string;
  ratingAvg?: number;
  savesCount?: number; // This is the 'likes' count from the recipe document
  isPopular?: boolean;
  isSavedByCurrentUser?: boolean; // This flag determines if the Star icon is filled

  carbs?: number;
  cholesterol?: number; 
  fat?: number;
  protein?: number;
  sodium?: number;
  potassium?: number;
  iron?: number;
  ingredients?: Record<string, any> | string[]; 
  steps?: string[];
  createdAt?: string; 
  updatedAt?: string; 
}

interface PublicRecipesPageProps {
  onNavigateBack?: () => void;
  onNavigateToHome: () => void;
  onNavigateToAdd: () => void; 
  onNavigateToRecipes: () => void; 
  onNavigateToDetail?: (recipeId: string) => void;
}

const flaskApiUrl = (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_API_BASE_URL) 
                      || "http://localhost:5000"; 

export default function PublicRecipesPage({
  onNavigateBack,
  onNavigateToHome,
  onNavigateToAdd,
  onNavigateToRecipes,
  onNavigateToDetail,
}: PublicRecipesPageProps) {
  const [allPublicRecipes, setAllPublicRecipes] = useState<PublicRecipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");

  const categoriesAndDifficulties = useMemo(() => {
    const uniqueCategories = new Set(allPublicRecipes.map(r => r.category).filter(Boolean) as string[]);
    const uniqueDifficulties = new Set(allPublicRecipes.map(r => r.difficulty).filter(Boolean) as string[]);
    return {
        categories: Array.from(uniqueCategories),
        difficulties: Array.from(uniqueDifficulties)
    }
  }, [allPublicRecipes]);

  const filters = useMemo(() => {
    return [
        "All", 
        "Popular", 
        ...categoriesAndDifficulties.categories, 
        ...categoriesAndDifficulties.difficulties
    ].filter((value, index, self) => self.indexOf(value) === index && value); 
  }, [categoriesAndDifficulties]);

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
        if (response.status === 401 && token) {
            localStorage.removeItem('firebaseIdToken');
            localStorage.removeItem('currentUser');
            setError("Session expired. Please log in again to see saved status.");
        } else {
            setError(errorData.error || `Error: ${response.status}`);
        }
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      const data: PublicRecipe[] = await response.json();
      setAllPublicRecipes(data); // Data from backend should already be formatted
    } catch (err) {
      console.error("Failed to fetch public recipes:", err);
      if (!error) { 
        setError(err instanceof Error ? err.message : "Failed to load public recipes.");
      }
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  useEffect(() => {
    fetchPublicRecipes();
  }, [fetchPublicRecipes]);

  const toggleSaveRecipe = async (recipeId: string) => {
    const token = localStorage.getItem('firebaseIdToken');
    if (!token) {
      setError("Please log in to save/unsave recipes.");
      return;
    }

    const originalRecipes = [...allPublicRecipes];
    // Optimistic update
    setAllPublicRecipes(prevRecipes =>
      prevRecipes.map(recipe => {
        if (recipe.id === recipeId) {
          const newSavedStatus = !recipe.isSavedByCurrentUser;
          const currentSaves = typeof recipe.savesCount === 'number' ? recipe.savesCount : 0;
          // Adjust savesCount based on the new status. If it's being saved, increment. If unsaved, decrement.
          const newSavesCount = newSavedStatus ? currentSaves + 1 : Math.max(0, currentSaves - 1);
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
        setAllPublicRecipes(originalRecipes); // Revert optimistic update on failure
        const errorData = await response.json().catch(() => ({ error: "Failed to parse error" }));
         if (response.status === 401) {
            localStorage.removeItem('firebaseIdToken');
            localStorage.removeItem('currentUser');
            setError("Session expired. Please log in again to update saved status.");
        } else {
            setError(errorData.error || "Failed to update saved status.");
        }
        throw new Error(errorData.error || "Failed to update saved status");
      }
      
      const result = await response.json(); 
      // Update with server's source of truth for isSaved and newLikesCount (which is savesCount)
      setAllPublicRecipes(prevRecipes =>
        prevRecipes.map(recipe =>
          recipe.id === result.recipeId 
            ? { ...recipe, isSavedByCurrentUser: result.isSaved, savesCount: result.newLikesCount } 
            : recipe
        )
      );

    } catch (err) {
      setAllPublicRecipes(originalRecipes); // Revert on any error
      if (!error && !(err instanceof Error && err.message.includes("Session expired")) ) {
         setError(err instanceof Error ? err.message : "Error updating saved status.");
      }
      console.error("Toggle save error:", err);
    }
  };

  const filteredRecipes = useMemo(() => {
    return allPublicRecipes.filter(recipe => {
      const searchTermLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || 
                            recipe.name.toLowerCase().includes(searchTermLower) ||
                            (recipe.authorName && recipe.authorName.toLowerCase().includes(searchTermLower)) ||
                            (recipe.category && recipe.category.toLowerCase().includes(searchTermLower)) ||
                            (recipe.description && recipe.description.toLowerCase().includes(searchTermLower));
      
      if (!matchesSearch) return false;

      if (activeFilter === "All") return true;
      if (activeFilter === "Popular") return recipe.isPopular === true;
      if (categoriesAndDifficulties.difficulties.includes(activeFilter)) {
          return recipe.difficulty === activeFilter;
      }
      if (categoriesAndDifficulties.categories.includes(activeFilter)) {
          return recipe.category === activeFilter;
      }
      return false; 
    });
  }, [allPublicRecipes, searchTerm, activeFilter, categoriesAndDifficulties]);


  if (isLoading) { /* ... loading UI ... */ }
  if (error) { /* ... error UI ... */ }

  return (
    <div className="max-w-sm mx-auto bg-white dark:bg-gray-800 min-h-screen text-gray-900 dark:text-white">
      {/* Header */}
      <div className="px-4 pt-6 pb-4 sticky top-0 bg-white dark:bg-gray-800 z-20 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
                <Button variant="ghost" size="icon" className="mr-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700" onClick={onNavigateBack || onNavigateToHome}>
                    <ChevronLeft className="h-5 w-5" />
                </Button>
                <h1 className="text-xl font-bold">Public Recipes</h1>
            </div>
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
              size="sm" 
              className={`rounded-full px-3 py-1 text-xs whitespace-nowrap ${ 
                activeFilter === filter 
                ? "bg-gray-900 dark:bg-blue-500 text-white" 
                : "bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600"
              }`}
              onClick={() => setActiveFilter(filter)}
            >
              {filter === "Popular" && <Zap size={12} className="mr-1" />}
              {categoriesAndDifficulties.difficulties.includes(filter) && <Thermometer size={12} className="mr-1" />}
              {filter}
            </Button>
          ))}
        </div>
      </div>

      {/* Error Display ancent_page_consume_flow */}
        {error && !isLoading && ( // Show error only if not loading
            <div className="px-4 pt-2">
                <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 px-3 py-2 rounded-lg flex items-center gap-2 text-sm" role="alert">
                    <AlertTriangle size={18} />
                    <span>{error}</span>
                     <Button onClick={fetchPublicRecipes} size="sm" variant="ghost" className="ml-auto text-red-600 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800/50">Retry</Button>
                </div>
            </div>
        )}
      
      {/* Loading State */}
      {isLoading && (
          <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500 dark:text-blue-400" />
          </div>
      )}


      {/* Recipe Grid */}
      {!isLoading && !error && ( // Only show grid if not loading and no error
        <div className="px-4 pb-24 pt-4">
            {filteredRecipes.length > 0 ? (
            <div className="grid grid-cols-2 gap-4">
                {filteredRecipes.map((recipe) => (
                <div key={recipe.id} className="bg-gray-100 dark:bg-gray-700 rounded-2xl p-3 flex flex-col shadow-md hover:shadow-lg transition-shadow">
                    <div className="w-full h-32 rounded-xl mb-3 overflow-hidden relative bg-gray-300 dark:bg-gray-600">
                    {recipe.imageUrl ? (
                        <img
                        src={recipe.imageUrl} 
                        alt={recipe.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none'; 
                            const parent = target.parentElement;
                            if (parent && !parent.querySelector('.placeholder-icon')) { 
                                const placeholder = document.createElement('div');
                                placeholder.className = 'placeholder-icon w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500';
                                placeholder.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>';
                                parent.appendChild(placeholder);
                            }
                        }}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
                            <ImageIcon size={40}/>
                        </div>
                    )}
                    </div>
                    <h4 className="font-semibold text-sm truncate mb-0.5 text-gray-800 dark:text-gray-100" title={recipe.name}>{recipe.name}</h4>
                    {recipe.authorName && <p className="text-gray-500 dark:text-gray-400 text-xs truncate mb-1">by {recipe.authorName}</p>}
                    {typeof recipe.caloriesPerServing === 'number' && 
                        <p className="text-gray-700 dark:text-gray-300 text-xs mb-2">~{recipe.caloriesPerServing.toFixed(0)} Cal</p>
                    }
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
                        onClick={() => toggleSaveRecipe(recipe.id)}
                        className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500"
                        aria-label={recipe.isSavedByCurrentUser ? "Remove from favorites" : "Add to favorites"}
                    >
                        <Star className={`w-5 h-5 transition-colors ${recipe.isSavedByCurrentUser ? "text-yellow-400 dark:text-yellow-300 fill-current" : "text-gray-400 dark:text-gray-500 hover:text-yellow-400 dark:hover:text-yellow-300"}`} />
                    </button>
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
      )}


      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-sm bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-10">
        <div className="flex justify-around py-2">
          {[
            { label: "Home", icon: Home, action: onNavigateToHome, active: false },
            { label: "Add Food", icon: Plus, action: onNavigateToAdd, active: false },
            { label: "Public", icon: Users, action: () => {}, active: true }, 
            { label: "My Recipes", icon: Book, action: onNavigateToRecipes, active: false },
          ].map((item) => (
              <button // Changed to button for accessibility
                key={item.label} 
                className={`flex flex-col items-center py-2 px-3 rounded-md cursor-pointer transition-colors w-1/4 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 ${
                    item.active 
                    ? "text-blue-600 dark:text-blue-400" 
                    : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
                onClick={item.active ? undefined : item.action}
                aria-current={item.active ? "page" : undefined}
              >
                <item.icon className={`w-5 h-5 mb-0.5`} /> {/* Adjusted icon size */}
                <span className={`text-xs font-medium`}>{item.label}</span>
              </button>
          ))}
        </div>
      </div>
    </div>
  );
}
