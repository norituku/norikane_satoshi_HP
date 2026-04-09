"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { SITE_BRAND_NAME } from "@/lib/site-brand"

const navItems = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/philosophy", label: "Philosophy" },
  { href: "/contact", label: "Contact" },
]

export function NavHeader() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-4 pt-4 md:px-8 md:pt-6">
      <nav className="neu-raised mx-auto flex w-full max-w-[1440px] items-center justify-between px-6 py-3 xl:px-8">
        <Link
          href="/"
          className="font-[var(--font-inter)] text-lg font-bold tracking-tight text-neu"
        >
          {SITE_BRAND_NAME}
        </Link>

        {/* Desktop nav */}
        <ul className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "px-4 py-2 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "neu-inset text-neu"
                      : "neu-flat text-neu-muted hover:text-neu"
                  )}
                  style={{ borderRadius: "var(--neu-radius-sm)" }}
                >
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>

        {/* Mobile hamburger */}
        <button
          className="md:hidden neu-btn p-2"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "メニューを閉じる" : "メニューを開く"}
        >
          {mobileOpen ? (
            <X className="h-5 w-5 text-neu" />
          ) : (
            <Menu className="h-5 w-5 text-neu" />
          )}
        </button>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="mx-auto mt-2 w-full max-w-[1440px] md:hidden">
          <ul className="neu-raised px-4 py-3 flex flex-col gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "block px-4 py-3 text-sm font-medium transition-all duration-200",
                      isActive
                        ? "neu-inset text-neu"
                        : "neu-flat text-neu-muted hover:text-neu"
                    )}
                    style={{ borderRadius: "var(--neu-radius-sm)" }}
                  >
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </header>
  )
}
