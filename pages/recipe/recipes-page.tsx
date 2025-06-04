"use client"

import { Search, Filter, Star, Book, Home, Plus, ChevronLeft, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Image from "next/image"
import { useState } from "react"

interface RecipesPageProps {
  onNavigateToPublic?: () => void
  onNavigateToHome: () => void
  onNavigateToAdd: () => void
  onNavigateToDetail?: () => void
  onNavigateToAddRecipe?: () => void
  onNavigateToSettings: () => void
}

export default function RecipesPage({
  onNavigateToPublic,
  onNavigateToHome,
  onNavigateToAdd,
  onNavigateToDetail,
  onNavigateToAddRecipe,
  onNavigateToSettings,
}: RecipesPageProps) {
  const [recipes, setRecipes] = useState([
    {
      id: 1,
      name: "Fried Chicken",
      calories: "~269 Calories/100g",
      isFavorite: true,
      category: "Dinner",
      image: "/placeholder.svg?height=120&width=120",
    },
    {
      id: 2,
      name: "Grilled Salmon",
      calories: "~206 Calories/100g",
      isFavorite: false,
      category: "Lunch",
      image: "/placeholder.svg?height=120&width=120",
    },
    {
      id: 3,
      name: "Caesar Salad",
      calories: "~163 Calories/100g",
      isFavorite: false,
      category: "Lunch",
      image: "/placeholder.svg?height=120&width=120",
    },
    {
      id: 4,
      name: "Avocado Toast",
      calories: "~190 Calories/slice",
      isFavorite: true,
      category: "Breakfast",
      image: "/placeholder.svg?height=120&width=120",
    },
    {
      id: 5,
      name: "Beef Stir Fry",
      calories: "~250 Calories/100g",
      isFavorite: false,
      category: "Dinner",
      image: "/placeholder.svg?height=120&width=120",
    },
    {
      id: 6,
      name: "Vegetable Soup",
      calories: "~120 Calories/100g",
      isFavorite: false,
      category: "Lunch",
      image: "/placeholder.svg?height=120&width=120",
    },
  ])

  const [activeFilter, setActiveFilter] = useState("All")
  const filters = ["All", "Favorites", "Breakfast", "Lunch", "Dinner"]

  const toggleFavorite = (id: number) => {
    setRecipes(recipes.map((recipe) => (recipe.id === id ? { ...recipe, isFavorite: !recipe.isFavorite } : recipe)))
  }

  const filteredRecipes =
    activeFilter === "All"
      ? recipes
      : activeFilter === "Favorites"
        ? recipes.filter((recipe) => recipe.isFavorite)
        : recipes.filter((recipe) => recipe.category === activeFilter)

  return (
    <div className="max-w-sm mx-auto bg-[#ffffff] min-h-screen">
      {/* Header */}
      <div className="px-4 pt-6 pb-4 sticky top-0 bg-white z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Button variant="ghost" size="icon" className="mr-2">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">My Recipes</h1>
          </div>
          <button
            onClick={onNavigateToSettings}
            className="w-10 h-10 bg-[#000000] rounded-full flex items-center justify-center hover:bg-[#2c2c2c] transition-colors"
          >
            <User className="w-5 h-5 text-[#ffffff]" />
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#999999]" />
          <Input placeholder="Search my recipes..." className="pl-10 pr-10 bg-[#f5f5f5] border-none rounded-lg" />
          <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#999999]" />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mb-4">
          <Button
            onClick={onNavigateToPublic}
            className="flex-1 bg-[#007aff] hover:bg-[#0056b3] text-white rounded-lg py-3"
          >
            <Star className="w-4 h-4 mr-2" />
            Browse Recipes
          </Button>
          <Button
            onClick={onNavigateToAddRecipe}
            className="flex-1 bg-[#2c2c2c] hover:bg-[#1d1b20] text-white rounded-lg py-3"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add New Recipe
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {filters.map((filter) => (
            <Button
              key={filter}
              variant={activeFilter === filter ? "default" : "outline"}
              className={`rounded-full px-4 py-1 text-sm ${
                activeFilter === filter ? "bg-[#000000] text-white" : "bg-white text-[#000000] border-[#e5e5e5]"
              }`}
              onClick={() => setActiveFilter(filter)}
            >
              {filter}
            </Button>
          ))}
        </div>
      </div>

      {/* Recipe Grid */}
      <div className="px-4 pb-20">
        <div className="grid grid-cols-2 gap-4">
          {filteredRecipes.map((recipe) => (
            <div key={recipe.id} className="bg-[#f5f5f5] rounded-2xl p-4 flex flex-col">
              <div className="w-full h-32 bg-[#e3e5c1] rounded-xl mb-3 overflow-hidden">
                <Image
                  src={recipe.image || "/placeholder.svg"}
                  alt={recipe.name}
                  width={120}
                  height={120}
                  className="w-full h-full object-cover"
                />
              </div>
              <h4 className="font-bold text-[#000000] mb-1">{recipe.name}</h4>
              <p className="text-[#787880] text-sm mb-3">{recipe.calories}</p>

              <div className="mt-auto flex justify-between items-center">
                <Button
                  className="bg-[#2c2c2c] hover:bg-[#1d1b20] text-[#ffffff] rounded-lg py-1 px-3 text-xs"
                  onClick={onNavigateToDetail}
                >
                  <Book className="w-3 h-3 mr-1" />
                  View
                </Button>

                <button
                  onClick={() => toggleFavorite(recipe.id)}
                  className="flex justify-center"
                  aria-label={recipe.isFavorite ? "Remove from favorites" : "Add to favorites"}
                >
                  <Star className={`w-5 h-5 ${recipe.isFavorite ? "text-[#007aff] fill-current" : "text-[#999999]"}`} />
                </button>
              </div>
            </div>
          ))}
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
          <div className="flex flex-col items-center py-2">
            <Book className="w-6 h-6 text-[#007aff] fill-current mb-1" />
            <span className="text-xs text-[#007aff] font-medium">Recipes</span>
          </div>
        </div>
      </div>
    </div>
  )
}
