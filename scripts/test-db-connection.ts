import { neon } from "@neondatabase/serverless"
import dotenv from "dotenv"

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" })

async function testConnection() {
  try {
    console.log("Testing database connection...")

    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is not set")
    }

    const sql = neon(process.env.DATABASE_URL)

    // Simple query to test connection
    const result = await sql`SELECT NOW() as time`

    console.log("✅ Connection successful!")
    console.log(`Current database time: ${result[0].time}`)

    // Test query to check if users table exists
    try {
      const tableCheck = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public'
          AND table_name = 'users'
        ) as exists
      `

      if (tableCheck[0].exists) {
        console.log("✅ Users table exists")
      } else {
        console.log("⚠️ Users table does not exist yet (this is normal if you haven't run migrations)")
      }
    } catch (error) {
      console.log("⚠️ Could not check for users table")
    }
  } catch (error) {
    console.error("❌ Connection failed:", error)
    process.exit(1)
  }
}

testConnection()
