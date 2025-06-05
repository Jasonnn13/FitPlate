import bcrypt from "bcryptjs"
import { randomBytes } from "crypto"
import { getUserByEmail, createUser, createSession, getSessionByToken, deleteSession, updateLastLogin } from "./db"

export interface User {
  id: number
  email: string
  first_name: string
  last_name: string
  age?: number
  weight?: number
  height?: number
  activity_level?: string
  goal?: string
  dietary_preferences?: string[]
  allergies?: string[]
  meals_per_day?: number
  daily_calorie_goal?: number
}

export interface AuthResult {
  success: boolean
  user?: User
  sessionToken?: string
  error?: string
}

export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12
  return bcrypt.hash(password, saltRounds)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function generateSessionToken(): string {
  return randomBytes(32).toString("hex")
}

export async function authenticateUser(
  email: string,
  password: string,
  ipAddress?: string,
  userAgent?: string,
): Promise<AuthResult> {
  try {
    // Get user by email
    const user = await getUserByEmail(email)
    if (!user) {
      return { success: false, error: "Invalid email or password" }
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password_hash)
    if (!isValidPassword) {
      return { success: false, error: "Invalid email or password" }
    }

    // Generate session token
    const sessionToken = generateSessionToken()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    // Create session
    await createSession(user.id, sessionToken, expiresAt, ipAddress, userAgent)

    // Update last login
    await updateLastLogin(user.id)

    // Remove sensitive data
    const { password_hash, ...userWithoutPassword } = user

    return {
      success: true,
      user: userWithoutPassword as User,
      sessionToken,
    }
  } catch (error) {
    console.error("Authentication error:", error)
    return { success: false, error: "Authentication failed" }
  }
}

export async function registerUser(userData: {
  email: string
  password: string
  firstName: string
  lastName: string
}): Promise<AuthResult> {
  try {
    // Check if user already exists
    const existingUser = await getUserByEmail(userData.email)
    if (existingUser) {
      return { success: false, error: "User with this email already exists" }
    }

    // Hash password
    const passwordHash = await hashPassword(userData.password)

    // Create user
    const newUser = await createUser({
      email: userData.email,
      passwordHash,
      firstName: userData.firstName,
      lastName: userData.lastName,
    })

    return {
      success: true,
      user: newUser as User,
    }
  } catch (error) {
    console.error("Registration error:", error)
    return { success: false, error: "Registration failed" }
  }
}

export async function validateSession(sessionToken: string): Promise<User | null> {
  try {
    const session = await getSessionByToken(sessionToken)
    if (!session) {
      return null
    }

    return {
      id: session.user_id,
      email: session.email,
      first_name: session.first_name,
      last_name: session.last_name,
    } as User
  } catch (error) {
    console.error("Session validation error:", error)
    return null
  }
}

export async function logoutUser(sessionToken: string): Promise<boolean> {
  try {
    await deleteSession(sessionToken)
    return true
  } catch (error) {
    console.error("Logout error:", error)
    return false
  }
}

// Validation helpers
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long")
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter")
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter")
  }

  if (!/\d/.test(password)) {
    errors.push("Password must contain at least one number")
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
