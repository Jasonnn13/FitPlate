"use client"

import { User, Plus, Star, Utensils, Book } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { useState } from "react"

export default function Component() {
  const [recipes, setRecipes] = useState([
    { id: 1, name: "Fried Chicken", calories: "~269 Calories/100g", isFavorite: true },
    { id: 2, name: "Fried Chicken", calories: "~269 Calories/100g", isFavorite: false },
    { id: 3, name: "Fried Chicken", calories: "~269 Calories/100g", isFavorite: false },
  ])

  const toggleFavorite = (id: number) => {
    setRecipes(recipes.map((recipe) => (recipe.id === id ? { ...recipe, isFavorite: !recipe.isFavorite } : recipe)))
  }

  return (
    <div className="max-w-sm mx-auto bg-[#ffffff] min-h-screen">
      {/* Main Content */}
      <div className="px-4 pt-6 space-y-6">
        {/* Header with Profile */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-[#000000]">FitPlate</h2>
            <p className="text-lg font-semibold text-[#000000] mt-1">Today's Plate</p>
          </div>
          <div className="w-12 h-12 bg-[#000000] rounded-full flex items-center justify-center">
            <User className="w-6 h-6 text-[#ffffff]" />
          </div>
        </div>

        {/* Calories Card */}
        <div className="bg-[#f5f5f5] rounded-2xl p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-[#000000] mb-4">Calories</h3>

              {/* Circular Progress */}
              <div className="relative w-24 h-24 mb-4">
                <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" stroke="#e3e5c1" strokeWidth="8" fill="none" />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="#5c641e"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${(316 / 2240) * 251.2} 251.2`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-bold text-[#000000]">1924</span>
                  <span className="text-xs text-[#787880]">Remaining</span>
                </div>
              </div>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-4 h-4 bg-[#000000] rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-[#ffffff] rounded-full"></div>
                  </div>
                  <span className="font-medium text-[#000000]">Calories (kcal)</span>
                </div>
                <p className="text-[#000000] font-semibold">316/2240</p>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-4 h-4 bg-[#000000] rounded flex items-center justify-center">
                    <div className="w-2 h-1 bg-[#ffffff] rounded"></div>
                  </div>
                  <span className="font-medium text-[#000000]">Daily Average This Week</span>
                </div>
                <p className="text-[#000000] font-semibold">1660</p>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Utensils className="w-4 h-4 text-[#000000]" />
                  <span className="font-medium text-[#000000]">Menu Consumed Today</span>
                </div>
                <p className="text-[#000000] font-semibold">1</p>
              </div>
            </div>
          </div>
        </div>

        {/* Add Consumed Menu Button */}
        <Button className="w-full bg-[#2c2c2c] hover:bg-[#1d1b20] text-[#ffffff] rounded-2xl py-4 text-base font-medium">
          <Plus className="w-5 h-5 mr-2" />
          Add Consumed Menu
        </Button>

        {/* Today's Recommended Menu */}
        <div>
          <h3 className="text-xl font-bold text-[#000000] mb-4">Today's Recommended Menu</h3>

          <div className="bg-[#f5f5f5] rounded-2xl p-4 flex gap-4">
            <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
              <Image
                src="/placeholder.svg?height=80&width=80"
                alt="Rendang dish"
                width={80}
                height={80}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex-1">
              <h4 className="font-bold text-[#000000] text-lg mb-1">Rendang</h4>
              <p className="text-[#787880] text-sm mb-2">
                Slow-cooked beef braised in coconut milk and a blend of aromatic spices
              </p>

              <div className="flex items-center justify-between">
                <span className="text-[#000000] font-medium text-sm">~195 Calories/100g</span>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 bg-[#000000] rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-[#ffffff] rounded-full"></div>
                  </div>
                  <span className="text-[#000000] font-medium text-sm">Indonesia</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Your Recipes */}
        <div className="pb-20">
          <h3 className="text-xl font-bold text-[#000000] mb-4">Your Recipes</h3>

          <div className="flex gap-3 overflow-x-auto">
            {recipes.map((recipe, index) => (
              <div key={recipe.id} className="bg-[#f5f5f5] rounded-2xl p-4 min-w-[160px] flex-shrink-0">
                <div className="w-full h-20 bg-[#e3e5c1] rounded-xl mb-3"></div>
                <h4 className="font-bold text-[#000000] mb-1">{recipe.name}</h4>
                <p className="text-[#787880] text-sm mb-3">{recipe.calories}</p>

                <Button className="w-full bg-[#2c2c2c] hover:bg-[#1d1b20] text-[#ffffff] rounded-lg py-2 text-sm mb-2">
                  <Book className="w-4 h-4 mr-1" />
                  Recipe
                </Button>

                <button
                  onClick={() => toggleFavorite(recipe.id)}
                  className="flex justify-center w-full"
                  aria-label={recipe.isFavorite ? "Remove from favorites" : "Add to favorites"}
                >
                  <Star className={`w-5 h-5 ${recipe.isFavorite ? "text-[#007aff] fill-current" : "text-[#999999]"}`} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-sm bg-[#ffffff] border-t border-[#f5f5f5]">
        <div className="flex justify-around py-2">
          <div className="flex flex-col items-center py-2">
            <Star className="w-6 h-6 text-[#007aff] fill-current mb-1" />
            <span className="text-xs text-[#007aff] font-medium">Home</span>
          </div>
          <div className="flex flex-col items-center py-2">
            <Plus className="w-6 h-6 text-[#999999] mb-1" />
            <span className="text-xs text-[#999999]">Add</span>
          </div>
          <div className="flex flex-col items-center py-2">
            <Book className="w-6 h-6 text-[#999999] mb-1" />
            <span className="text-xs text-[#999999]">Recipes</span>
          </div>
        </div>
      </div>
    </div>
  )
}
