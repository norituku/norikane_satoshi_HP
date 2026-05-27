/**
 * Vercel Production env expects explicit false values. Local dev defaults to
 * enabled so E2E smoke tests can exercise in-progress surfaces without a
 * separate .env.local. Preview falls back to false when unset and can opt in
 * with explicit true values. NEXT_PUBLIC_ allows client components to read
 * these flags and lets build-time static analysis eliminate false branches.
 */
const isLocalDev = process.env.NODE_ENV === "development"

function isPublicFeatureEnabled(value: string | undefined) {
  if (value === "true") return true
  if (value === "false") return false
  return isLocalDev
}

export const isBookingEnabled = () => isPublicFeatureEnabled(process.env.NEXT_PUBLIC_ENABLE_BOOKING)

export const isChatbotEnabled = () => isPublicFeatureEnabled(process.env.NEXT_PUBLIC_ENABLE_CHATBOT)
