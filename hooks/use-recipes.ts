"use client"

import { useState } from "react"
import type { Recipe, Ingredient } from "@/lib/recipes"

export function useRecipes() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchUserRecipes = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/recipes")

      if (!response.ok) {
        throw new Error("Failed to fetch recipes")
      }

      const data = await response.json()
      setRecipes(data.recipes)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const fetchRecipeById = async (recipeId: number) => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/recipes/${recipeId}`)

      if (!response.ok) {
        throw new Error("Failed to fetch recipe")
      }

      const data = await response.json()
      setSelectedRecipe(data.recipe)
      return data.recipe
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
      return null
    } finally {
      setLoading(false)
    }
  }

  const addConsumedMeal = async (mealData: {
    recipe_id?: number
    meal_name: string
    meal_time: string
    portion?: string
    notes?: string
    ingredients?: Ingredient[]
  }) => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/consumed-meals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(mealData),
      })

      if (!response.ok) {
        throw new Error("Failed to add consumed meal")
      }

      const data = await response.json()
      return data.consumedMealId
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
      return null
    } finally {
      setLoading(false)
    }
  }

  return {
    recipes,
    selectedRecipe,
    loading,
    error,
    fetchUserRecipes,
    fetchRecipeById,
    addConsumedMeal,
  }
}
