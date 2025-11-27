"use client"

import { Camera, CheckCircle, MessageCircle, Clock, MapPin } from "lucide-react"
import type { PageTab } from "./types"
import { cn } from "@/lib/utils"

interface TabNavigationProps {
  currentTab: PageTab
  onTabChange: (tab: PageTab) => void
}

const ACTIVE_COLOR = "#21808D"

export default function TabNavigation({ currentTab, onTabChange }: TabNavigationProps) {
  const tabs = [
    { id: "camera" as const, label: "Scan", icon: Camera },
    { id: "results" as const, label: "Results", icon: CheckCircle },
    { id: "chat" as const, label: "Chat", icon: MessageCircle },
    { id: "places" as const, label: "Places", icon: MapPin },
    { id: "history" as const, label: "History", icon: Clock },
  ]

  return (
    <nav
      className={cn(
        "shrink-0 z-50 border-t border-border bg-card/98 backdrop-blur-lg",
        "shadow-[0_-4px_20px_rgba(0,0,0,0.1)]",
        "md:border-t-0 md:border-b md:shadow-[0_4px_20px_rgba(0,0,0,0.1)]"
      )}
      style={{
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div className="flex max-w-screen-lg mx-auto">
        {tabs.map(({ id, label, icon: Icon }) => {
          const isActive = currentTab === id

          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={cn(
                "relative flex-1 flex flex-col items-center justify-center",
                "py-2.5 px-1 md:px-4 transition-all duration-200 min-h-[56px]",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#21808D]",
                isActive
                  ? "text-[#21808D]"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              {/* Active indicator line */}
              <div
                className={cn(
                  "absolute top-0 left-2 right-2 h-0.5 rounded-full transition-all duration-200",
                  "md:top-auto md:bottom-0",
                  isActive ? "opacity-100" : "opacity-0"
                )}
                style={{ backgroundColor: ACTIVE_COLOR }}
              />

              {/* Icon */}
              <Icon
                className={cn(
                  "w-5 h-5 mb-1 transition-transform duration-200",
                  isActive && "scale-110"
                )}
                strokeWidth={isActive ? 2.5 : 2}
                style={{ color: isActive ? ACTIVE_COLOR : undefined }}
              />

              {/* Label */}
              <span
                className={cn(
                  "text-[10px] md:text-xs leading-tight text-center",
                  isActive ? "font-bold" : "font-medium"
                )}
                style={{ color: isActive ? ACTIVE_COLOR : undefined }}
              >
                {label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
