"use client"

import { useState } from "react"
import LoginPage from "../login-page"
import RegisterPage from "../register-page"
import OnboardingPage from "../onboarding-page"
import HomePage from "../home-page"
import RecipesPage from "../recipes-page"
import PublicRecipesPage from "../public-recipes-page"
import AddRecipePage from "../add-recipe-page"
import RecipeDetailPage from "../recipe-detail-page"
import IngredientsPage from "../ingredients-page"
import IngredientDetailPage from "../ingredient-detail-page"
import SettingsPage from "../settings-page"
import AddConsumedMenuPage from "../add-consumed-menu-page"
import PickRecipePage from "../pick-recipe-page"
import SaveAsRecipePage from "../save-as-recipe-page"

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
    | "detail"
    | "recommendedDetail"
    | "ingredients"
    | "ingredientDetail"
    | "settings"
  >("login")

  const [selectedIngredient, setSelectedIngredient] = useState<any>(null)
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null)
  const [consumedMealData, setConsumedMealData] = useState<any>(null)
  const [isIngredientSelectionMode, setIsIngredientSelectionMode] = useState(false)
  const [ingredientSelectionContext, setIngredientSelectionContext] = useState<"recipe" | "consumed">("recipe")

  // State to manage ingredients for both consumed menu and recipe
  const [consumedMenuIngredients, setConsumedMenuIngredients] = useState<any[]>([])
  const [recipeIngredients, setRecipeIngredients] = useState<any[]>([])

  // Recommended recipe data
  const recommendedRecipe = {
    name: "Rendang",
    author: "Traditional Indonesian",
    likes: 245,
    cookTime: "3-4 Hours",
    servings: 6,
    image: "/rendang-dish.png",
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
      vitamins: {
        vitaminA: 8,
        vitaminC: 15,
        vitaminD: 2,
        vitaminB6: 18,
        vitaminB12: 12,
        folate: 6,
      },
    },
    ingredients: [
      "2 lbs beef chuck, cut into 2-inch cubes",
      "2 cans (14 oz each) coconut milk",
      "2 lemongrass stalks, bruised",
      "4 kaffir lime leaves",
      "2 tbsp tamarind paste",
      "2 tbsp palm sugar",
      "Salt to taste",
      "Spice paste:",
      "8 dried chilies, soaked and deseeded",
      "6 shallots, peeled",
      "4 cloves garlic",
      "2-inch piece ginger",
      "2-inch piece galangal",
      "1 tsp turmeric powder",
    ],
    steps: [
      "Blend all spice paste ingredients with a little water until smooth.",
      "Heat oil in a heavy-bottomed pot over medium heat. Add spice paste and cook for 10-15 minutes until fragrant.",
      "Add beef cubes and brown on all sides, about 8-10 minutes.",
      "Pour in coconut milk, add lemongrass, lime leaves, tamarind paste, and palm sugar.",
      "Bring to a boil, then reduce heat to low and simmer uncovered for 2-3 hours, stirring occasionally.",
      "Continue cooking until the sauce is very thick and dark, and the beef is tender.",
      "Season with salt and adjust sweetness if needed.",
      "Serve hot with steamed rice.",
    ],
  }

  // Authentication flow
  if (currentPage === "login") {
    return (
      <LoginPage
        onNavigateToRegister={() => setCurrentPage("register")}
        onNavigateToHome={() => setCurrentPage("home")}
      />
    )
  }

  if (currentPage === "register") {
    return (
      <RegisterPage
        onNavigateToLogin={() => setCurrentPage("login")}
        onNavigateToOnboarding={() => setCurrentPage("onboarding")}
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
        onNavigateBack={() => setCurrentPage("home")}
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
          // Transfer consumed menu ingredients to recipe ingredients
          setRecipeIngredients(consumedMealData?.selectedIngredients || [])
          setCurrentPage("addRecipe")
        }}
        onJustSaveMeal={() => setCurrentPage("home")}
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
        onNavigateToSettings={() => setCurrentPage("settings")}
        onNavigateToSaveAsRecipe={(mealData) => {
          setConsumedMealData(mealData)
          setCurrentPage("saveAsRecipe")
        }}
        onNavigateToIngredients={() => {
          setIsIngredientSelectionMode(true)
          setIngredientSelectionContext("consumed")
          setCurrentPage("ingredients")
        }}
        selectedIngredients={consumedMenuIngredients}
        onUpdateIngredients={setConsumedMenuIngredients}
      />
    )
  }

  if (currentPage === "pickRecipe") {
    return (
      <PickRecipePage
        onNavigateBack={() => setCurrentPage("addConsumed")}
        onNavigateToHome={() => setCurrentPage("home")}
        onNavigateToAdd={() => setCurrentPage("addConsumed")}
        onNavigateToRecipes={() => setCurrentPage("recipes")}
        onSelectRecipe={(recipe) => {
          setSelectedRecipe(recipe)
          setCurrentPage("addConsumed")
        }}
      />
    )
  }

  // Ingredient pages
  if (currentPage === "ingredients") {
    return (
      <IngredientsPage
        onNavigateBack={() => {
          setIsIngredientSelectionMode(false)
          if (ingredientSelectionContext === "consumed") {
            setCurrentPage("addConsumed")
          } else {
            setCurrentPage("addRecipe")
          }
        }}
        onNavigateToHome={() => setCurrentPage("home")}
        onNavigateToAdd={() => setCurrentPage("addConsumed")}
        onNavigateToRecipes={() => setCurrentPage("recipes")}
        onNavigateToIngredientDetail={(ingredient) => {
          setSelectedIngredient(ingredient)
          setCurrentPage("ingredientDetail")
        }}
        onSelectIngredient={(ingredient) => {
          console.log("Selected ingredient:", ingredient.name)

          // Add ingredient to the appropriate list
          if (ingredientSelectionContext === "consumed") {
            const newIngredient = { ...ingredient, amount: "" }
            setConsumedMenuIngredients((prev) => [...prev, newIngredient])
          } else {
            const newIngredient = { ...ingredient, amount: "" }
            setRecipeIngredients((prev) => [...prev, newIngredient])
          }

          // Go back to the appropriate page
          setIsIngredientSelectionMode(false)
          if (ingredientSelectionContext === "consumed") {
            setCurrentPage("addConsumed")
          } else {
            setCurrentPage("addRecipe")
          }
        }}
        isSelectionMode={isIngredientSelectionMode}
        ingredientSelectionContext={ingredientSelectionContext}
      />
    )
  }

  if (currentPage === "ingredientDetail") {
    return (
      <IngredientDetailPage
        ingredient={selectedIngredient}
        onNavigateBack={() => setCurrentPage("ingredients")}
        onNavigateToHome={() => setCurrentPage("home")}
        onNavigateToAdd={() => setCurrentPage("addConsumed")}
        onNavigateToRecipes={() => setCurrentPage("recipes")}
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
        onNavigateToDetail={() => setCurrentPage("detail")}
        onNavigateToAddRecipe={() => {
          setConsumedMealData(null) // Clear any prefilled data
          setRecipeIngredients([]) // Clear recipe ingredients
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
      />
    )
  }

  if (currentPage === "addRecipe") {
    return (
      <AddRecipePage
        onNavigateBack={() => {
          if (consumedMealData) {
            setCurrentPage("saveAsRecipe")
          } else {
            setCurrentPage("recipes")
          }
        }}
        onNavigateToHome={() => setCurrentPage("home")}
        onNavigateToRecipes={() => setCurrentPage("recipes")}
        onNavigateToIngredients={() => {
          setIsIngredientSelectionMode(true)
          setIngredientSelectionContext("recipe")
          setCurrentPage("ingredients")
        }}
        prefilledData={consumedMealData}
        selectedIngredients={recipeIngredients}
        onUpdateIngredients={setRecipeIngredients}
      />
    )
  }

  if (currentPage === "detail") {
    return (
      <RecipeDetailPage
        onNavigateBack={() => setCurrentPage("recipes")}
        onNavigateToHome={() => setCurrentPage("home")}
        onNavigateToAdd={() => setCurrentPage("addConsumed")}
        onNavigateToRecipes={() => setCurrentPage("recipes")}
      />
    )
  }

  // Recommended recipe detail page
  if (currentPage === "recommendedDetail") {
    return (
      <RecipeDetailPage
        recipe={recommendedRecipe}
        onNavigateBack={() => setCurrentPage("home")}
        onNavigateToHome={() => setCurrentPage("home")}
        onNavigateToAdd={() => setCurrentPage("addConsumed")}
        onNavigateToRecipes={() => setCurrentPage("recipes")}
      />
    )
  }

  return (
    <HomePage
      onNavigateToAdd={() => {
        setConsumedMenuIngredients([]) // Clear consumed menu ingredients when starting fresh
        setCurrentPage("addConsumed")
      }}
      onNavigateToRecipes={() => setCurrentPage("recipes")}
      onNavigateToSettings={() => setCurrentPage("settings")}
      onNavigateToRecommendedRecipe={() => setCurrentPage("recommendedDetail")}
    />
  )
}
