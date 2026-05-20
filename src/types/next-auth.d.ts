import "next-auth"
import "next-auth/jwt"

declare module "next-auth" {
  interface User {
    tokenVersion?: number
  }

  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    tv?: number
  }
}
