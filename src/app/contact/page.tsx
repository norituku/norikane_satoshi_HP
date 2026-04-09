import type { Metadata } from "next"
import { ContactForm } from "@/components/hp/contact-form"
import { SITE_BRAND_NAME } from "@/lib/site-brand"

export const metadata: Metadata = {
  title: `Contact | ${SITE_BRAND_NAME}`,
  description: "お問い合わせ・ご連絡はこちらから。",
  openGraph: {
    title: `Contact | ${SITE_BRAND_NAME}`,
    description: "お問い合わせ・ご連絡はこちらから。",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
}

const socialLinks = [
  { label: "X (Twitter)", href: "#", icon: "𝕏" },
  { label: "Vimeo", href: "#", icon: "V" },
]

export default function ContactPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 md:px-8 space-y-12">
      <section>
        <h1 className="text-3xl font-bold text-neu mb-4">Contact</h1>
        <p className="text-sm text-neu-muted mb-8">
          お仕事のご相談・お問い合わせはこちらからお願いします。
          <br />
          ご返信時に予約カレンダーのパスワードをお伝えします。
        </p>
        <ContactForm />
      </section>

      <section className="neu-raised p-8 text-center">
        <h2 className="text-lg font-bold text-neu mb-4">SNS</h2>
        <div className="flex items-center justify-center gap-4">
          {socialLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="neu-btn w-12 h-12 flex items-center justify-center text-lg font-bold text-neu"
              aria-label={link.label}
            >
              {link.icon}
            </a>
          ))}
        </div>
        <p className="text-xs text-neu-muted mt-4">
          ※ SNSリンクは準備中です
        </p>
      </section>
    </div>
  )
}
