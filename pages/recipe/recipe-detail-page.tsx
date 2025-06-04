"use client"

import { ChevronLeft, Heart, Share, Clock, Home, Plus, Book } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { useState } from "react"

interface RecipeDetailPageProps {
  onNavigateBack?: () => void
  onNavigateToHome: () => void
  onNavigateToAdd: () => void
  onNavigateToRecipes: () => void
  recipe?: any
}

export default function RecipeDetailPage({
  onNavigateBack,
  onNavigateToHome,
  onNavigateToAdd,
  onNavigateToRecipes,
  recipe,
}: RecipeDetailPageProps) {
  const [isLiked, setIsLiked] = useState(false)

  // Default recipe data if none provided
  const defaultRecipe = {
    name: "Chorizo Gnocchi",
    author: "User01",
    likes: 10,
    cookTime: "30 Mins",
    servings: 4,
    image: "/placeholder.svg?height=200&width=400",
    nutrition: {
      calories: 485,
      totalFat: 18.5,
      protein: 22.3,
      carbohydrates: 58.2,
      cholesterol: 45,
      sodium: 890,
      iron: 3.2,
      potassium: 680,
      vitamins: {
        vitaminA: 15,
        vitaminC: 25,
        vitaminD: 8,
        vitaminB6: 12,
        vitaminB12: 18,
        folate: 20,
      },
    },
    ingredients: [
      "1 tbsp olive oil",
      "1 medium onion, chopped",
      "2 cloves garlic, minced",
      "150g chorizo, diced",
      "400g canned chopped tomatoes",
      "1 tsp sugar",
      "500g fresh gnocchi",
      "125g mozzarella, torn",
      "Fresh basil leaves",
      "Salt and pepper to taste",
    ],
    steps: [
      "Preheat oven to 200°C (180°C fan) / 400°F / Gas 6.",
      "Cook the base: Heat olive oil in an oven-safe skillet over medium heat. Add chopped onion and cook until softened (about 5 mins).",
      "Add garlic and chorizo. Cook for another 3-4 minutes until the chorizo starts to release its oil.",
      "Add tomatoes and sugar: Stir in the chopped tomatoes and sugar. Season with salt and pepper. Let it simmer for 10 minutes until slightly thickened.",
      "Cook gnocchi: While the sauce simmers, boil the gnocchi in salted water according to the packet instructions (usually until they float-2-3 mins). Drain.",
      "Combine: Stir the gnocchi into the sauce, then scatter torn mozzarella over the top.",
      "Bake: Transfer to the oven and bake for 10-15 minutes, or until the mozzarella is melted and golden.",
      "Serve: Top with fresh basil leaves and serve hot.",
    ],
  }

  const recipeData = recipe || defaultRecipe

  return (
    <div className="max-w-sm mx-auto bg-[#ffffff] min-h-screen">
      {/* Header */}
      <div className="px-4 pt-6 pb-4 sticky top-0 bg-white z-10">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={onNavigateBack}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Recipe</h1>
          <Button variant="ghost" size="icon">
            <Share className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Recipe Content */}
      <div className="pb-20">
        {/* Recipe Image */}
        <div className="px-4 mb-4">
          <div className="w-full h-48 bg-[#e3e5c1] rounded-2xl overflow-hidden">
            <Image
              src={recipeData.image || "/placeholder.svg"}
              alt={recipeData.name}
              width={400}
              height={200}
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Recipe Info */}
        <div className="px-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold text-[#000000]">{recipeData.name}</h2>
            <button onClick={() => setIsLiked(!isLiked)} className="flex items-center gap-1">
              <Heart className={`w-5 h-5 ${isLiked ? "text-red-500 fill-current" : "text-[#999999]"}`} />
              <span className="text-[#999999] text-sm">{recipeData.likes + (isLiked ? 1 : 0)}</span>
            </button>
          </div>

          <div className="flex items-center gap-4 text-[#787880] text-sm mb-4">
            <span>by {recipeData.author}</span>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{recipeData.cookTime}</span>
            </div>
            <span>{recipeData.servings} servings</span>
          </div>

          {/* Description if available */}
          {recipeData.description && <p className="text-[#787880] text-sm mb-4">{recipeData.description}</p>}
        </div>

        {/* Nutrition Information */}
        <div className="px-4 mb-6">
          <h3 className="text-xl font-bold text-[#000000] mb-4">Nutrition Facts</h3>
          <div className="bg-[#f5f5f5] rounded-2xl p-4">
            {/* Calories - Highlighted */}
            <div className="bg-[#007aff] text-white rounded-xl p-4 mb-4">
              <div className="text-center">
                <div className="text-3xl font-bold">{recipeData.nutrition.calories}</div>
                <div className="text-sm opacity-90">Calories per serving</div>
              </div>
            </div>

            {/* Macronutrients */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center">
                <div className="text-lg font-bold text-[#000000]">{recipeData.nutrition.totalFat}g</div>
                <div className="text-xs text-[#787880]">Total Fat</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-[#000000]">{recipeData.nutrition.protein}g</div>
                <div className="text-xs text-[#787880]">Protein</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-[#000000]">{recipeData.nutrition.carbohydrates}g</div>
                <div className="text-xs text-[#787880]">Carbs</div>
              </div>
            </div>

            {/* Other Nutrients */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[#000000] text-sm">Cholesterol</span>
                <span className="text-[#787880] text-sm">{recipeData.nutrition.cholesterol}mg</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#000000] text-sm">Sodium</span>
                <span className="text-[#787880] text-sm">{recipeData.nutrition.sodium}mg</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#000000] text-sm">Iron</span>
                <span className="text-[#787880] text-sm">{recipeData.nutrition.iron}mg</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#000000] text-sm">Potassium</span>
                <span className="text-[#787880] text-sm">{recipeData.nutrition.potassium}mg</span>
              </div>
            </div>

            {/* Vitamins */}
            <div className="mt-4 pt-4 border-t border-[#e5e5e5]">
              <h4 className="text-sm font-semibold text-[#000000] mb-3">Vitamins (% Daily Value)</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-[#000000] text-xs">Vitamin A</span>
                  <span className="text-[#787880] text-xs">{recipeData.nutrition.vitamins.vitaminA}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#000000] text-xs">Vitamin C</span>
                  <span className="text-[#787880] text-xs">{recipeData.nutrition.vitamins.vitaminC}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#000000] text-xs">Vitamin D</span>
                  <span className="text-[#787880] text-xs">{recipeData.nutrition.vitamins.vitaminD}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#000000] text-xs">Vitamin B6</span>
                  <span className="text-[#787880] text-xs">{recipeData.nutrition.vitamins.vitaminB6}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#000000] text-xs">Vitamin B12</span>
                  <span className="text-[#787880] text-xs">{recipeData.nutrition.vitamins.vitaminB12}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#000000] text-xs">Folate</span>
                  <span className="text-[#787880] text-xs">{recipeData.nutrition.vitamins.folate}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Ingredients */}
        <div className="px-4 mb-6">
          <h3 className="text-xl font-bold text-[#000000] mb-4">Ingredients</h3>
          <div className="bg-[#f5f5f5] rounded-2xl p-4">
            <div className="space-y-3">
              {recipeData.ingredients.map((ingredient: string, index: number) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-[#000000] rounded-full flex-shrink-0"></div>
                  <span className="text-[#000000] text-sm">{ingredient}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Steps */}
        <div className="px-4">
          <h3 className="text-xl font-bold text-[#000000] mb-4">Steps</h3>
          <div className="space-y-4">
            {recipeData.steps.map((step: string, index: number) => (
              <div key={index} className="flex gap-4">
                <div className="w-8 h-8 bg-[#000000] text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-1">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="text-[#000000] text-sm leading-relaxed">{step}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-sm bg-[#ffffff] border-t border-[#f5f5f5]">
        <div className="flex justify-around py-2">
          <div className="flex flex-col items-center py-2" onClick={onNavigateToHome}>
            <Home className="w-6 h-6 text-[#999999] mb-1" />
            <span className="text-xs text-[#999999]">Home</span>
          </div>
          <div className="flex flex-col items-center py-2" onClick={onNavigateToAdd}>
            <Plus className="w-6 h-6 text-[#999999] mb-1" />
            <span className="text-xs text-[#999999]">Add</span>
          </div>
          <div className="flex flex-col items-center py-2" onClick={onNavigateToRecipes}>
            <Book className="w-6 h-6 text-[#007aff] fill-current mb-1" />
            <span className="text-xs text-[#007aff] font-medium">Recipes</span>
          </div>
        </div>
      </div>
    </div>
  )
}
