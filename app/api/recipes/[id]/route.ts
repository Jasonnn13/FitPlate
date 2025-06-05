import { type NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/middleware"
import { getRecipeById } from "@/lib/recipes"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthenticatedUser(request)

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const recipeId = Number.parseInt(params.id)
    if (isNaN(recipeId)) {
      return NextResponse.json({ error: "Invalid recipe ID" }, { status: 400 })
    }

    const recipe = await getRecipeById(recipeId)

    if (!recipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 })
    }

    // Check if the recipe belongs to the user or is public
    if (recipe.user_id !== user.id && !recipe.is_public) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    return NextResponse.json({
      success: true,
      recipe,
    })
  } catch (error) {
    console.error("Error fetching recipe:", error)
    return NextResponse.json({ error: "Failed to fetch recipe" }, { status: 500 })
  }
}
