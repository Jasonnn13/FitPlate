import { neon } from "@neondatabase/serverless"
import dotenv from "dotenv"
import fs from "fs"
import path from "path"

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" })

async function runMigrations() {
  try {
    console.log("Running database migrations...")

    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is not set")
    }

    const sql = neon(process.env.DATABASE_URL)

    // Create migrations table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `

    // Get all SQL files in the scripts directory
    const scriptsDir = path.join(process.cwd(), "scripts")
    const sqlFiles = fs
      .readdirSync(scriptsDir)
      .filter((file) => file.endsWith(".sql"))
      .sort() // Sort to ensure correct order

    // Check which migrations have already been applied
    const appliedMigrations = await sql`SELECT name FROM migrations`
    const appliedMigrationNames = appliedMigrations.map((m: any) => m.name)

    // Run each migration that hasn't been applied yet
    for (const file of sqlFiles) {
      if (appliedMigrationNames.includes(file)) {
        console.log(`⏭️ Skipping ${file} (already applied)`)
        continue
      }

      console.log(`🔄 Running migration: ${file}`)

      const filePath = path.join(scriptsDir, file)
      const sqlContent = fs.readFileSync(filePath, "utf8")

      // Execute the SQL script by splitting into individual statements
      try {
        // Split SQL content by semicolons and filter out empty statements
        const statements = sqlContent
          .split(";")
          .map((stmt) => stmt.trim())
          .filter((stmt) => stmt.length > 0 && !stmt.startsWith("--"))

        // Execute each statement
        for (const statement of statements) {
          if (statement.trim()) {
            // Use template literal to execute raw SQL
            await sql([statement] as any)
          }
        }

        // Record the migration
        await sql`INSERT INTO migrations (name) VALUES (${file})`

        console.log(`✅ Successfully applied ${file}`)
      } catch (error) {
        console.error(`❌ Error applying ${file}:`, error)
        throw error
      }
    }

    console.log("✅ All migrations completed successfully!")
  } catch (error) {
    console.error("❌ Migration failed:", error)
    process.exit(1)
  }
}

runMigrations()
