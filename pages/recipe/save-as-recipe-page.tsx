"use client"

import { ChevronLeft, Plus, Save, Home, Book, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"

interface SaveAsRecipePageProps {
  mealData: {
    mealName: string
    portion: string
    notes: string
    mealTime: string
    selectedIngredients: any[]
  }
  onNavigateBack: () => void
  onNavigateToHome: () => void
  onNavigateToRecipes: () => void
  onNavigateToSettings: () => void
  onSaveAsRecipe: () => void
  onJustSaveMeal: () => void
}

export default function SaveAsRecipePage({
  mealData,
  onNavigateBack,
  onNavigateToHome,
  onNavigateToRecipes,
  onNavigateToSettings,
  onSaveAsRecipe,
  onJustSaveMeal,
}: SaveAsRecipePageProps) {
  return (
    <div className="max-w-sm mx-auto bg-[#ffffff] min-h-screen">
      {/* Header */}
      <div className="px-4 pt-6 pb-4 sticky top-0 bg-white z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Button variant="ghost" size="icon" className="mr-2" onClick={onNavigateBack}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">Save Menu</h1>
          </div>
          <button
            onClick={onNavigateToSettings}
            className="w-10 h-10 bg-[#000000] rounded-full flex items-center justify-center hover:bg-[#2c2c2c] transition-colors"
          >
            <User className="w-5 h-5 text-[#ffffff]" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-20 space-y-6">
        {/* Success Message */}
        <div className="text-center py-6">
          <div className="w-16 h-16 bg-[#4CAF50] rounded-full flex items-center justify-center mx-auto mb-4">
            <Save className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-[#000000] mb-2">Menu Added Successfully!</h2>
          <p className="text-[#787880] text-base">Your consumed menu has been logged to your daily intake.</p>
        </div>

        {/* Meal Summary */}
        <div className="bg-[#f5f5f5] rounded-2xl p-6">
          <h3 className="text-lg font-bold text-[#000000] mb-4">Meal Summary</h3>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[#787880] text-sm">Meal Name:</span>
              <span className="text-[#000000] font-medium">{mealData.mealName}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-[#787880] text-sm">Meal Time:</span>
              <span className="text-[#000000] font-medium">{mealData.mealTime}</span>
            </div>

            {mealData.portion && (
              <div className="flex justify-between items-center">
                <span className="text-[#787880] text-sm">Portion:</span>
                <span className="text-[#000000] font-medium">{mealData.portion}</span>
              </div>
            )}

            {mealData.selectedIngredients.length > 0 && (
              <div>
                <span className="text-[#787880] text-sm block mb-3">Ingredients:</span>
                <div className="space-y-2">
                  {mealData.selectedIngredients.map((ingredient, index) => (
                    <div key={index} className="flex items-center gap-3 bg-white rounded-lg p-2">
                      <div className="w-8 h-8 bg-[#e3e5c1] rounded-lg overflow-hidden flex-shrink-0">
                        <Image
                          src={ingredient.image || "/placeholder.svg"}
                          alt={ingredient.name}
                          width={32}
                          height={32}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <span className="text-[#000000] text-sm font-medium">{ingredient.name}</span>
                        {ingredient.amount && (
                          <span className="text-[#787880] text-xs ml-2">({ingredient.amount})</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {mealData.notes && (
              <div>
                <span className="text-[#787880] text-sm block mb-2">Notes:</span>
                <p className="text-[#000000] text-sm bg-white rounded-lg p-3">{mealData.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Save as Recipe Option */}
        <div className="bg-[#e8f4fd] border border-[#007aff] rounded-2xl p-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 bg-[#007aff] rounded-full flex items-center justify-center flex-shrink-0">
              <Book className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-[#000000] mb-2">Save as Recipe?</h3>
              <p className="text-[#787880] text-sm">
                Turn this meal into a recipe so you can easily make it again or share it with others. We'll pre-fill all
                the details for you!
              </p>
            </div>
          </div>

          <Button
            onClick={onSaveAsRecipe}
            className="w-full bg-[#007aff] hover:bg-[#0056b3] text-white rounded-2xl py-3 text-base font-medium"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Recipe from This Meal
          </Button>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            onClick={onJustSaveMeal}
            className="w-full bg-[#2c2c2c] hover:bg-[#1d1b20] text-white rounded-2xl py-4 text-base font-medium"
          >
            Done - Go to Home
          </Button>

          <Button
            onClick={onNavigateToRecipes}
            variant="outline"
            className="w-full border-[#e5e5e5] text-[#000000] rounded-2xl py-4 text-base font-medium hover:bg-[#f5f5f5]"
          >
            View My Recipes
          </Button>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-sm bg-[#ffffff] border-t border-[#f5f5f5]">
        <div className="flex justify-around py-2">
          <div className="flex flex-col items-center py-2" onClick={onNavigateToHome}>
            <Home className="w-6 h-6 text-[#999999] mb-1" />
            <span className="text-xs text-[#999999]">Home</span>
          </div>
          <div className="flex flex-col items-center py-2">
            <Plus className="w-6 h-6 text-[#007aff] fill-current mb-1" />
            <span className="text-xs text-[#007aff] font-medium">Add</span>
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
