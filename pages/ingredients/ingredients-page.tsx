"use client"

import { Search, ChevronLeft, Plus, Home, Book, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Image from "next/image"
import { useState } from "react"

interface IngredientsPageProps {
  onNavigateBack: () => void
  onNavigateToHome: () => void
  onNavigateToAdd: () => void
  onNavigateToRecipes: () => void
  onNavigateToIngredientDetail: (ingredient: any) => void
  onSelectIngredient?: (ingredient: any) => void
  isSelectionMode?: boolean
  ingredientSelectionContext?: "recipe" | "consumed"
}

export default function IngredientsPage({
  onNavigateBack,
  onNavigateToHome,
  onNavigateToAdd,
  onNavigateToRecipes,
  onNavigateToIngredientDetail,
  onSelectIngredient,
  isSelectionMode = false,
  ingredientSelectionContext = "recipe",
}: IngredientsPageProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")

  const categories = ["All", "Vegetables", "Fruits", "Grains", "Proteins", "Dairy", "Oils & Fats", "Herbs & Spices"]

  const ingredients = [
    {
      id: 1,
      name: "Fusilli",
      category: "Grains",
      image: "/placeholder.svg?height=80&width=80",
      calories: 131,
      protein: 5.0,
      carbs: 25.0,
      fat: 1.1,
      fiber: 1.8,
      unit: "100g",
    },
    {
      id: 2,
      name: "Tomato",
      category: "Vegetables",
      image: "/placeholder.svg?height=80&width=80",
      calories: 18,
      protein: 0.9,
      carbs: 3.9,
      fat: 0.2,
      fiber: 1.2,
      unit: "100g",
    },
    {
      id: 3,
      name: "Broccoli",
      category: "Vegetables",
      image: "/placeholder.svg?height=80&width=80",
      calories: 34,
      protein: 2.8,
      carbs: 7.0,
      fat: 0.4,
      fiber: 2.6,
      unit: "100g",
    },
    {
      id: 4,
      name: "Olive Oil",
      category: "Oils & Fats",
      image: "/placeholder.svg?height=80&width=80",
      calories: 884,
      protein: 0.0,
      carbs: 0.0,
      fat: 100.0,
      fiber: 0.0,
      unit: "100g",
    },
    {
      id: 5,
      name: "Chicken Breast",
      category: "Proteins",
      image: "/placeholder.svg?height=80&width=80",
      calories: 165,
      protein: 31.0,
      carbs: 0.0,
      fat: 3.6,
      fiber: 0.0,
      unit: "100g",
    },
    {
      id: 6,
      name: "Brown Rice",
      category: "Grains",
      image: "/placeholder.svg?height=80&width=80",
      calories: 111,
      protein: 2.6,
      carbs: 23.0,
      fat: 0.9,
      fiber: 1.8,
      unit: "100g",
    },
    {
      id: 7,
      name: "Avocado",
      category: "Fruits",
      image: "/placeholder.svg?height=80&width=80",
      calories: 160,
      protein: 2.0,
      carbs: 8.5,
      fat: 14.7,
      fiber: 6.7,
      unit: "100g",
    },
    {
      id: 8,
      name: "Spinach",
      category: "Vegetables",
      image: "/placeholder.svg?height=80&width=80",
      calories: 23,
      protein: 2.9,
      carbs: 3.6,
      fat: 0.4,
      fiber: 2.2,
      unit: "100g",
    },
  ]

  const filteredIngredients = ingredients.filter((ingredient) => {
    const matchesSearch = ingredient.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === "All" || ingredient.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const handleIngredientClick = (ingredient: any) => {
    if (isSelectionMode && onSelectIngredient) {
      console.log("Selecting ingredient:", ingredient.name)
      onSelectIngredient(ingredient)
    } else {
      onNavigateToIngredientDetail(ingredient)
    }
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
            <h1 className="text-xl font-bold">{isSelectionMode ? "Select Ingredient" : "Ingredient Database"}</h1>
          </div>
          <button className="w-10 h-10 bg-[#000000] rounded-full flex items-center justify-center hover:bg-[#2c2c2c] transition-colors">
            <User className="w-5 h-5 text-[#ffffff]" />
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#999999]" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search ingredients..."
            className="pl-10 bg-[#f5f5f5] border-none rounded-lg"
          />
        </div>

        {/* Category Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              className={`rounded-full px-4 py-1 text-sm whitespace-nowrap ${
                selectedCategory === category ? "bg-[#000000] text-white" : "bg-white text-[#000000] border-[#e5e5e5]"
              }`}
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </Button>
          ))}
        </div>
      </div>

      {/* Ingredients List */}
      <div className="px-4 pb-20">
        {isSelectionMode && (
          <div className="bg-[#e8f4fd] border border-[#007aff] rounded-lg p-3 mb-4">
            <p className="text-[#007aff] text-sm font-medium">
              Tap on an ingredient to add it to your {ingredientSelectionContext === "consumed" ? "meal" : "recipe"}
            </p>
          </div>
        )}

        <div className="space-y-3">
          {filteredIngredients.map((ingredient) => (
            <div
              key={ingredient.id}
              onClick={() => handleIngredientClick(ingredient)}
              className="bg-[#f5f5f5] rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:bg-[#e5e5e5] transition-colors"
            >
              <div className="w-16 h-16 bg-[#e3e5c1] rounded-xl overflow-hidden flex-shrink-0">
                <Image
                  src={ingredient.image || "/placeholder.svg"}
                  alt={ingredient.name}
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex-1">
                <h3 className="font-bold text-[#000000] mb-1">{ingredient.name}</h3>
                <p className="text-[#787880] text-sm mb-2">{ingredient.category}</p>
                <div className="flex items-center gap-4 text-xs text-[#787880]">
                  <span>{ingredient.calories} cal</span>
                  <span>{ingredient.protein}g protein</span>
                  <span>per {ingredient.unit}</span>
                </div>
              </div>

              {isSelectionMode && (
                <div className="w-6 h-6 border-2 border-[#007aff] rounded-full flex items-center justify-center">
                  <Plus className="w-4 h-4 text-[#007aff]" />
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredIngredients.length === 0 && (
          <div className="text-center py-12">
            <p className="text-[#787880] text-lg mb-2">No ingredients found</p>
            <p className="text-[#999999] text-sm">Try adjusting your search or category filter</p>
          </div>
        )}
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
