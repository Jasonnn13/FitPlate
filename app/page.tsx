"use client"

import { useState } from "react"
import LoginPage from "../pages/auth/login-page"
import RegisterPage from "../pages/auth/register-page"
import OnboardingPage from "../pages/onboarding-page"
import HomePage from "../pages/home-page"
import RecipesPage from "../pages/recipe/recipes-page"
import PublicRecipesPage from "../pages/recipe/public-recipes-page"
import AddRecipePage from "../pages/recipe/add-recipe-page"
import RecipeDetailPage from "../pages/recipe/recipe-detail-page" // This expects recipeId
import IngredientsPage from "../pages/ingredients/ingredients-page"
import IngredientDetailPage from "../pages/ingredients/ingredient-detail-page"
import SettingsPage from "../pages/settings-page"
import AddConsumedMenuPage from "../pages/consumedMenu/add-consumed-menu-page"
import PickRecipePage from "../pages/recipe/pick-recipe-page"
import SaveAsRecipePage from "../pages/recipe/save-as-recipe-page"
import { toast } from "@/hooks/use-toast" // Assuming this is correctly set up

export default function Page() {
  const [currentPage, setCurrentPage] = useState<
    | "login"
    | "register"
    | "onboarding"
    | "home"
    | "recipes"
    | "public"
    | "addRecipe"
    | "addConsumed"
    | "pickRecipe"
    | "saveAsRecipe"
    | "detail" // For user's recipes
    | "recommendedDetail" // For the static recommended recipe
    | "ingredients"
    | "ingredientDetail"
    | "settings"
  >("login")

  const [selectedIngredient, setSelectedIngredient] = useState<any>(null)
  // const [selectedRecipe, setSelectedRecipe] = useState<any>(null) // Keep if needed for other flows like pickRecipe
  const [activeRecipeId, setActiveRecipeId] = useState<string | null>(null); // For navigating to RecipeDetailPage

  const [consumedMealData, setConsumedMealData] = useState<any>(null)
  const [isIngredientSelectionMode, setIsIngredientSelectionMode] = useState(false)
  const [ingredientSelectionContext, setIngredientSelectionContext] = useState<"recipe" | "consumed">("recipe")

  const [consumedMenuIngredients, setConsumedMenuIngredients] = useState<any[]>([])
  const [recipeIngredients, setRecipeIngredients] = useState<any[]>([])

  // Recommended recipe data - adding a mock ID for RecipeDetailPage
  const recommendedRecipe = {
    id: "static-rendang-recipe", // Mock ID for RecipeDetailPage to "fetch" or handle
    name: "Rendang",
    author: "Traditional Indonesian",
    likes: 245,
    cookTime: "3-4 Hours",
    servings: 6,
    image: "/rendang-dish.png", // Ensure this image exists in your public folder
    description:
      "Slow-cooked beef braised in coconut milk and a blend of aromatic spices. This traditional Indonesian dish is rich, flavorful, and perfect for special occasions.",
    nutrition: {
      calories: 195,
      totalFat: 12.5,
      protein: 18.3,
      carbohydrates: 8.2,
      cholesterol: 65,
      sodium: 420,
      iron: 2.8,
      potassium: 380,
      // Vitamins can be added here if RecipeDetailPage is updated to show them
    },
    ingredients: [
      "2 lbs beef chuck, cut into 2-inch cubes",
      "2 cans (14 oz each) coconut milk",
      "2 lemongrass stalks, bruised",
      // ... other ingredients
    ],
    steps: [
      "Blend all spice paste ingredients with a little water until smooth.",
      "Heat oil in a heavy-bottomed pot over medium heat. Add spice paste and cook for 10-15 minutes until fragrant.",
      // ... other steps
    ],
  }

  // Authentication flow
  if (currentPage === "login") {
    return (
      <LoginPage
        onNavigateToRegister={() => setCurrentPage("register")}
        onNavigateToHome={() => setCurrentPage("home")}
        onShowMessage={(message, type) => {
          const variant = type === "success" ? "default" : type === "error" ? "destructive" : undefined;
          toast({ description: message, variant });
        }}
      />
    )
  }

  if (currentPage === "register") {
    return (
      <RegisterPage
        onNavigateToLogin={() => setCurrentPage("login")}
        onNavigateToOnboarding={() => setCurrentPage("onboarding")}
        onShowMessage={(message, type) => {
          const variant = type === "success" ? "default" : type === "error" ? "destructive" : undefined;
          toast({ description: message, variant });
        }}
      />
    )
  }

  if (currentPage === "onboarding") {
    return <OnboardingPage onComplete={() => setCurrentPage("home")} />
  }

  // Settings page
  if (currentPage === "settings") {
    return (
      <SettingsPage
        onNavigateBack={() => setCurrentPage("home")} // Or previous page logic
        onNavigateToLogin={() => setCurrentPage("login")}
        onNavigateToHome={() => setCurrentPage("home")}
        onNavigateToAdd={() => setCurrentPage("addConsumed")}
        onNavigateToRecipes={() => setCurrentPage("recipes")}
      />
    )
  }

  // Save as recipe page
  if (currentPage === "saveAsRecipe") {
    return (
      <SaveAsRecipePage
        mealData={consumedMealData}
        onNavigateBack={() => setCurrentPage("addConsumed")}
        onNavigateToHome={() => setCurrentPage("home")}
        onNavigateToRecipes={() => setCurrentPage("recipes")}
        onNavigateToSettings={() => setCurrentPage("settings")}
        onSaveAsRecipe={() => {
          setRecipeIngredients(consumedMealData?.selectedIngredients || [])
          setConsumedMealData(null); // Clear consumed meal data after deciding to save as recipe
          setCurrentPage("addRecipe")
        }}
        onJustSaveMeal={() => {
            // Logic to just save the meal (e.g., to consumption history) then navigate
            console.log("Saving consumed meal:", consumedMealData);
            toast({description: "Meal saved to consumption history (mock)."})
            setCurrentPage("home")
        }}
      />
    )
  }

  // Add consumed menu flow
  if (currentPage === "addConsumed") {
    return (
      <AddConsumedMenuPage
        onNavigateBack={() => setCurrentPage("home")}
        onNavigateToHome={() => setCurrentPage("home")}
        onNavigateToRecipes={() => setCurrentPage("recipes")}
        onNavigateToPickRecipe={() => setCurrentPage("pickRecipe")}
        onNavigateToSettings={() => { localStorage.setItem('previousPageBeforeSettings', 'addConsumed'); setCurrentPage("settings");}}
        onNavigateToSaveAsRecipe={(mealData) => {
          setConsumedMealData(mealData);
          setCurrentPage("saveAsRecipe");
        }}
        // For manually adding ingredients to a consumed meal (if not picking a full recipe)
        onNavigateToIngredients={() => { /* Logic for manual ingredient addition to consumed meal if needed */ }}
        selectedIngredients={consumedMenuIngredients} // If AddConsumed supports manual list
        onUpdateIngredients={setConsumedMenuIngredients}
      />
    )
  }

  if (currentPage === "pickRecipe") {
    // Store the last consumed recipe info in state (if you want to use it elsewhere)
    // For now, just a placeholder since it's only used for toast and navigation.
    // You can expand this if you want to show a summary after consumption.
    // Define RecipeForPicker type if not imported from elsewhere
    type RecipeForPicker = {
      id: string;
      name: string;
      [key: string]: any; // Add more fields as needed
    };

    function setLastConsumedRecipeInfo(consumedRecipeDetails: RecipeForPicker) {
      // Example: store in state or localStorage if needed
      // setLastConsumedRecipe(consumedRecipeDetails);
      // localStorage.setItem("lastConsumedRecipe", JSON.stringify(consumedRecipeDetails));
      // Currently, nothing else is required here.
    }

    return (
      <PickRecipePage
        onNavigateBack={() => setCurrentPage("addConsumed")}
        onNavigateToHome={() => setCurrentPage("home")}
        onNavigateToAdd={() => setCurrentPage("addConsumed")} // Stays on addConsumed, which will show selected
        onNavigateToRecipes={() => setCurrentPage("recipes")}
        onRecipeConsumedAndSelected={(consumedRecipeDetails) => {
          setLastConsumedRecipeInfo(consumedRecipeDetails); // Store details of consumed recipe
          toast({ description: `${consumedRecipeDetails.name} consumed and added to your log!`, variant: "default"});
          setCurrentPage("addConsumed"); // Go back to AddConsumedMenuPage to display it
        }}
      />
    )
  }

  // Recipe pages
  if (currentPage === "recipes") {
    return (
      <RecipesPage
        onNavigateToPublic={() => setCurrentPage("public")}
        onNavigateToHome={() => setCurrentPage("home")}
        onNavigateToAdd={() => setCurrentPage("addConsumed")}
        onNavigateToDetail={(recipeId) => { // Correctly capture recipeId
          setActiveRecipeId(recipeId);
          setCurrentPage("detail");
        }}
        onNavigateToAddRecipe={() => {
          setConsumedMealData(null) 
          setRecipeIngredients([]) 
          setCurrentPage("addRecipe")
        }}
        onNavigateToSettings={() => setCurrentPage("settings")}
      />
    )
  }

  if (currentPage === "public") {
    return (
      <PublicRecipesPage
        onNavigateBack={() => setCurrentPage("recipes")}
        onNavigateToHome={() => setCurrentPage("home")}
        onNavigateToAdd={() => setCurrentPage("addConsumed")}
        onNavigateToRecipes={() => setCurrentPage("recipes")}
        // PublicRecipesPage would also need an onNavigateToDetail:
        onNavigateToDetail={(recipeId) => {
            setActiveRecipeId(recipeId);
            setCurrentPage("detail"); // Or a different state if public recipe details are handled differently
        }}
      />
    )
  }

  if (currentPage === "addRecipe") {
    return (
      <AddRecipePage
          onNavigateBack={() => {
              setCurrentPage(consumedMealData ? "saveAsRecipe" : "recipes");
          }}
          onNavigateToHome={() => setCurrentPage("home")}
          onNavigateToRecipes={() => setCurrentPage("recipes")}
          // onNavigateToIngredients prop is removed here as it's no longer used by AddRecipePage
          prefilledData={consumedMealData}
          selectedIngredients={recipeIngredients} // Should be string[]
          onUpdateIngredients={setRecipeIngredients} // Should update string[]
      />
    )
  }

  // Detail page for user's recipes (fetched by ID)
  if (currentPage === "detail" && activeRecipeId) { // Ensure activeRecipeId is available
    return (
      <RecipeDetailPage
        recipeId={activeRecipeId} // Pass the active ID
        onNavigateBack={() => {
            setCurrentPage("recipes");
            setActiveRecipeId(null); // Clear the ID when going back
        }}
        onNavigateToHome={() => {
            setCurrentPage("home");
            setActiveRecipeId(null);
        }}
        onNavigateToAdd={() => setCurrentPage("addConsumed")} // This is "Add Food" (consumed)
        onNavigateToRecipes={() => { // This is to go back to the recipes list
            setCurrentPage("recipes");
            setActiveRecipeId(null);
        }}
      />
    )
  }

  // Recommended recipe detail page
  if (currentPage === "recommendedDetail") {
    // RecipeDetailPage expects a recipeId to fetch.
    // If recommendedRecipe is static and has no real ID to fetch from backend,
    // RecipeDetailPage needs to be adapted to accept a full recipe object directly.
    // For now, we pass the mock ID. The backend won't find 'static-rendang-recipe'
    // unless you have a mock endpoint for it, or RecipeDetailPage has logic
    // to display pre-loaded data if recipeId is this special mock ID.
    // A better approach for static data might be a simpler display component
    // or enhancing RecipeDetailPage to accept an optional 'initialData' prop.
    return (
      <RecipeDetailPage
        recipeId={recommendedRecipe.id} // Pass the mock ID
        // recipe={recommendedRecipe} // This was the old way, RecipeDetailPage now fetches by ID
        onNavigateBack={() => setCurrentPage("home")}
        onNavigateToHome={() => setCurrentPage("home")}
        onNavigateToAdd={() => setCurrentPage("addConsumed")}
        onNavigateToRecipes={() => setCurrentPage("recipes")}
      />
    )
  }

  // Fallback to HomePage or Login if no specific page matches or on initial load (after auth check)
  return (
    <HomePage
      onNavigateToAdd={() => {
        setConsumedMenuIngredients([])
        setCurrentPage("addConsumed")
      }}
      onNavigateToRecipes={() => setCurrentPage("recipes")}
      onNavigateToSettings={() => setCurrentPage("settings")}
      onNavigateToRecipeDetail={(recipeId) => {
            setActiveRecipeId(recipeId);
            setCurrentPage("detail"); // Or a different state if public recipe details are handled differently
        }}
    />
  )
}
