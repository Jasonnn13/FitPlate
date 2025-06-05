import { type NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/middleware"
import { getUserDailyStats } from "@/lib/consumed-meals"

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)

    if (!user) {
      // Return default stats for demo purposes
      return NextResponse.json({
        success: true,
        stats: {
          totalCalories: 0,
          totalProtein: 0,
          totalCarbs: 0,
          totalFat: 0,
          mealsConsumed: 0,
          dailyGoal: 2000,
          remaining: 2000,
          weeklyAverage: 0,
        },
        message: "Not authenticated - showing default stats",
      })
    }

    const { searchParams } = new URL(request.url)
    const date = searchParams.get("date")

    const targetDate = date ? new Date(date) : new Date()
    const stats = await getUserDailyStats(user.id, targetDate)

    return NextResponse.json({
      success: true,
      stats,
    })
  } catch (error) {
    console.error("Error fetching daily stats:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch daily stats",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
