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

        {/* Divider */}
        <div className="flex items-center gap-4">
          <div className="flex-1 border-t border-dashed border-[#999999]"></div>
          <span className="text-[#999999] text-sm">or</span>
          <div className="flex-1 border-t border-dashed border-[#999999]"></div>
        </div>

        {/* Manual Entry Form */}
        <div className="bg-[#f5f5f5] rounded-2xl p-6 space-y-6">
          {/* Meal Photo Upload */}
          <div className="w-full h-32 bg-[#e5e5e5] rounded-xl flex items-center justify-center border-2 border-dashed border-[#cccccc]">
            <div className="text-center">
              <Camera className="w-6 h-6 text-[#999999] mx-auto mb-2" />
              <p className="text-[#999999] text-sm">Add Photo (Optional)</p>
            </div>
          </div>

          {/* Meal Name */}
          <div>
            <label className="block text-[#000000] font-semibold mb-2">Meal Name</label>
            <Input
              value={mealName}
              onChange={(e) => setMealName(e.target.value)}
              placeholder="e.g., Grilled Chicken Salad"
              className="bg-white border-none rounded-lg"
            />
          </div>

          {/* Meal Time Selection */}
          <div>
            <label className="block text-[#000000] font-semibold mb-2">Meal Time</label>
            <div className="grid grid-cols-2 gap-2">
              {mealTimes.map((time) => (
                <Button
                  key={time}
                  variant={selectedMealTime === time ? "default" : "outline"}
                  className={`rounded-lg py-2 text-sm ${
                    selectedMealTime === time
                      ? "bg-[#007aff] text-white border-[#007aff]"
                      : "bg-white text-[#000000] border-[#e5e5e5] hover:bg-[#f5f5f5]"
                  }`}
                  onClick={() => setSelectedMealTime(time)}
                >
                  <Clock className="w-4 h-4 mr-1" />
                  {time}
                </Button>
              ))}
            </div>
          </div>

          {/* Portion Size */}
          <div>
            <label className="block text-[#000000] font-semibold mb-2">Portion Size</label>
            <Input
              value={portion}
              onChange={(e) => setPortion(e.target.value)}
              placeholder="e.g., 1 plate, 200g, 1 cup"
              className="bg-white border-none rounded-lg"
            />
          </div>

          {/* Ingredients from Database */}
          <div>
            <label className="block text-[#000000] font-semibold mb-2">Ingredients</label>

            {/* Selected Ingredients List */}
            {selectedIngredients.length > 0 && (
              <div className="space-y-3 mb-4">
                {selectedIngredients.map((ingredient, index) => (
                  <div key={index} className="bg-white rounded-lg p-3 flex items-center gap-3">
                    <div className="w-12 h-12 bg-[#e3e5c1] rounded-lg overflow-hidden flex-shrink-0">
                      <img
                        src={ingredient.image || "/placeholder.svg"}
                        alt={ingredient.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-[#000000] text-sm">{ingredient.name}</h4>
                      <p className="text-[#787880] text-xs mb-1">{ingredient.category}</p>
                      <Input
                        value={ingredient.amount || ""}
                        onChange={(e) => updateIngredientAmount(index, e.target.value)}
                        placeholder="Amount (e.g., 1 cup, 200g)"
                        className="bg-[#f5f5f5] border-none rounded text-xs"
                      />
                    </div>
                    <button
                      onClick={() => removeIngredient(index)}
                      className="text-[#999999] hover:text-[#000000] text-sm px-2"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Ingredient Button */}
            <Button
              onClick={onNavigateToIngredients}
              variant="outline"
              className="w-full border-[#007aff] text-[#007aff] rounded-lg hover:bg-[#007aff] hover:text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Ingredient from Database
            </Button>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[#000000] font-semibold mb-2">Notes (Optional)</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="How did it taste? Any modifications?"
              className="bg-white border-none rounded-lg min-h-[80px]"
            />
          </div>
        </div>

        {/* Add Button */}
        <Button
          onClick={handleAddConsumedMenu}
          disabled={!mealName || !selectedMealTime}
          className="w-full bg-[#2c2c2c] hover:bg-[#1d1b20] text-white rounded-2xl py-4 text-base font-medium disabled:opacity-50"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Consumed Menu
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
