require("dotenv").config({ path: ".env.local" })

async function quickTest() {
  try {
    console.log("🔍 Testing database connection...")

    if (!process.env.DATABASE_URL) {
      console.error("❌ DATABASE_URL not found in environment")
      return
    }

    console.log("✅ DATABASE_URL found")

    const { neon } = await import("@neondatabase/serverless")
    const sql = neon(process.env.DATABASE_URL)

    // Test basic connection
    const result = await sql`SELECT NOW() as current_time`
    console.log("✅ Database connected successfully")
    console.log("Current time:", result[0].current_time)

    // Check if tables exist
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `

    console.log("📋 Available tables:")
    tables.forEach((table) => console.log(`  - ${table.table_name}`))

    // Test users table
    if (tables.some((t) => t.table_name === "users")) {
      const userCount = await sql`SELECT COUNT(*) as count FROM users`
      console.log(`👥 Users in database: ${userCount[0].count}`)
    }

    // Test recipes table
    if (tables.some((t) => t.table_name === "recipes")) {
      const recipeCount = await sql`SELECT COUNT(*) as count FROM recipes`
      console.log(`📖 Recipes in database: ${recipeCount[0].count}`)
    }

    // Test consumed_meals table
    if (tables.some((t) => t.table_name === "consumed_meals")) {
      const mealCount = await sql`SELECT COUNT(*) as count FROM consumed_meals`
      console.log(`🍽️ Consumed meals in database: ${mealCount[0].count}`)
    }
  } catch (error) {
    console.error("❌ Database test failed:")
    console.error("Error type:", error.constructor.name)
    console.error("Error message:", error.message)

    if (error.message.includes("does not exist")) {
      console.log("\n💡 Suggestion: Run database setup first:")
      console.log("npm run setup-db")
    }
  }
}

quickTest()
