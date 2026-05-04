import NextAuth, { CredentialsSignin } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

class InvalidCredentialsError extends CredentialsSignin {
  code = "invalid_credentials"
}

class EmailNotVerifiedError extends CredentialsSignin {
  code = "email_not_verified"
}

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE_SECONDS,
  },
  cookies: {
    sessionToken: {
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw)
        if (!parsed.success) throw new InvalidCredentialsError()

        const { email, password } = parsed.data
        const user = await prisma.user.findUnique({ where: { email } })
        if (!user || !user.passwordHash) throw new InvalidCredentialsError()

        const ok = await bcrypt.compare(password, user.passwordHash)
        if (!ok) throw new InvalidCredentialsError()

        if (!user.emailVerified) throw new EmailNotVerifiedError()

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          image: user.image ?? undefined,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) token.sub = user.id
      return token
    },
    async session({ session, token }) {
      if (token.sub && session.user) session.user.id = token.sub
      return session
    },
  },
})
