import { type NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/middleware"
import { addConsumedMealWithCalories, getUserConsumedMeals } from "@/lib/consumed-meals"

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const body = await request.json()
    const { recipe_id, meal_name, meal_time, portion, notes, ingredients } = body

    if (!meal_name || !meal_time) {
      return NextResponse.json({ error: "Meal name and time are required" }, { status: 400 })
    }

    const result = await addConsumedMealWithCalories({
      user_id: user.id,
      recipe_id,
      meal_name,
      meal_time,
      portion,
      notes,
      ingredients,
    })

    return NextResponse.json({
      success: true,
      consumedMealId: result.consumedMealId,
      calculatedCalories: result.calculatedCalories,
    })
  } catch (error) {
    console.error("Error adding consumed meal:", error)
    return NextResponse.json(
      {
        error: "Failed to add consumed meal",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)

    if (!user) {
      // Return empty meals array for demo purposes
      return NextResponse.json({
        success: true,
        meals: [],
        message: "Not authenticated - showing empty meals",
      })
    }

    const { searchParams } = new URL(request.url)
    const date = searchParams.get("date")
    const limit = Number.parseInt(searchParams.get("limit") || "10")

    const targetDate = date ? new Date(date) : undefined
    const meals = await getUserConsumedMeals(user.id, limit, targetDate)

    return NextResponse.json({
      success: true,
      meals,
    })
  } catch (error) {
    console.error("Error fetching consumed meals:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch consumed meals",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
