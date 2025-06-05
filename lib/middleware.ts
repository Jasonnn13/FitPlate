import type { NextRequest } from "next/server"
import { validateSession } from "./auth"

export async function getAuthenticatedUser(request: NextRequest) {
  const sessionToken = request.cookies.get("session_token")?.value

  if (!sessionToken) {
    return null
  }

  return await validateSession(sessionToken)
}

export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for")
  const realIP = request.headers.get("x-real-ip")

  if (forwarded) {
    return forwarded.split(",")[0].trim()
  }

  if (realIP) {
    return realIP
  }

  return request.ip || "unknown"
}

export function getUserAgent(request: NextRequest): string {
  return request.headers.get("user-agent") || "unknown"
}
