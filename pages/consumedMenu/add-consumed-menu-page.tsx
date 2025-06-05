"use client"

import { ChevronLeft, Plus, Clock, Home, Book, User, Info, Edit3, Save, Loader2, RefreshCw, Trash2, Eye, CheckCircle, Zap, Flame, Salad, Utensils } from "lucide-react" // Added more icons for nutrition
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useState, useEffect, useCallback } from "react"

// Interface for the recipe details fetched and displayed
interface RecipeDisplayInfo {
  id: string;
  name: string;
  calories?: number;
  image?: string;
  ingredients?: string[]; 
  steps?: string[];
  protein?: number;
  fat?: number;
  carbs?: number;
  servings?: number; // Original servings of the recipe
  cookTime?: string;
  description?: string;
  category?: string;
  // Add other nutrition fields if returned by API and needed for display
  cholesterol?: number;
  sodium?: number;
  potassium?: number;
  iron?: number;
}

interface AddConsumedMenuPageProps {
  onNavigateBack?: () => void;
  onNavigateToHome: () => void;
  onNavigateToRecipes: () => void;
  onNavigateToPickRecipe: () => void; 
  onNavigateToSettings: () => void;
  onNavigateToSaveAsRecipe: (mealData: any) => void;
  refreshConsumedTrigger?: number; 
  onNavigateToIngredients?: () => void; 
  selectedIngredients?: any[]; 
  onUpdateIngredients?: (ingredients: any[]) => void;
}

const flaskApiUrl = (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_API_BASE_URL) 
                      || "http://localhost:5000"; 


