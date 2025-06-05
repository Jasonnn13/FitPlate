import { type NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/middleware"
import { getUserRecipes } from "@/lib/recipes"

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)

    if (!user) {
      // Return empty recipes array instead of error for demo purposes
      return NextResponse.json({
        success: true,
        recipes: [],
        message: "Not authenticated - showing empty recipes",
      })
    }

    const recipes = await getUserRecipes(user.id)

    return NextResponse.json({
      success: true,
      recipes,
    })
  } catch (error) {
    console.error("Error fetching recipes:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch recipes",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
