import { type NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/middleware"
import { createUserProfile } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const body = await request.json()
    const { age, weight, height, activityLevel, goal, dietaryPreferences, allergies, mealsPerDay } = body

    // Calculate daily calorie goal based on user data
    const dailyCalorieGoal = calculateDailyCalories({
      age,
      weight,
      height,
      activityLevel,
      goal,
    })

    // Create user profile
    const profile = await createUserProfile(user.id, {
      age,
      weight,
      height,
      activityLevel,
      goal,
      dietaryPreferences,
      allergies,
      mealsPerDay,
      dailyCalorieGoal,
    })

    return NextResponse.json({
      success: true,
      profile,
    })
  } catch (error) {
    console.error("Onboarding API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Simple calorie calculation (Mifflin-St Jeor Equation)
function calculateDailyCalories(data: {
  age: number
  weight: number
  height: number
  activityLevel: string
  goal: string
}): number {
  const { age, weight, height, activityLevel, goal } = data

  // Base Metabolic Rate (BMR) - assuming male for simplicity
  const bmr = 10 * weight + 6.25 * height - 5 * age + 5

  // Activity multipliers
  const activityMultipliers: { [key: string]: number } = {
    Sedentary: 1.2,
    "Lightly Active": 1.375,
    "Moderately Active": 1.55,
    "Very Active": 1.725,
    "Extremely Active": 1.9,
  }

  const multiplier = activityMultipliers[activityLevel] || 1.55
  let dailyCalories = bmr * multiplier

  // Adjust based on goal
  if (goal === "Lose Weight") {
    dailyCalories -= 500 // 500 calorie deficit
  } else if (goal === "Gain Weight") {
    dailyCalories += 500 // 500 calorie surplus
  }

  return Math.round(dailyCalories)
}
