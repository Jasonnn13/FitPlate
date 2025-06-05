import { neon } from "@neondatabase/serverless"

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set")
}

export const sql = neon(process.env.DATABASE_URL)

// Database helper functions
export async function getUserByEmail(email: string) {
  const result = await sql`
    SELECT u.*, p.age, p.weight, p.height, p.activity_level, p.goal, 
           p.dietary_preferences, p.allergies, p.meals_per_day, p.daily_calorie_goal
    FROM users u
    LEFT JOIN user_profiles p ON u.id = p.user_id
    WHERE u.email = ${email} AND u.is_active = true
  `
  return result[0] || null
}

export async function getUserById(id: number) {
  const result = await sql`
    SELECT u.*, p.age, p.weight, p.height, p.activity_level, p.goal, 
           p.dietary_preferences, p.allergies, p.meals_per_day, p.daily_calorie_goal
    FROM users u
    LEFT JOIN user_profiles p ON u.id = p.user_id
    WHERE u.id = ${id} AND u.is_active = true
  `
  return result[0] || null
}

export async function createUser(userData: {
  email: string
  passwordHash: string
  firstName: string
  lastName: string
}) {
  const result = await sql`
    INSERT INTO users (email, password_hash, first_name, last_name)
    VALUES (${userData.email}, ${userData.passwordHash}, ${userData.firstName}, ${userData.lastName})
    RETURNING id, email, first_name, last_name, created_at
  `
  return result[0]
}

export async function createUserProfile(
  userId: number,
  profileData: {
    age?: number
    weight?: number
    height?: number
    activityLevel?: string
    goal?: string
    dietaryPreferences?: string[]
    allergies?: string[]
    mealsPerDay?: number
    dailyCalorieGoal?: number
  },
) {
  const result = await sql`
    INSERT INTO user_profiles (
      user_id, age, weight, height, activity_level, goal, 
      dietary_preferences, allergies, meals_per_day, daily_calorie_goal
    )
    VALUES (
      ${userId}, ${profileData.age}, ${profileData.weight}, ${profileData.height},
      ${profileData.activityLevel}, ${profileData.goal}, ${profileData.dietaryPreferences},
      ${profileData.allergies}, ${profileData.mealsPerDay}, ${profileData.dailyCalorieGoal}
    )
    RETURNING *
  `
  return result[0]
}

export async function createSession(
  userId: number,
  sessionToken: string,
  expiresAt: Date,
  ipAddress?: string,
  userAgent?: string,
) {
  const result = await sql`
    INSERT INTO user_sessions (user_id, session_token, expires_at, ip_address, user_agent)
    VALUES (${userId}, ${sessionToken}, ${expiresAt}, ${ipAddress}, ${userAgent})
    RETURNING *
  `
  return result[0]
}

export async function getSessionByToken(sessionToken: string) {
  const result = await sql`
    SELECT s.*, u.id as user_id, u.email, u.first_name, u.last_name
    FROM user_sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.session_token = ${sessionToken} 
    AND s.expires_at > NOW()
    AND u.is_active = true
  `
  return result[0] || null
}

export async function deleteSession(sessionToken: string) {
  await sql`
    DELETE FROM user_sessions 
    WHERE session_token = ${sessionToken}
  `
}

export async function updateLastLogin(userId: number) {
  await sql`
    UPDATE users 
    SET last_login = NOW() 
    WHERE id = ${userId}
  `
}

export async function cleanupExpiredSessions() {
  await sql`
    DELETE FROM user_sessions 
    WHERE expires_at < NOW()
  `
}
