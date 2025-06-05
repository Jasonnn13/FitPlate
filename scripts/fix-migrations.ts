import { neon } from "@neondatabase/serverless"
import dotenv from "dotenv"
import fs from "fs"
import path from "path"

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" })

async function fixMigrations() {
  try {
    console.log("Fixing migrations...")

    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is not set")
    }

    const sql = neon(process.env.DATABASE_URL)

    // Check if users table exists
    const usersTableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = 'users'
      ) as exists
    `

    if (!usersTableCheck[0].exists) {
      console.log("Creating users table...")
      await sql`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            first_name VARCHAR(100) NOT NULL,
            last_name VARCHAR(100) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            email_verified BOOLEAN DEFAULT FALSE,
            last_login TIMESTAMP,
            is_active BOOLEAN DEFAULT TRUE
        )
      `
      console.log("✅ Users table created")
    } else {
      console.log("✅ Users table already exists")
    }

    // Check if user_sessions table exists
    const sessionsTableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = 'user_sessions'
      ) as exists
    `

    if (!sessionsTableCheck[0].exists) {
      console.log("Creating user_sessions table...")
      await sql`
        CREATE TABLE IF NOT EXISTS user_sessions (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            session_token VARCHAR(255) UNIQUE NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            ip_address INET,
            user_agent TEXT
        )
      `
      console.log("✅ User_sessions table created")
    } else {
      console.log("✅ User_sessions table already exists")
    }

    // Check if user_profiles table exists
    const profilesTableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = 'user_profiles'
      ) as exists
    `

    if (!profilesTableCheck[0].exists) {
      console.log("Creating user_profiles table...")
      await sql`
        CREATE TABLE IF NOT EXISTS user_profiles (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            age INTEGER,
            weight DECIMAL(5,2),
            height DECIMAL(5,2),
            activity_level VARCHAR(50),
            goal VARCHAR(100),
            dietary_preferences TEXT[],
            allergies TEXT[],
            meals_per_day INTEGER,
            daily_calorie_goal INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `
      console.log("✅ User_profiles table created")
    } else {
      console.log("✅ User_profiles table already exists")
    }

    // Create indexes
    console.log("Creating indexes...")
    await sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`
    await sql`CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(session_token)`
    await sql`CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON user_profiles(user_id)`
    console.log("✅ Indexes created")

    // Create migrations table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `

    // Mark all migrations as applied
    const sqlFiles = fs
      .readdirSync(path.join(process.cwd(), "scripts"))
      .filter((file) => file.endsWith(".sql"))
      .sort()

    for (const file of sqlFiles) {
      await sql`
        INSERT INTO migrations (name)
        SELECT ${file}
        WHERE NOT EXISTS (SELECT 1 FROM migrations WHERE name = ${file})
      `
      console.log(`✅ Marked migration ${file} as applied`)
    }

    console.log("✅ All migrations fixed successfully!")
  } catch (error) {
    console.error("❌ Fix migrations failed:", error)
    process.exit(1)
  }
}

fixMigrations()
