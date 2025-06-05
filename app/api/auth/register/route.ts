import { type NextRequest, NextResponse } from "next/server"
import { registerUser, validateEmail, validatePassword } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, firstName, lastName, confirmPassword } = body

    // Validate input
    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 })
    }

    if (!validateEmail(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 })
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ error: "Passwords do not match" }, { status: 400 })
    }

    const passwordValidation = validatePassword(password)
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: "Password requirements not met", details: passwordValidation.errors },
        { status: 400 },
      )
    }

    // Register user
    const result = await registerUser({
      email,
      password,
      firstName,
      lastName,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      user: result.user,
    })
  } catch (error) {
    console.error("Registration API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
