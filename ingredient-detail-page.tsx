"use client"

import { ChevronLeft, Plus, Home, Book } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"

interface IngredientDetailPageProps {
  ingredient: any
  onNavigateBack: () => void
  onNavigateToHome: () => void
  onNavigateToAdd: () => void
  onNavigateToRecipes: () => void
}

export default function IngredientDetailPage({
  ingredient,
  onNavigateBack,
  onNavigateToHome,
  onNavigateToAdd,
  onNavigateToRecipes,
}: IngredientDetailPageProps) {
  if (!ingredient) {
    return (
      <div className="max-w-sm mx-auto bg-[#ffffff] min-h-screen flex items-center justify-center">
        <p className="text-[#787880]">Ingredient not found</p>
      </div>
    )
  }

  const nutritionData = [
    { label: "Calories", value: ingredient.calories, unit: "kcal" },
    { label: "Protein", value: ingredient.protein, unit: "g" },
    { label: "Carbohydrates", value: ingredient.carbs, unit: "g" },
    { label: "Total Fat", value: ingredient.fat, unit: "g" },
    { label: "Fiber", value: ingredient.fiber, unit: "g" },
  ]

  const vitaminsAndMinerals = [
    { name: "Vitamin C", amount: "15mg", dailyValue: "17%" },
    { name: "Vitamin K", amount: "102μg", dailyValue: "85%" },
    { name: "Folate", amount: "63μg", dailyValue: "16%" },
    { name: "Iron", amount: "0.7mg", dailyValue: "4%" },
    { name: "Potassium", amount: "288mg", dailyValue: "6%" },
    { name: "Calcium", amount: "47mg", dailyValue: "4%" },
  ]

  const healthBenefits = [
    "Rich in antioxidants that support immune system",
    "High fiber content promotes digestive health",
    "Contains essential vitamins and minerals",
    "Low in calories, great for weight management",
    "Natural source of folate for cell function",
  ]

  const cookingTips = [
    "Steam for 3-5 minutes to retain nutrients",
    "Add to stir-fries in the last 2 minutes",
    "Blanch before freezing for meal prep",
    "Pairs well with garlic and olive oil",
    "Can be eaten raw in salads",
  ]

  return (
    <div className="max-w-sm mx-auto bg-[#ffffff] min-h-screen">
      {/* Header */}
      <div className="px-4 pt-6 pb-4 sticky top-0 bg-white z-10">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={onNavigateBack}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Ingredient Details</h1>
          <div className="w-10"></div>
        </div>
      </div>

      {/* Content */}
      <div className="pb-20">
        {/* Ingredient Header */}
        <div className="px-4 mb-6">
          <div className="bg-[#f5f5f5] rounded-2xl p-6 text-center">
            <div className="w-24 h-24 bg-[#e3e5c1] rounded-xl overflow-hidden mx-auto mb-4">
              <Image
                src={ingredient.image || "/placeholder.svg"}
                alt={ingredient.name}
                width={96}
                height={96}
                className="w-full h-full object-cover"
              />
            </div>
            <h2 className="text-2xl font-bold text-[#000000] mb-2">{ingredient.name}</h2>
            <span className="bg-[#007aff] text-white px-3 py-1 rounded-full text-sm">{ingredient.category}</span>
          </div>
        </div>

        {/* Nutrition Facts */}
        <div className="px-4 mb-6">
          <h3 className="text-xl font-bold text-[#000000] mb-4">Nutrition Facts</h3>
          <div className="bg-[#f5f5f5] rounded-2xl p-4">
            <div className="text-center mb-4">
              <span className="text-sm text-[#787880]">Per {ingredient.unit}</span>
            </div>

            <div className="space-y-3">
              {nutritionData.map((item, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-[#000000] font-medium">{item.label}</span>
                  <span className="text-[#787880]">
                    {item.value}
                    {item.unit}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Vitamins & Minerals */}
        <div className="px-4 mb-6">
          <h3 className="text-xl font-bold text-[#000000] mb-4">Vitamins & Minerals</h3>
          <div className="bg-[#f5f5f5] rounded-2xl p-4">
            <div className="space-y-3">
              {vitaminsAndMinerals.map((item, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-[#000000] text-sm">{item.name}</span>
                  <div className="text-right">
                    <div className="text-[#787880] text-sm">{item.amount}</div>
                    <div className="text-[#007aff] text-xs">{item.dailyValue} DV</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Health Benefits */}
        <div className="px-4 mb-6">
          <h3 className="text-xl font-bold text-[#000000] mb-4">Health Benefits</h3>
          <div className="bg-[#f5f5f5] rounded-2xl p-4">
            <div className="space-y-3">
              {healthBenefits.map((benefit, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-[#007aff] rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-[#000000] text-sm">{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Cooking Tips */}
        <div className="px-4 mb-6">
          <h3 className="text-xl font-bold text-[#000000] mb-4">Cooking Tips</h3>
          <div className="bg-[#f5f5f5] rounded-2xl p-4">
            <div className="space-y-3">
              {cookingTips.map((tip, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-[#000000] text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {index + 1}
                  </div>
                  <span className="text-[#000000] text-sm">{tip}</span>
                </div>
              ))}
            </div>
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
            <Book className="w-6 h-6 text-[#999999] mb-1" />
            <span className="text-xs text-[#999999]">Recipes</span>
          </div>
        </div>
      </div>
    </div>
  )
}
