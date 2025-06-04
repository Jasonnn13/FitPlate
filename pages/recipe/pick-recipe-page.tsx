"use client"

import { ChevronLeft, Search, Star, Book, Home, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Image from "next/image"
import { useState } from "react"

interface PickRecipePageProps {
  onNavigateBack: () => void
  onNavigateToHome: () => void
  onNavigateToAdd: () => void
  onNavigateToRecipes: () => void
  onSelectRecipe: (recipe: any) => void
}



export default function PickRecipePage({
  onNavigateBack,
  onNavigateToHome,
  onNavigateToAdd,
  onNavigateToRecipes,
  onSelectRecipe,
}: PickRecipePageProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedFilter, setSelectedFilter] = useState("All")

  const filters = ["All", "My Recipes", "Favorites", "Recent"]

  const recipes = [
    {
      id: 1,
      name: "Fried Chicken",
      calories: "~269 Calories/100g",
      isFavorite: true,
      isMyRecipe: true,
      image: "/placeholder.svg?height=80&width=80",
    },
    {
      id: 2,
      name: "Grilled Salmon",
      calories: "~206 Calories/100g",
      isFavorite: false,
      isMyRecipe: true,
      image: "/placeholder.svg?height=80&width=80",
    },
    {
      id: 3,
      name: "Caesar Salad",
      calories: "~163 Calories/100g",
      isFavorite: false,
      isMyRecipe: false,
      image: "/placeholder.svg?height=80&width=80",
    },
    {
      id: 4,
      name: "Rendang",
      calories: "~195 Calories/100g",
      isFavorite: true,
      isMyRecipe: false,
      image: "/placeholder.svg?height=80&width=80",
    },
  ]

  const filteredRecipes = recipes.filter((recipe) => {
    const matchesSearch = recipe.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter =
      selectedFilter === "All" ||
      (selectedFilter === "My Recipes" && recipe.isMyRecipe) ||
      (selectedFilter === "Favorites" && recipe.isFavorite) ||
      selectedFilter === "Recent"
    return matchesSearch && matchesFilter
  })

  const handleSelectRecipe = (recipe: any) => {
    onSelectRecipe(recipe)
    onNavigateBack() // Go back to add consumed menu with selected recipe
  }

  return (
    <div className="max-w-sm mx-auto bg-[#ffffff] min-h-screen">
      {/* Header */}
      <div className="px-4 pt-6 pb-4 sticky top-0 bg-white z-10">
        <div className="flex items-center mb-4">
          <Button variant="ghost" size="icon" className="mr-2" onClick={onNavigateBack}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Pick From Recipe</h1>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#999999]" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search recipes..."
            className="pl-10 bg-[#f5f5f5] border-none rounded-lg"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {filters.map((filter) => (
            <Button
              key={filter}
              variant={selectedFilter === filter ? "default" : "outline"}
              className={`rounded-full px-4 py-1 text-sm whitespace-nowrap ${
                selectedFilter === filter ? "bg-[#000000] text-white" : "bg-white text-[#000000] border-[#e5e5e5]"
              }`}
              onClick={() => setSelectedFilter(filter)}
            >
              {filter}
            </Button>
          ))}
        </div>
      </div>

      {/* Recipe List */}
      <div className="px-4 pb-20">
        <div className="space-y-3">
          {filteredRecipes.map((recipe) => (
            <div
              key={recipe.id}
              onClick={() => handleSelectRecipe(recipe)}
              className="bg-[#f5f5f5] rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:bg-[#e5e5e5] transition-colors"
            >
              <div className="w-16 h-16 bg-[#e3e5c1] rounded-xl overflow-hidden flex-shrink-0">
                <Image
                  src={recipe.image || "/placeholder.svg"}
                  alt={recipe.name}
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-[#000000]">{recipe.name}</h3>
                  {recipe.isFavorite && <Star className="w-4 h-4 text-[#007aff] fill-current" />}
                  {recipe.isMyRecipe && (
                    <span className="bg-[#007aff] text-white text-xs px-2 py-1 rounded-full">Mine</span>
                  )}
                </div>
                <p className="text-[#787880] text-sm">{recipe.calories}</p>
              </div>

              <div className="text-[#007aff]">
                <span className="text-sm font-medium">Select</span>
              </div>
            </div>
          ))}
        </div>

        {filteredRecipes.length === 0 && (
          <div className="text-center py-12">
            <p className="text-[#787880] text-lg mb-2">No recipes found</p>
            <p className="text-[#999999] text-sm">Try adjusting your search or filter</p>
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
