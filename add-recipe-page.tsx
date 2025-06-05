"use client"

import { ChevronLeft, Plus, Minus, Camera, Home, Book } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useState, useEffect } from "react"

interface AddRecipePageProps {
  onNavigateBack?: () => void
  onNavigateToHome: () => void
  onNavigateToRecipes: () => void
  onNavigateToIngredients: () => void
  prefilledData?: {
    mealName: string
    portion: string
    notes: string
    mealTime: string
    selectedIngredients: any[]
  } | null
  selectedIngredients: any[]
  onUpdateIngredients: (ingredients: any[]) => void
}

export default function AddRecipePage({
  onNavigateBack,
  onNavigateToHome,
  onNavigateToRecipes,
  onNavigateToIngredients,
  prefilledData,
  selectedIngredients,
  onUpdateIngredients,
}: AddRecipePageProps) {
  const [recipeName, setRecipeName] = useState("")
  const [description, setDescription] = useState("")
  const [cookingTime, setCookingTime] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("")
  const [steps, setSteps] = useState([""])

  const categories = ["Breakfast", "Lunch", "Dinner", "Snack", "Dessert", "Beverage"]

  // Pre-fill data if coming from consumed menu
  useEffect(() => {
    if (prefilledData) {
      setRecipeName(prefilledData.mealName)
      setDescription(prefilledData.notes || "")

      // Map meal time to category
      const categoryMap: { [key: string]: string } = {
        Breakfast: "Breakfast",
        Lunch: "Lunch",
        Dinner: "Dinner",
        Snack: "Snack",
      }
      setSelectedCategory(categoryMap[prefilledData.mealTime] || "")

      // Use the selected ingredients from the consumed menu
      onUpdateIngredients(prefilledData.selectedIngredients || [])

      // Create basic steps
      const basicSteps = ["Prepare all ingredients as listed above."]
      if (prefilledData.notes) {
        basicSteps.push(prefilledData.notes)
      }
      basicSteps.push("Serve and enjoy!")
      setSteps(basicSteps)
    }
  }, [prefilledData, onUpdateIngredients])

  const removeIngredient = (index: number) => {
    const newIngredients = selectedIngredients.filter((_, i) => i !== index)
    onUpdateIngredients(newIngredients)
  }

  const updateIngredientAmount = (index: number, amount: string) => {
    const newIngredients = [...selectedIngredients]
    newIngredients[index] = { ...newIngredients[index], amount }
    onUpdateIngredients(newIngredients)
  }

  const addStep = () => {
    setSteps([...steps, ""])
  }

  const removeStep = (index: number) => {
    if (steps.length > 1) {
      setSteps(steps.filter((_, i) => i !== index))
    }
  }

  const updateStep = (index: number, value: string) => {
    const newSteps = [...steps]
    newSteps[index] = value
    setSteps(newSteps)
  }

  const handleSaveRecipe = () => {
    console.log({
      recipeName,
      description,
      cookingTime,
      category: selectedCategory,
      ingredients: selectedIngredients,
      steps: steps.filter((step) => step.trim() !== ""),
      createdFrom: prefilledData ? "consumed-menu" : "manual",
    })
    if (onNavigateToRecipes) onNavigateToRecipes()
  }

  return (
    <div className="max-w-sm mx-auto bg-[#ffffff] min-h-screen">
      {/* Header */}
      <div className="px-4 pt-6 pb-4 sticky top-0 bg-white z-10 border-b border-[#f5f5f5]">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="icon" onClick={onNavigateBack}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">{prefilledData ? "Create Recipe from Meal" : "Add Recipe"}</h1>
          <div className="w-10"></div>
        </div>

        {prefilledData && (
          <div className="bg-[#e8f4fd] border border-[#007aff] rounded-lg p-3 mb-4">
            <p className="text-[#007aff] text-sm font-medium">
              ✨ Recipe details pre-filled from your consumed meal "{prefilledData.mealName}"
            </p>
          </div>
        )}
      </div>

      {/* Form Content */}
      <div className="px-4 pb-20 space-y-6">
        {/* Recipe Image Upload */}
        <div className="w-full h-48 bg-[#f5f5f5] rounded-2xl flex items-center justify-center border-2 border-dashed border-[#e5e5e5]">
          <div className="text-center">
            <Camera className="w-8 h-8 text-[#999999] mx-auto mb-2" />
            <p className="text-[#999999] text-sm">Add Recipe Photo</p>
          </div>
        </div>

        {/* Recipe Name */}
        <div>
          <label className="block text-[#000000] font-semibold mb-2">Recipe Name</label>
          <Input
            value={recipeName}
            onChange={(e) => setRecipeName(e.target.value)}
            placeholder="Enter recipe name"
            className="bg-[#f5f5f5] border-none rounded-lg"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-[#000000] font-semibold mb-2">Description</label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your recipe"
            className="bg-[#f5f5f5] border-none rounded-lg min-h-[80px]"
          />
        </div>

        {/* Category Selection */}
        <div>
          <label className="block text-[#000000] font-semibold mb-2">Category</label>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                className={`rounded-full px-4 py-2 text-sm ${
                  selectedCategory === category
                    ? "bg-[#007aff] text-white border-[#007aff]"
                    : "bg-white text-[#000000] border-[#e5e5e5] hover:bg-[#f5f5f5]"
                }`}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        {/* Cooking Time */}
        <div>
          <label className="block text-[#000000] font-semibold mb-2">Cooking Time (Minutes)</label>
          <Input
            type="number"
            value={cookingTime}
            onChange={(e) => setCookingTime(e.target.value)}
            placeholder="30"
            className="bg-[#f5f5f5] border-none rounded-lg"
          />
        </div>

        {/* Ingredients */}
        <div>
          <label className="block text-[#000000] font-semibold mb-2">Ingredients</label>
          <div className="space-y-3">
            {selectedIngredients.map((ingredient, index) => (
              <div key={index} className="bg-[#f5f5f5] rounded-lg p-3 flex items-center gap-3">
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
                    className="bg-white border-none rounded text-xs mt-1"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeIngredient(index)}
                  className="text-[#999999] hover:text-[#000000]"
                >
                  <Minus className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              onClick={onNavigateToIngredients}
              className="w-full border-[#007aff] text-[#007aff] rounded-lg hover:bg-[#007aff] hover:text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Ingredient from Database
            </Button>
          </div>
        </div>

        {/* Steps */}
        <div>
          <label className="block text-[#000000] font-semibold mb-2">Steps</label>
          <div className="space-y-3">
            {steps.map((step, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="w-6 h-6 bg-[#000000] text-white rounded-full flex items-center justify-center text-xs font-bold mt-2 flex-shrink-0">
                  {index + 1}
                </div>
                <div className="flex-1 flex items-start gap-2">
                  <Textarea
                    value={step}
                    onChange={(e) => updateStep(index, e.target.value)}
                    placeholder="Describe this step..."
                    className="bg-[#f5f5f5] border-none rounded-lg min-h-[60px] flex-1"
                  />
                  {steps.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeStep(index)}
                      className="text-[#999999] hover:text-[#000000] mt-1"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            <Button variant="outline" onClick={addStep} className="w-full border-[#e5e5e5] text-[#000000] rounded-lg">
              <Plus className="w-4 h-4 mr-2" />
              Add Step
            </Button>
          </div>
        </div>

        {/* Save Button */}
        <Button
          onClick={handleSaveRecipe}
          className="w-full bg-[#007aff] hover:bg-[#0056b3] text-white rounded-2xl py-4 text-base font-medium"
        >
          {prefilledData ? "Create Recipe" : "Save Recipe"}
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
