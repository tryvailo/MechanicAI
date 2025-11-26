"use client"

import type React from "react"
import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Search, Trash2, Camera, History } from "lucide-react"

interface HistoryScreenProps {
  onNavigate: (tab: "camera" | "results" | "chat" | "history") => void
}

interface DiagnosticCard {
  id: number
  title: string
  category: string
  date: string
  daysAgo: number
  severity: "critical" | "warning" | "normal"
  image: string
}

const mockDiagnostics: DiagnosticCard[] = [
  {
    id: 1,
    title: "Engine overheating detected",
    category: "Engine",
    date: "2024-11-22",
    daysAgo: 3,
    severity: "critical",
    image: "/car-engine.jpg",
  },
  {
    id: 2,
    title: "Suspension wear detected",
    category: "Suspension",
    date: "2024-11-20",
    daysAgo: 5,
    severity: "warning",
    image: "/car-suspension.jpg",
  },
  {
    id: 3,
    title: "Brake system normal",
    category: "Electrical",
    date: "2024-11-18",
    daysAgo: 7,
    severity: "normal",
    image: "/car-brake-system.png",
  },
  {
    id: 4,
    title: "Battery voltage low",
    category: "Electrical",
    date: "2024-11-15",
    daysAgo: 10,
    severity: "warning",
    image: "/car-engine.jpg",
  },
  {
    id: 5,
    title: "Body panel damage detected",
    category: "Body",
    date: "2024-11-10",
    daysAgo: 15,
    severity: "normal",
    image: "/car-diagnostic-camera-viewfinder.jpg",
  },
  {
    id: 6,
    title: "Suspension alignment issue",
    category: "Suspension",
    date: "2024-11-05",
    daysAgo: 20,
    severity: "critical",
    image: "/car-suspension.jpg",
  },
]

export default function HistoryScreen({ onNavigate }: HistoryScreenProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedFilter, setSelectedFilter] = useState("All")
  const [swipeId, setSwipeId] = useState<number | null>(null)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const touchRef = useRef<HTMLDivElement>(null)

  const filters = ["All", "Engine", "Suspension", "Electrical"]

  const filteredDiagnostics = mockDiagnostics.filter((diag) => {
    const matchesSearch =
      diag.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      diag.category.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = selectedFilter === "All" || diag.category === selectedFilter
    return matchesSearch && matchesFilter
  })

  const handleTouchStart = (e: React.TouchEvent, id: number) => {
    setTouchStart(e.touches[0].clientX)
  }

  const handleTouchEnd = (e: React.TouchEvent, id: number) => {
    if (!touchStart) return

    const touchEnd = e.changedTouches[0].clientX
    const diff = touchStart - touchEnd

    // Swipe left more than 50px
    if (diff > 50) {
      setSwipeId(id)
    } else if (diff < -50) {
      setSwipeId(null)
    }
  }

  const handleDelete = (id: number) => {
    // Remove from list logic would go here
    setSwipeId(null)
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-500"
      case "warning":
        return "bg-yellow-500"
      case "normal":
        return "bg-green-500"
      default:
        return "bg-gray-500"
    }
  }

  const isEmpty = filteredDiagnostics.length === 0 && searchQuery === "" && selectedFilter === "All"

  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden bg-background">
      {/* Header */}
      <div className="border-b-2 border-border bg-card px-6 py-5 shadow-sm">
        <h1 className="mb-5 text-2xl font-bold text-card-foreground">Diagnostics History</h1>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search history"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl bg-muted border-2 border-border pl-12 pr-4 py-3 text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
          />
        </div>

        {/* Filter Chips */}
        <div className="mt-4 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {filters.map((filter) => (
            <button
              key={filter}
              onClick={() => setSelectedFilter(filter)}
              className={`whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-semibold transition-all shadow-sm ${
                selectedFilter === filter
                  ? "bg-primary text-primary-foreground scale-105"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 border-2 border-border"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
        {isEmpty ? (
          // Empty State
          <div className="flex h-full flex-col items-center justify-center px-6 py-12">
            <div className="mb-6 p-6 rounded-full bg-muted/50">
              <History className="h-20 w-20 text-muted-foreground/40" strokeWidth={1.5} />
            </div>
            <h2 className="mb-3 text-2xl font-bold text-card-foreground">No saved diagnostics yet</h2>
            <p className="mb-8 text-center text-base text-muted-foreground max-w-sm leading-relaxed">
              Start scanning your vehicle to build your diagnostic history
            </p>
            <Button
              onClick={() => onNavigate("camera")}
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg"
            >
              <Camera className="mr-2 h-5 w-5" />
              Start Scanning
            </Button>
          </div>
        ) : (
          // Grid of Diagnostic Cards
          <div className="grid grid-cols-2 gap-4 p-5 md:grid-cols-3 lg:grid-cols-4">
            {filteredDiagnostics.map((diagnostic) => (
              <div
                key={diagnostic.id}
                ref={touchRef}
                onTouchStart={(e) => handleTouchStart(e, diagnostic.id)}
                onTouchEnd={(e) => handleTouchEnd(e, diagnostic.id)}
                className="group relative cursor-pointer"
              >
                {/* Swipe Delete Background */}
                {swipeId === diagnostic.id && (
                  <div className="absolute inset-0 z-10 flex items-center justify-end rounded-2xl bg-destructive px-4 shadow-lg">
                    <button
                      onClick={() => handleDelete(diagnostic.id)}
                      className="text-destructive-foreground hover:scale-110 transition-transform"
                      aria-label="Delete diagnostic"
                    >
                      <Trash2 className="h-6 w-6" />
                    </button>
                  </div>
                )}

                {/* Card */}
                <div
                  className={`relative overflow-hidden rounded-2xl bg-card border-2 border-border shadow-sm transition-all duration-300 hover:shadow-lg ${
                    swipeId === diagnostic.id ? "translate-x-full" : ""
                  }`}
                >
                  {/* Image Container */}
                  <div className="relative aspect-square overflow-hidden bg-muted">
                    <img
                      src={diagnostic.image || "/placeholder.svg"}
                      alt={diagnostic.title}
                      className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />

                    {/* Severity Dot */}
                    <div
                      className={`absolute top-3 right-3 h-3 w-3 rounded-full ${getSeverityColor(diagnostic.severity)} ring-2 ring-white shadow-lg`}
                      aria-label={`Severity: ${diagnostic.severity}`}
                    />
                  </div>

                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end p-4">
                    <h3 className="line-clamp-2 text-sm font-semibold text-white leading-snug mb-1">
                      {diagnostic.title}
                    </h3>
                    <p className="text-xs text-gray-300 font-medium">{diagnostic.daysAgo}d ago</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
