"use client"

import { ChevronLeft, Plus, Clock, Camera, Home, Book, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useState } from "react"

interface AddConsumedMenuPageProps {
  onNavigateBack?: () => void
  onNavigateToHome: () => void
  onNavigateToRecipes: () => void
  onNavigateToPickRecipe: () => void
  onNavigateToSettings: () => void
  onNavigateToSaveAsRecipe: (mealData: any) => void
  onNavigateToIngredients: () => void
  selectedIngredients: any[]
  onUpdateIngredients: (ingredients: any[]) => void
}

export default function AddConsumedMenuPage({
  onNavigateBack,
  onNavigateToHome,
  onNavigateToRecipes,
  onNavigateToPickRecipe,
  onNavigateToSettings,
  onNavigateToSaveAsRecipe,
  onNavigateToIngredients,
  selectedIngredients,
  onUpdateIngredients,
}: AddConsumedMenuPageProps) {
  const [mealName, setMealName] = useState("")
  const [portion, setPortion] = useState("")
  const [notes, setNotes] = useState("")
  const [selectedMealTime, setSelectedMealTime] = useState("")

  const mealTimes = ["Breakfast", "Lunch", "Dinner", "Snack"]

  const removeIngredient = (index: number) => {
    const newIngredients = selectedIngredients.filter((_, i) => i !== index)
    onUpdateIngredients(newIngredients)
  }

  const updateIngredientAmount = (index: number, amount: string) => {
    const newIngredients = [...selectedIngredients]
    newIngredients[index] = { ...newIngredients[index], amount }
    onUpdateIngredients(newIngredients)
  }

  const handleAddConsumedMenu = () => {
    const mealData = {
      mealName,
      portion,
      notes,
      mealTime: selectedMealTime,
      selectedIngredients,
      timestamp: new Date(),
    }

    console.log("Meal data:", mealData)
    onNavigateToSaveAsRecipe(mealData)
  }

  return (
    <div className="max-w-sm mx-auto bg-[#ffffff] min-h-screen">
      {/* Header */}
      <div className="px-4 pt-6 pb-4 sticky top-0 bg-white z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Button variant="ghost" size="icon" className="mr-2" onClick={onNavigateBack}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">Add Consumed Menu</h1>
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
        {/* Pick From Recipe Button */}
        <Button
          onClick={onNavigateToPickRecipe}
          className="w-full bg-[#007aff] hover:bg-[#0056b3] text-white rounded-2xl py-4 text-base font-medium"
        >
          <Book className="w-5 h-5 mr-2" />
          Pick From a Recipe
        </Button>
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
