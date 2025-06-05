"use client"

import { ChevronLeft, Search, Star, Book, Home, Plus, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Image from "next/image"
import { useState, useEffect } from "react"
import { useRecipes } from "@/hooks/use-recipes"
import type { Recipe } from "@/lib/recipes"

interface PickRecipePageProps {
  onNavigateBack: () => void
  onNavigateToHome: () => void
  onNavigateToAdd: () => void
  onNavigateToRecipes: () => void
  onSelectRecipe: (recipe: Recipe) => void
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
  const { recipes, loading, error, fetchUserRecipes, fetchRecipeById } = useRecipes()

  const filters = ["All", "My Recipes", "Favorites", "Recent"]

  useEffect(() => {
    fetchUserRecipes()
  }, [])

  const filteredRecipes = recipes.filter((recipe) => {
    const matchesSearch = recipe.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = selectedFilter === "All" || (selectedFilter === "Favorites" && recipe.is_favorite)
    return matchesSearch && matchesFilter
  })

  const handleSelectRecipe = async (recipe: Recipe) => {
    try {
      // Fetch complete recipe details including ingredients
      const completeRecipe = await fetchRecipeById(recipe.id)
      if (completeRecipe) {
        onSelectRecipe(completeRecipe)
        onNavigateBack() // Go back to add consumed menu with selected recipe
      }
    } catch (error) {
      console.error("Error selecting recipe:", error)
    }
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
        {loading ? (
          <div className="text-center py-12">
            <p className="text-[#787880] text-lg">Loading recipes...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-500 text-lg mb-2">Error loading recipes</p>
            <p className="text-[#999999] text-sm">{error}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRecipes.map((recipe) => (
              <div
                key={recipe.id}
                onClick={() => handleSelectRecipe(recipe)}
                className="bg-[#f5f5f5] rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:bg-[#e5e5e5] transition-colors"
              >
                <div className="w-16 h-16 bg-[#e3e5c1] rounded-xl overflow-hidden flex-shrink-0">
                  <Image
                    src={recipe.image_url || "/placeholder.svg"}
                    alt={recipe.name}
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-[#000000]">{recipe.name}</h3>
                    {recipe.is_favorite && <Star className="w-4 h-4 text-[#007aff] fill-current" />}
                  </div>
                  <p className="text-[#787880] text-sm">{recipe.calories_per_serving} cal/serving</p>
                  <div className="flex items-center gap-3 text-xs text-[#787880] mt-1">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{recipe.cooking_time} min</span>
                    </div>
                    <span>{recipe.category}</span>
                  </div>
                </div>

                <div className="text-[#007aff]">
                  <span className="text-sm font-medium">Select</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && !error && filteredRecipes.length === 0 && (
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
