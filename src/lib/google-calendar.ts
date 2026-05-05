import { google } from "googleapis"

const CALENDAR_SCOPES = ["https://www.googleapis.com/auth/calendar.freebusy"]

export const CALENDAR_TOKEN_USER_ID = "satoshi-calendar-owner"

type CalendarOAuthEnv = {
  clientId: string
  clientSecret: string
  redirectUri: string
}

export type CalendarBusySlot = {
  start: string
  end: string
}

export type RefreshedCalendarToken = {
  accessToken: string
  expiresAt: Date
  scope: string
}

function requireCalendarOAuthEnv(): CalendarOAuthEnv {
  const clientId = process.env.GOOGLE_CALENDAR_OAUTH_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CALENDAR_OAUTH_CLIENT_SECRET
  const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI

  const missing = [
    ["GOOGLE_CALENDAR_OAUTH_CLIENT_ID", clientId],
    ["GOOGLE_CALENDAR_OAUTH_CLIENT_SECRET", clientSecret],
    ["GOOGLE_CALENDAR_REDIRECT_URI", redirectUri],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name)

  if (missing.length > 0) {
    throw new Error(`Missing Google Calendar OAuth env: ${missing.join(", ")}`)
  }

  return {
    clientId: clientId!,
    clientSecret: clientSecret!,
    redirectUri: redirectUri!,
  }
}

export function createCalendarOAuthClient() {
  const { clientId, clientSecret, redirectUri } = requireCalendarOAuthEnv()
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri)
}

export function getCalendarAuthUrl(): string {
  const oauth2Client = createCalendarOAuthClient()
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: CALENDAR_SCOPES,
  })
}

export async function exchangeCalendarCode(code: string): Promise<RefreshedCalendarToken & { refreshToken: string }> {
  const oauth2Client = createCalendarOAuthClient()
  const { tokens } = await oauth2Client.getToken(code)

  if (!tokens.access_token) {
    throw new Error("Google Calendar OAuth did not return access_token")
  }
  if (!tokens.refresh_token) {
    throw new Error("Google Calendar OAuth did not return refresh_token")
  }

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: new Date(tokens.expiry_date ?? Date.now()),
    scope: tokens.scope ?? CALENDAR_SCOPES.join(" "),
  }
}

export async function refreshCalendarAccessToken(refreshToken: string): Promise<RefreshedCalendarToken> {
  const oauth2Client = createCalendarOAuthClient()
  oauth2Client.setCredentials({ refresh_token: refreshToken })

  const { token } = await oauth2Client.getAccessToken()
  if (!token) {
    throw new Error("Google Calendar OAuth refresh did not return access_token")
  }

  return {
    accessToken: token,
    expiresAt: new Date(oauth2Client.credentials.expiry_date ?? Date.now()),
    scope: oauth2Client.credentials.scope ?? CALENDAR_SCOPES.join(" "),
  }
}

export async function getFreeBusy(
  calendarId: string,
  timeMin: string,
  timeMax: string,
  accessToken: string,
): Promise<CalendarBusySlot[]> {
  const oauth2Client = createCalendarOAuthClient()
  oauth2Client.setCredentials({ access_token: accessToken })

  const calendar = google.calendar({ version: "v3", auth: oauth2Client })
  const response = await calendar.freebusy.query({
    requestBody: {
      timeMin,
      timeMax,
      items: [{ id: calendarId }],
    },
  })

  const busy = response.data.calendars?.[calendarId]?.busy ?? []
  return busy.flatMap((slot) => {
    if (!slot.start || !slot.end) return []
    return [{ start: slot.start, end: slot.end }]
  })
}
