"use client"

import { ChevronLeft, Search, Star, Book, Home, Plus, Image as ImageIcon, CheckCircle, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
// import Image from "next/image"; // Using <img> tag
import { useState, useEffect, useMemo, useCallback } from "react"

// A more detailed recipe structure, aligning with what backend might send
interface RecipeForPicker {
  id: string;
  name: string;
  calories?: number; // Expecting number from backend for calculation
  isFavorite?: boolean; // From 'my-recipes'
  isMyRecipe?: boolean; // Custom flag added on frontend
  image?: string; 
  category?: string;
  authorName?: string; // For public recipes
  // Add any other fields useful for display or selection
  description?: string;
  cookTime?: string;
  servings?: number;
  // For passing back to parent after selection and consumption
  ingredients?: string[];
  steps?: string[];
  protein?: number;
  fat?: number;
  carbs?: number;
}

interface PickRecipePageProps {
  onNavigateBack: () => void
  onNavigateToHome: () => void
  onNavigateToAdd: () => void // To AddConsumedMenuPage
  onNavigateToRecipes: () => void // To MyRecipesPage
  // This will be called AFTER successful consumption API call
  onRecipeConsumedAndSelected: (consumedRecipeDetails: RecipeForPicker) => void 
}

const flaskApiUrl = (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_API_BASE_URL) 
                      || "http://localhost:5000";

export default function PickRecipePage({
  onNavigateBack,
  onNavigateToHome,
  onNavigateToAdd,
  onNavigateToRecipes,
  onRecipeConsumedAndSelected,
}: PickRecipePageProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedFilter, setSelectedFilter] = useState("All")
  const [allFetchedRecipes, setAllFetchedRecipes] = useState<RecipeForPicker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [consumingRecipeId, setConsumingRecipeId] = useState<string | null>(null);

  const filters = ["All", "My Recipes", "Public", "Favorites"]; // Simplified for now

  const fetchRecipesForPicker = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const token = localStorage.getItem('firebaseIdToken');
    if (!token) {
      setError("Authentication required to view recipes. Please log in.");
      setIsLoading(false);
      return;
    }

    try {
      // Fetch My Recipes
      const myRecipesResponse = await fetch(`${flaskApiUrl}/api/recipes/my-recipes`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      let myRecipes: RecipeForPicker[] = [];
      if (myRecipesResponse.ok) {
        const myRecipesData = await myRecipesResponse.json();
        myRecipes = myRecipesData.map((r: any) => ({ ...r, isMyRecipe: true, calories: r.calories || (r.nutrition?.calories) })) as RecipeForPicker[];
      } else {
        console.warn("Could not fetch 'My Recipes'");
      }

      // Fetch Public Recipes
      const publicRecipesResponse = await fetch(`${flaskApiUrl}/api/recipes/public`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {} // Send token to get 'isSavedByCurrentUser'
      });
      let publicRecipes: RecipeForPicker[] = [];
      if (publicRecipesResponse.ok) {
        const publicRecipesData = await publicRecipesResponse.json();
        // Map public recipe structure to RecipeForPicker, especially 'isSavedByCurrentUser' to 'isFavorite' if needed for filter
        publicRecipes = publicRecipesData.map((r: any) => ({ 
            ...r, 
            image: r.imageUrl || r.image, // Prefer imageUrl if present
            isMyRecipe: false, // Mark as not user's own creation
            isFavorite: r.isSavedByCurrentUser, // Use this for favorite status
            calories: r.caloriesPerServing || r.calories, // Prefer caloriesPerServing
        })) as RecipeForPicker[];
      } else {
        console.warn("Could not fetch 'Public Recipes'");
      }

      // Combine and de-duplicate (recipes from 'my-recipes' might also be in 'public')
      const combined = [...myRecipes];
      const myRecipeIds = new Set(myRecipes.map(r => r.id));
      publicRecipes.forEach(pr => {
        if (!myRecipeIds.has(pr.id)) {
          combined.push(pr);
        }
      });
      
      setAllFetchedRecipes(combined);

    } catch (err) {
      console.error("Failed to fetch recipes for picker:", err);
      setError(err instanceof Error ? err.message : "Failed to load recipes.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecipesForPicker();
  }, [fetchRecipesForPicker]);

  const filteredRecipes = useMemo(() => {
    return allFetchedRecipes.filter((recipe) => {
      const matchesSearch = !searchQuery || recipe.name.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (selectedFilter === "All") return true;
      if (selectedFilter === "My Recipes") return recipe.isMyRecipe === true;
      if (selectedFilter === "Public") return recipe.isMyRecipe === false; // Basic distinction
      if (selectedFilter === "Favorites") return recipe.isFavorite === true; // 'isFavorite' now reflects saved status for public or favorite for own
      // Add "Recent" filter logic if needed (would require tracking recent consumption or views)
      return true; 
    });
  }, [allFetchedRecipes, searchQuery, selectedFilter]);

  const handleSelectAndConsumeRecipe = async (recipe: RecipeForPicker) => {
    const token = localStorage.getItem('firebaseIdToken');
    if (!token) {
      setError("Authentication required to consume recipe.");
      return;
    }
    if (!recipe.id) {
        setError("Selected recipe has no ID.");
        return;
    }
    setConsumingRecipeId(recipe.id);
    setError(null);

    try {
      const response = await fetch(`${flaskApiUrl}/api/user/pick-recipe`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ recipeId: recipe.id }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to consume recipe."}));
         if (response.status === 401) {
            localStorage.removeItem('firebaseIdToken');
            localStorage.removeItem('currentUser');
            setError("Session expired. Please log in again.");
        } else {
            setError(errorData.error || `Error: ${response.status}`);
        }
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      const consumptionResult = await response.json();
      console.log("Consumption result:", consumptionResult);

      // Pass the originally selected recipe object (or enhanced with consumptionResult if needed)
      // The parent will use this to display details on AddConsumedMenuPage
      onRecipeConsumedAndSelected(recipe); // Pass the full recipe object as selected
      // onNavigateBack(); // Removed, parent will handle navigation via setCurrentPage
      
    } catch (err) {
      console.error("Error consuming recipe:", err);
      if (!error) { // Avoid overwriting more specific errors
        setError(err instanceof Error ? err.message : "Could not record consumption.");
      }
    } finally {
      setConsumingRecipeId(null);
    }
  };

  if (isLoading) {
    return <div className="max-w-sm mx-auto bg-white dark:bg-gray-900 min-h-screen flex items-center justify-center"><p className="text-gray-700 dark:text-gray-300">Loading recipes to pick...</p></div>;
  }

  return (
    <div className="max-w-sm mx-auto bg-white dark:bg-gray-800 min-h-screen text-gray-900 dark:text-white">
      {/* Header */}
      <div className="px-4 pt-6 pb-4 sticky top-0 bg-white dark:bg-gray-800 z-10 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center mb-4">
          <Button variant="ghost" size="icon" className="mr-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700" onClick={onNavigateBack} disabled={!!consumingRecipeId}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Pick From Recipe</h1>
        </div>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search recipes..."
            className="pl-10 bg-gray-100 dark:bg-gray-700 border-transparent focus:border-blue-500 dark:focus:border-blue-400 rounded-lg placeholder-gray-400 dark:placeholder-gray-500"
            disabled={!!consumingRecipeId}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {filters.map((filter) => (
            <Button
              key={filter}
              variant={selectedFilter === filter ? "default" : "outline"}
              size="sm"
              className={`rounded-full px-3 py-1 text-xs whitespace-nowrap ${
                selectedFilter === filter ? "bg-blue-600 dark:bg-blue-500 text-white" : "bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600"
              }`}
              onClick={() => setSelectedFilter(filter)}
              disabled={!!consumingRecipeId}
            >
              {filter}
            </Button>
          ))}
        </div>
      </div>

      {/* Error Display */}
        {error && (
            <div className="px-4 pt-2">
                <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 px-3 py-2 rounded-lg flex items-center gap-2 text-sm" role="alert">
                    <AlertTriangle size={18} />
                    <span>{error}</span>
                </div>
            </div>
        )}

      {/* Recipe List */}
      <div className="px-4 pb-24 pt-4"> {/* Added pt-4 if error message is present */}
        <div className="space-y-3">
          {filteredRecipes.map((recipe) => (
            <div
              key={recipe.id}
              onClick={() => !consumingRecipeId && handleSelectAndConsumeRecipe(recipe)}
              className={`bg-gray-100 dark:bg-gray-700 rounded-2xl p-3 flex items-center gap-3 transition-all ${
                consumingRecipeId === recipe.id ? "opacity-50 cursor-wait" : "cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              <div className="w-16 h-16 bg-gray-200 dark:bg-gray-600 rounded-xl overflow-hidden flex-shrink-0">
                {recipe.image ? (
                  <img
                    src={recipe.image}
                    alt={recipe.name}
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                  />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500"><ImageIcon size={32}/></div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="font-semibold text-gray-900 dark:text-white truncate" title={recipe.name}>{recipe.name}</h3>
                  {recipe.isFavorite && <Star className="w-3 h-3 text-yellow-400 fill-current flex-shrink-0" />}
                </div>
                {recipe.isMyRecipe && (
                  <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 text-xs px-1.5 py-0.5 rounded-full mr-1">Mine</span>
                )}
                 {recipe.category && (
                  <span className="text-gray-500 dark:text-gray-400 text-xs">{recipe.category}</span>
                )}
                <p className="text-gray-600 dark:text-gray-300 text-xs mt-0.5">
                  {recipe.calories ? `~${recipe.calories} Cal` : "Calories N/A"}
                </p>
              </div>
              <div className="text-blue-600 dark:text-blue-400">
                {consumingRecipeId === recipe.id ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                ) : (
                    <CheckCircle className="w-5 h-5" />
                )}
              </div>
            </div>
          ))}
        </div>
        {filteredRecipes.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">No recipes found</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm">Try adjusting your search or filter, or add some recipes!</p>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-sm bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-10">
        <div className="flex justify-around py-2">
          {[
            { label: "Home", icon: Home, action: onNavigateToHome, active: false },
            { label: "Add", icon: Plus, action: onNavigateToAdd, active: true }, // "Add" (Consumed Menu) is active conceptually
            { label: "Recipes", icon: Book, action: onNavigateToRecipes, active: false },
          ].map((item) => (
            <button
              key={item.label} 
              disabled={!!consumingRecipeId}
              className={`flex flex-col items-center py-1 px-3 rounded-md cursor-pointer transition-colors disabled:opacity-50 ${
                item.active 
                ? "text-blue-600 dark:text-blue-400" 
                : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
              onClick={item.action}
            >
              <item.icon className={`w-5 h-5 mb-0.5`} />
              <span className={`text-xs font-medium`}>{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
