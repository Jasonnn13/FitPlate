"use client"

import { Search, Filter, Star, Book, Home, Plus, ChevronLeft, Download, Users, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Image from "next/image"
import { useState } from "react"

interface PublicRecipesPageProps {
  onNavigateBack?: () => void
  onNavigateToHome: () => void
  onNavigateToAdd: () => void
  onNavigateToRecipes: () => void
}

export default function PublicRecipesPage({
  onNavigateBack,
  onNavigateToHome,
  onNavigateToAdd,
  onNavigateToRecipes,
}: PublicRecipesPageProps) {
  const [publicRecipes] = useState([
    {
      id: 1,
      name: "Thai Green Curry",
      calories: "~285 Calories/100g",
      author: "Chef Maria",
      rating: 4.8,
      saves: 1240,
      cookTime: "30 min",
      difficulty: "Medium",
      image: "/placeholder.svg?height=120&width=120",
      category: "Dinner",
      isPopular: true,
    },
    {
      id: 2,
      name: "Mediterranean Bowl",
      calories: "~220 Calories/serving",
      author: "HealthyEats",
      rating: 4.6,
      saves: 890,
      cookTime: "15 min",
      difficulty: "Easy",
      image: "/placeholder.svg?height=120&width=120",
      category: "Lunch",
      isPopular: false,
    },
    {
      id: 3,
      name: "Protein Pancakes",
      calories: "~180 Calories/serving",
      author: "FitnessFoodie",
      rating: 4.9,
      saves: 2100,
      cookTime: "10 min",
      difficulty: "Easy",
      image: "/placeholder.svg?height=120&width=120",
      category: "Breakfast",
      isPopular: true,
    },
    {
      id: 4,
      name: "Quinoa Buddha Bowl",
      calories: "~195 Calories/100g",
      author: "VeganVibes",
      rating: 4.7,
      saves: 1560,
      cookTime: "25 min",
      difficulty: "Easy",
      image: "/placeholder.svg?height=120&width=120",
      category: "Lunch",
      isPopular: false,
    },
    {
      id: 5,
      name: "Spicy Korean Tofu",
      calories: "~240 Calories/100g",
      author: "AsianFusion",
      rating: 4.5,
      saves: 780,
      cookTime: "20 min",
      difficulty: "Medium",
      image: "/placeholder.svg?height=120&width=120",
      category: "Dinner",
      isPopular: false,
    },
    {
      id: 6,
      name: "Overnight Oats",
      calories: "~160 Calories/serving",
      author: "MorningBoost",
      rating: 4.8,
      saves: 3200,
      cookTime: "5 min",
      difficulty: "Easy",
      image: "/placeholder.svg?height=120&width=120",
      category: "Breakfast",
      isPopular: true,
    },
  ])

  const [activeFilter, setActiveFilter] = useState("All")
  const [savedRecipes, setSavedRecipes] = useState<number[]>([])
  const filters = ["All", "Popular", "Breakfast", "Lunch", "Dinner", "Easy", "Medium"]

  const toggleSave = (id: number) => {
    setSavedRecipes((prev) => (prev.includes(id) ? prev.filter((recipeId) => recipeId !== id) : [...prev, id]))
  }

  const filteredRecipes = publicRecipes.filter((recipe) => {
    if (activeFilter === "All") return true
    if (activeFilter === "Popular") return recipe.isPopular
    if (activeFilter === "Easy" || activeFilter === "Medium") return recipe.difficulty === activeFilter
    return recipe.category === activeFilter
  })

  return (
    <div className="max-w-sm mx-auto bg-[#ffffff] min-h-screen">
      {/* Header */}
      <div className="px-4 pt-6 pb-4 sticky top-0 bg-white z-10">
        <div className="flex items-center mb-4">
          <Button variant="ghost" size="icon" className="mr-2" onClick={onNavigateBack}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Public Recipes</h1>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#999999]" />
          <Input placeholder="Search public recipes..." className="pl-10 pr-10 bg-[#f5f5f5] border-none rounded-lg" />
          <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#999999]" />
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {filters.map((filter) => (
            <Button
              key={filter}
              variant={activeFilter === filter ? "default" : "outline"}
              className={`rounded-full px-4 py-1 text-sm whitespace-nowrap ${
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
        <div className="space-y-4">
          {filteredRecipes.map((recipe) => (
            <div key={recipe.id} className="bg-[#f5f5f5] rounded-2xl p-4">
              <div className="flex gap-4">
                <div className="w-24 h-24 bg-[#e3e5c1] rounded-xl overflow-hidden flex-shrink-0">
                  <Image
                    src={recipe.image || "/placeholder.svg"}
                    alt={recipe.name}
                    width={96}
                    height={96}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex-1">
                  <div className="flex items-start justify-between mb-1">
                    <h4 className="font-bold text-[#000000] text-sm">{recipe.name}</h4>
                    {recipe.isPopular && (
                      <span className="bg-[#007aff] text-white text-xs px-2 py-1 rounded-full">Popular</span>
                    )}
                  </div>

                  <p className="text-[#787880] text-xs mb-2">by {recipe.author}</p>
                  <p className="text-[#000000] text-xs mb-2">{recipe.calories}</p>

                  <div className="flex items-center gap-3 text-xs text-[#787880] mb-3">
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-[#ffa500] fill-current" />
                      <span>{recipe.rating}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      <span>{recipe.saves}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{recipe.cookTime}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <Button className="bg-[#2c2c2c] hover:bg-[#1d1b20] text-[#ffffff] rounded-lg py-1 px-3 text-xs">
                      <Book className="w-3 h-3 mr-1" />
                      View Recipe
                    </Button>

                    <button
                      onClick={() => toggleSave(recipe.id)}
                      className="flex items-center gap-1 text-xs"
                      aria-label={savedRecipes.includes(recipe.id) ? "Remove from saved" : "Save recipe"}
                    >
                      <Download
                        className={`w-4 h-4 ${savedRecipes.includes(recipe.id) ? "text-[#007aff]" : "text-[#999999]"}`}
                      />
                      <span className={savedRecipes.includes(recipe.id) ? "text-[#007aff]" : "text-[#999999]"}>
                        {savedRecipes.includes(recipe.id) ? "Saved" : "Save"}
                      </span>
                    </button>
                  </div>
                </div>
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
          <div className="flex flex-col items-center py-2" onClick={onNavigateToRecipes}>
            <Book className="w-6 h-6 text-[#007aff] fill-current mb-1" />
            <span className="text-xs text-[#007aff] font-medium">Recipes</span>
          </div>
        </div>
      </div>
    </div>
  )
}
