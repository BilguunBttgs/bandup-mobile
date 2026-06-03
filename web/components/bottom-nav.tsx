"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  House,
  Scroll,
  Storefront,
  User,
  type Icon,
} from "@phosphor-icons/react"

import { cn } from "@/lib/utils"

type NavItem = {
  label: string
  icon: Icon
  href: string
  disabled?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { label: "Home", icon: House, href: "/" },
  { label: "Shop", icon: Storefront, href: "/shop", disabled: true },
  { label: "Quests", icon: Scroll, href: "/quests" },
  { label: "Profile", icon: User, href: "/profile" },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="flex shrink-0 items-stretch border-t bg-card">
      {NAV_ITEMS.map(({ label, icon: Icon, href, disabled }) => {
        const active = pathname === href
        const content = (
          <>
            <Icon size={22} weight={active ? "fill" : "regular"} />
            <span className="text-[10px] font-medium">{label}</span>
          </>
        )

        const baseClass =
          "flex flex-1 flex-col items-center justify-center gap-1 py-2.5 transition-colors"

        if (disabled) {
          return (
            <button
              key={label}
              type="button"
              disabled
              aria-label={`${label} (coming soon)`}
              className={cn(baseClass, "text-muted-foreground/40")}
            >
              {content}
            </button>
          )
        }

        return (
          <Link
            key={label}
            href={href}
            className={cn(
              baseClass,
              active
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {content}
          </Link>
        )
      })}
    </nav>
  )
}
