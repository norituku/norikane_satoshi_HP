import { NextResponse, type NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"

type RouteContext = {
  params: Promise<{ token: string }>
}

export async function GET(_request: NextRequest, ctx: RouteContext) {
  const { token } = await ctx.params

  const record = await prisma.verificationToken.findUnique({ where: { token } })
  if (!record) {
    return NextResponse.json({ error: "invalid or expired token" }, { status: 400 })
  }
  if (record.expires.getTime() < Date.now()) {
    await prisma.verificationToken.delete({ where: { token } })
    return NextResponse.json({ error: "invalid or expired token" }, { status: 400 })
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { email: record.identifier },
      data: { emailVerified: new Date() },
    }),
    prisma.verificationToken.delete({ where: { token } }),
  ])

  return NextResponse.json({ ok: true, email: record.identifier })
}
