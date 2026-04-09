import type { Metadata } from "next"
import { HeroSection } from "@/components/hp/hero-section"
import { PasswordGate } from "@/components/hp/password-gate"
import { CalendarEmbed } from "@/components/hp/calendar-embed"
import { SITE_TAGLINE, SITE_TITLE } from "@/lib/site-brand"

export const metadata: Metadata = {
  title: SITE_TITLE,
  description: SITE_TAGLINE,
  openGraph: {
    title: SITE_TITLE,
    description: SITE_TAGLINE,
    type: "website",
  },
  twitter: { card: "summary_large_image" },
}

export default function HomePage() {
  return (
    <div className="space-y-10 md:space-y-14">
      <HeroSection />

      <section className="mx-auto w-full max-w-[1440px] px-4 md:px-8 xl:px-12">
        <PasswordGate>
          <div className="neu-raised p-6 md:p-10 xl:p-12">
            <CalendarEmbed />
          </div>
        </PasswordGate>
      </section>
    </div>
  )
}
