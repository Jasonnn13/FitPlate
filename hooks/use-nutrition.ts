"use client"

import { useState, useEffect } from "react"
import type { DailyNutritionStats, ConsumedMeal } from "@/lib/consumed-meals"

export function useNutrition() {
  const [dailyStats, setDailyStats] = useState<DailyNutritionStats | null>(null)
  const [consumedMeals, setConsumedMeals] = useState<ConsumedMeal[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDailyStats = async (date?: Date) => {
    try {
      setLoading(true)
      setError(null)

      const dateParam = date ? `?date=${date.toISOString()}` : ""
      const response = await fetch(`/api/nutrition/daily-stats${dateParam}`)

      if (!response.ok) {
        throw new Error("Failed to fetch daily stats")
      }

      const data = await response.json()
      setDailyStats(data.stats)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const fetchConsumedMeals = async (date?: Date, limit = 10) => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (date) params.append("date", date.toISOString())
      params.append("limit", limit.toString())

      const response = await fetch(`/api/consumed-meals?${params}`)

      if (!response.ok) {
        throw new Error("Failed to fetch consumed meals")
      }

      const data = await response.json()
      setConsumedMeals(data.meals)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
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
    ingredients?: { id: number; amount?: string; unit?: string }[]
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

      // Refresh stats and meals after adding
      await Promise.all([fetchDailyStats(), fetchConsumedMeals()])

      return {
        consumedMealId: data.consumedMealId,
        calculatedCalories: data.calculatedCalories,
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
      return null
    } finally {
      setLoading(false)
    }
  }

  const deleteConsumedMeal = async (mealId: number) => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/consumed-meals/${mealId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete consumed meal")
      }

      // Refresh stats and meals after deleting
      await Promise.all([fetchDailyStats(), fetchConsumedMeals()])

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
      return false
    } finally {
      setLoading(false)
    }
  }

  // Auto-fetch daily stats on mount
  useEffect(() => {
    fetchDailyStats()
    fetchConsumedMeals()
  }, [])

  return {
    dailyStats,
    consumedMeals,
    loading,
    error,
    fetchDailyStats,
    fetchConsumedMeals,
    addConsumedMeal,
    deleteConsumedMeal,
    refreshData: () => Promise.all([fetchDailyStats(), fetchConsumedMeals()]),
  }
}
