import dotenv from "dotenv"

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" })

console.log("=== Environment Variables Debug ===")
console.log("NODE_ENV:", process.env.NODE_ENV)
console.log("DATABASE_URL exists:", !!process.env.DATABASE_URL)
console.log("DATABASE_URL length:", process.env.DATABASE_URL?.length || 0)

if (process.env.DATABASE_URL) {
  // Show first and last 20 characters to verify it's loaded correctly
  const url = process.env.DATABASE_URL
  console.log("DATABASE_URL preview:", `${url.substring(0, 20)}...${url.substring(url.length - 20)}`)
} else {
  console.log("❌ DATABASE_URL is not loaded!")
}

console.log("\n=== Checking .env.local file ===")
const fs = require("fs")
const path = require("path")

const envPath = path.join(process.cwd(), ".env.local")
console.log("Looking for .env.local at:", envPath)
console.log(".env.local exists:", fs.existsSync(envPath))

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8")
  console.log(".env.local file size:", envContent.length, "bytes")
  console.log("Contains DATABASE_URL:", envContent.includes("DATABASE_URL"))

  // Show the first few lines (without sensitive data)
  const lines = envContent.split("\n").slice(0, 5)
  console.log("First few lines:")
  lines.forEach((line, i) => {
    if (line.startsWith("DATABASE_URL")) {
      console.log(`${i + 1}: DATABASE_URL=***hidden***`)
    } else {
      console.log(`${i + 1}: ${line}`)
    }
  })
} else {
  console.log("❌ .env.local file not found!")
}

// Test the actual connection
async function testDirectConnection() {
  console.log("\n=== Testing Direct Connection ===")

  try {
    const { neon } = await import("@neondatabase/serverless")

    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not set")
    }

    console.log("Creating neon client...")
    const sql = neon(process.env.DATABASE_URL)

    console.log("Executing test query...")
    const result = await sql`SELECT 1 as test`

    console.log("✅ Connection successful!")
    console.log("Test result:", result)
  } catch (error) {
    console.error("❌ Connection failed:")
    console.error("Error type:", error.constructor.name)
    console.error("Error message:", error.message)

    if (error.message.includes("getaddrinfo ENOTFOUND")) {
      console.log("\n💡 This looks like a DNS/network issue. Check your internet connection.")
    } else if (error.message.includes("authentication")) {
      console.log("\n💡 This looks like an authentication issue. Check your credentials.")
    } else if (error.message.includes("database") && error.message.includes("does not exist")) {
      console.log("\n💡 The database doesn't exist. Check your database name.")
    }
  }
}

testDirectConnection()
