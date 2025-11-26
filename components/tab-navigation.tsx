"use client"

import { Camera, CheckCircle, MessageCircle, Clock } from "lucide-react"

interface TabNavigationProps {
  currentTab: "camera" | "results" | "chat" | "history"
  onTabChange: (tab: "camera" | "results" | "chat" | "history") => void
}

export default function TabNavigation({ currentTab, onTabChange }: TabNavigationProps) {
  const tabs = [
    { id: "chat" as const, label: "Chat", icon: MessageCircle },
    { id: "camera" as const, label: "Scan", icon: Camera },
    { id: "results" as const, label: "Results", icon: CheckCircle },
    { id: "history" as const, label: "History", icon: Clock },
  ]

  return (
    <nav
      className="shrink-0 z-50 border-t border-border bg-card/98 backdrop-blur-lg shadow-[0_-4px_20px_rgba(0,0,0,0.1)]"
      style={{
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div className="flex">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={`relative flex-1 flex flex-col items-center justify-center py-2.5 px-2 transition-all duration-200 min-h-[56px] ${
              currentTab === id ? "text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
            aria-current={currentTab === id ? "page" : undefined}
          >
            {currentTab === id && <div className="absolute top-0 left-2 right-2 h-0.5 rounded-full bg-primary" />}
            <Icon
              className={`w-5 h-5 mb-1 transition-transform ${currentTab === id ? "scale-110" : ""}`}
              strokeWidth={currentTab === id ? 2.5 : 2}
            />
            <span className={`text-[10px] ${currentTab === id ? "font-bold" : "font-medium"}`}>{label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}
