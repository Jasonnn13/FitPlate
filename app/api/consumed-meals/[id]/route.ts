import { type NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/middleware"
import { deleteConsumedMeal } from "@/lib/consumed-meals"

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthenticatedUser(request)

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const mealId = Number.parseInt(params.id)
    if (isNaN(mealId)) {
      return NextResponse.json({ error: "Invalid meal ID" }, { status: 400 })
    }

    const success = await deleteConsumedMeal(user.id, mealId)

    if (!success) {
      return NextResponse.json({ error: "Meal not found or unauthorized" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error("Error deleting consumed meal:", error)
    return NextResponse.json({ error: "Failed to delete consumed meal" }, { status: 500 })
  }
}