export default function AddConsumedMenuPage({
  onNavigateBack,
  onNavigateToHome,
  onNavigateToRecipes,
  onNavigateToPickRecipe,
  onNavigateToSettings,
  onNavigateToSaveAsRecipe,
  refreshConsumedTrigger, 
}: AddConsumedMenuPageProps) {
  const [todaysLoggedRecipes, setTodaysLoggedRecipes] = useState<RecipeDisplayInfo[]>([]);
  const [selectedRecipeForAction, setSelectedRecipeForAction] = useState<RecipeDisplayInfo | null>(null);
  
  const [isLoadingLog, setIsLoadingLog] = useState(true);
  const [fetchLogError, setFetchLogError] = useState<string | null>(null);

  const [mealNameOverride, setMealNameOverride] = useState("") 
  const [portion, setPortion] = useState("1") 
  const [notes, setNotes] = useState("")
  const [selectedMealTime, setSelectedMealTime] = useState("")

  const mealTimes = ["Breakfast", "Lunch", "Dinner", "Snack", "Other"]

  const fetchTodaysConsumedDetailed = useCallback(async () => {
    setIsLoadingLog(true);
    setFetchLogError(null);
    setSelectedRecipeForAction(null); 
    try {
      const token = localStorage.getItem('firebaseIdToken');
      if (!token) {
        setFetchLogError("Authentication required. Please log in.");
        setIsLoadingLog(false);
        return;
      }
      const response = await fetch(`${flaskApiUrl}/api/user/todays-consumed-recipes`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({error: "Server error or unauthorized."}));
         if (response.status === 401) {
            localStorage.removeItem('firebaseIdToken');
            localStorage.removeItem('currentUser');
            setFetchLogError("Session expired. Please log in again.");
        } else {
            setFetchLogError(errData.error || `Failed to fetch today's log (status ${response.status})`);
        }
        throw new Error(errData.error || `HTTP error!`);
      }
      const data: RecipeDisplayInfo[] = await response.json();
      setTodaysLoggedRecipes(data);
    } catch (error) {
      console.error("Error fetching today's consumed recipes:", error);
      if (!fetchLogError && !(error instanceof Error && error.message.includes("Session expired"))) { 
        setFetchLogError(error instanceof Error ? error.message : "Unknown error fetching log.");
      }
    } finally {
      setIsLoadingLog(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps 
  }, []); 

  useEffect(() => {
    fetchTodaysConsumedDetailed();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshConsumedTrigger]); 

  useEffect(() => {
    if (selectedRecipeForAction) {
      setMealNameOverride(selectedRecipeForAction.name);
      setSelectedMealTime(""); 
      setPortion("1");       
      setNotes(`Based on consumed: ${selectedRecipeForAction.name}.`);
    } else {
      setMealNameOverride("");
      setPortion("1");
      setNotes("");
      setSelectedMealTime("");
    }
  }, [selectedRecipeForAction]);

  const handleSelectRecipeForAction = (recipe: RecipeDisplayInfo) => {
    if (selectedRecipeForAction?.id === recipe.id && selectedRecipeForAction?.name === recipe.name) { // Check name too if IDs might not be unique across log entries
        setSelectedRecipeForAction(null); 
    } else {
        setSelectedRecipeForAction(recipe);
    }
  }

  const handleProceedToSaveAsRecipe = () => {
    if (!selectedRecipeForAction) { 
        alert("Please select a logged recipe from the list to use as a base.");
        return;
    }
    if (!selectedMealTime) {
        alert("Please select a meal time for this new recipe context (if applicable) or consumption log.");
        return;
    }
     if (!portion.trim() || Number(portion) <= 0 || isNaN(Number(portion))) {
        alert("Please enter a valid portion for this action.");
        return;
    }

    const mealDataForSaveAsRecipe = {
      mealName: mealNameOverride || selectedRecipeForAction.name,
      portion: portion,
      notes: notes,
      mealTime: selectedMealTime, 
      originalRecipe: selectedRecipeForAction, 
      timestamp: new Date(), 
      imageUrl: selectedRecipeForAction.image, 
    };
    
    onNavigateToSaveAsRecipe(mealDataForSaveAsRecipe);
  };

  const NutritionDetailItem = ({ label, value, unit, icon: IconComp }: {label: string, value?: number, unit: string, icon?: React.ElementType}) => {
    if (value === undefined || value === null) return null;
    return (
        <div className="flex items-center justify-between py-1.5 px-3 bg-gray-50 dark:bg-gray-700/50 rounded-md text-xs">
            <div className="flex items-center text-gray-600 dark:text-gray-300">
                {IconComp && <IconComp size={14} className="mr-2 opacity-70" />}
                <span>{label}</span>
            </div>
            <span className="font-medium text-gray-800 dark:text-gray-100">{value.toFixed(1)}{unit}</span>
        </div>
    );
  };


  return (
    <div className="max-w-sm mx-auto bg-white dark:bg-gray-800 min-h-screen text-gray-900 dark:text-white">
      {/* Header */}
      <div className="px-4 pt-6 pb-4 sticky top-0 bg-white dark:bg-gray-800 z-20 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Button variant="ghost" size="icon" className="mr-2 text-gray-700 dark:text-gray-300" onClick={onNavigateBack}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">Today's Consumed Meals</h1>
          </div>
          <button onClick={onNavigateToSettings} className="w-10 h-10 bg-gray-800 dark:bg-gray-700 rounded-full flex items-center justify-center hover:bg-gray-700 dark:hover:bg-gray-600">
            <User className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-32 space-y-6">
        <div className="flex gap-2">
            <Button
            onClick={onNavigateToPickRecipe}
            className="flex-1 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2"
            >
            <Plus className="w-5 h-5" />
            Pick Recipe
            </Button>
        </div>

        {isLoadingLog && (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="animate-spin w-6 h-6 text-blue-500" />
            <span className="ml-2 text-gray-500 dark:text-gray-300">Loading...</span>
          </div>
        )}
        {fetchLogError && !isLoadingLog && (
          <div className="flex flex-col items-center py-8 text-red-600 dark:text-red-400">
            <Info className="w-6 h-6 mb-2" />
            <span>{fetchLogError}</span>
          </div>
        )}
        {!isLoadingLog && !fetchLogError && todaysLoggedRecipes.length === 0 && (
          <div className="flex flex-col items-center py-8 text-gray-500 dark:text-gray-400">
            <Book className="w-8 h-8 mb-2" />
            <span>No meals consumed today.</span>
          </div>
        )}

        {/* Display List of Today's Consumed Recipes */}
        {!isLoadingLog && !fetchLogError && todaysLoggedRecipes.length > 0 && (
            <div className="space-y-3">
                <h2 className="text-md font-semibold text-gray-700 dark:text-gray-300">Meals consumed today ({todaysLoggedRecipes.length}):</h2>
                {todaysLoggedRecipes.map((recipe, index) => (
                    <div key={recipe.id + '-' + index} 
                         className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${selectedRecipeForAction?.id === recipe.id && selectedRecipeForAction?.name === recipe.name ? 'bg-blue-100 dark:bg-blue-900/50 border-blue-500 dark:border-blue-400 shadow-xl' : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'}`}
                         onClick={() => handleSelectRecipeForAction(recipe)}
                    >
                        <div className="flex items-center gap-3">
                            {recipe.image ? (
                                <img src={recipe.image} alt={recipe.name} className="w-12 h-12 rounded-md object-cover flex-shrink-0"/>
                            ) : (
                                <div className="w-12 h-12 rounded-md bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-gray-400 dark:text-gray-500 flex-shrink-0">
                                    <Book size={24} />
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate" title={recipe.name}>{recipe.name}</p>
                                {recipe.calories && <p className="text-xs text-gray-600 dark:text-gray-400">{recipe.calories} Calories </p>}
                            </div>
                            {selectedRecipeForAction?.id === recipe.id && selectedRecipeForAction?.name === recipe.name ? 
                                <CheckCircle size={20} className="text-blue-600 dark:text-blue-400 flex-shrink-0"/> :
                                <Eye size={20} className="text-gray-400 dark:text-gray-500 flex-shrink-0"/>
                            }
                        </div>
                    </div>
                ))}
            </div>
        )}
        
        {/* Nutrition Display & Form for Action on Selected Logged Recipe */}
        {selectedRecipeForAction && !isLoadingLog && !fetchLogError && (
          <div className="mt-6 pt-6 border-t border-gray-300 dark:border-gray-600 space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                Details for: <span className="text-blue-600 dark:text-blue-400">{selectedRecipeForAction.name}</span>
            </h3>

            {/* Nutrition Facts Display */}
            <div className="bg-gray-100 dark:bg-gray-700/70 p-4 rounded-xl space-y-2">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Base Nutrition (per original serving):</h4>
                {selectedRecipeForAction.calories !== undefined && (
                    <div className="flex items-center justify-center py-2 px-3 bg-blue-500 dark:bg-blue-600 text-white rounded-lg text-center mb-2">
                        <Flame size={16} className="mr-2"/>
                        <span className="font-bold text-lg">{selectedRecipeForAction.calories.toFixed(0)}</span>
                        <span className="ml-1 text-xs">kcal</span>
                    </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <NutritionDetailItem label="Protein" value={selectedRecipeForAction.protein} unit="g" icon={Zap}/>
                    <NutritionDetailItem label="Fat" value={selectedRecipeForAction.fat} unit="g" icon={Utensils}/> {/* Could use a better icon for fat */}
                    <NutritionDetailItem label="Carbs" value={selectedRecipeForAction.carbs} unit="g" icon={Salad}/>
                    <NutritionDetailItem label="Cholesterol" value={selectedRecipeForAction.cholesterol} unit="mg" />
                    <NutritionDetailItem label="Sodium" value={selectedRecipeForAction.sodium} unit="mg" />
                    <NutritionDetailItem label="Potassium" value={selectedRecipeForAction.potassium} unit="mg" />
                    <NutritionDetailItem label="Iron" value={selectedRecipeForAction.iron} unit="mg" />
                </div>
                 {selectedRecipeForAction.servings !== undefined && <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">Original recipe serves: {selectedRecipeForAction.servings}</p>}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 w-full max-w-sm mx-auto bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-20">
        <div className="flex justify-around py-1.5 border-t-0 pt-2.5"> 
          {[
            { label: "Home", icon: Home, action: onNavigateToHome, active: false },
            { label: "Add", icon: Plus, action: () => {}, active: true }, 
            { label: "Recipes", icon: Book, action: onNavigateToRecipes, active: false },
          ].map((item) => (
            <div key={item.label}
              className={`flex flex-col items-center py-1 px-3 rounded-md cursor-pointer ${item.active ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"}`}
              onClick={item.action}
            >
              <item.icon className="w-5 h-5 mb-0.5" />
              <span className="text-xs font-medium">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
