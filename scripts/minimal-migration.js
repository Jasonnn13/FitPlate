// Simple script to run migrations without dependencies
require("dotenv").config({ path: ".env.local" })
const fs = require("fs")
const path = require("path")

async function runMigrations() {
  try {
    console.log("Running database migrations...")

    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is not set")
    }

    // Import dynamically to avoid dependency issues
    const { neon } = await import("@neondatabase/serverless")
    const sql = neon(process.env.DATABASE_URL)

    // Create migrations table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `

    console.log("✅ Migrations table created")

    // Create users table
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

    // Create indexes for users table
    await sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`

    // Create sessions table
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

    // Create indexes for sessions table
    await sql`CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(session_token)`
    await sql`CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id)`

    // Create user profiles table
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

    await sql`CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON user_profiles(user_id)`

    console.log("✅ All tables created successfully!")

    // Insert test users
    console.log("Inserting test users...")
    await sql`
      INSERT INTO users (email, password_hash, first_name, last_name, email_verified) VALUES
      ('john.doe@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uO.G', 'John', 'Doe', true),
      ('jane.smith@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uO.G', 'Jane', 'Smith', true),
      ('test@fitplate.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uO.G', 'Test', 'User', true)
      ON CONFLICT (email) DO NOTHING
    `

    // Insert test profile
    await sql`
      INSERT INTO user_profiles (user_id, age, weight, height, activity_level, goal, dietary_preferences, allergies, meals_per_day, daily_calorie_goal)
      SELECT 
          u.id,
          28,
          70.5,
          175.0,
          'Moderately Active',
          'Maintain Weight',
          ARRAY['Vegetarian'],
          ARRAY['Nuts'],
          3,
          2200
      FROM users u 
      WHERE u.email = 'john.doe@example.com'
      AND NOT EXISTS (SELECT 1 FROM user_profiles WHERE user_id = u.id)
    `

    // Record migrations as applied
    const migrationFiles = [
      "001-create-users-table.sql",
      "002-create-user-profiles-table.sql",
      "003-seed-test-users.sql",
    ]

    for (const file of migrationFiles) {
      await sql`
        INSERT INTO migrations (name)
        SELECT ${file}
        WHERE NOT EXISTS (SELECT 1 FROM migrations WHERE name = ${file})
      `
    }

    console.log("✅ All migrations completed successfully!")
    console.log("✅ Test data inserted!")
  } catch (error) {
    console.error("❌ Migration failed:", error)
    process.exit(1)
  }
}

runMigrations()
