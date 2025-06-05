import { type NextRequest, NextResponse } from "next/server"
import { authenticateUser, validateEmail } from "@/lib/auth"
import { getClientIP, getUserAgent } from "@/lib/middleware"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    // Validate input
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    if (!validateEmail(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 })
    }

    // Get client info
    const ipAddress = getClientIP(request)
    const userAgent = getUserAgent(request)

    // Authenticate user
    const result = await authenticateUser(email, password, ipAddress, userAgent)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 401 })
    }

    // Create response with session cookie
    const response = NextResponse.json({
      success: true,
      user: result.user,
    })

    // Set secure HTTP-only cookie
    response.cookies.set("session_token", result.sessionToken!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    })

    return response
  } catch (error) {
    console.error("Login API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
