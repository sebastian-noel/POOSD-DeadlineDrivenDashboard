import type { Config } from '../config.js'

/** Link the user clicks in the verification email. The API verifies the token, then redirects to the web app when `WEB_APP_URL` is set. */
export function verificationLink(config: Config, token: string): string {
  const url = new URL('/api/v1/auth/verify-email', config.API_PUBLIC_URL)
  url.searchParams.set('token', token)
  return url.toString()
}

/** Web-app URL with query parameters, or null when `WEB_APP_URL` is not configured. */
export function webAppLink(config: Config, params: Record<string, string>): string | null {
  if (!config.WEB_APP_URL) return null
  const url = new URL(config.WEB_APP_URL)
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
  return url.toString()
}

/** Link in the password-reset email; the web app reads `?reset=<token>` and shows the new-password form. */
export function passwordResetLink(config: Config, token: string): string | null {
  return webAppLink(config, { reset: token })
}
