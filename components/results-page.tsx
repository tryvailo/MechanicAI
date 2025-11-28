"use client"

import { useState, useCallback, useEffect } from "react"
import AnalysisResults from "./analysis-results"
import CameraScanner from "./camera-scanner"
import ChatInterface from "./chat-interface"
import HistoryScreen from "./history-screen"
import PlacesScreen from "./places-screen"
import TabNavigation from "./tab-navigation"
import type { PageTab } from "./types"

interface ScrollPosition {
  [key: string]: number
}

export default function ResultsPage() {
  const [currentPage, setCurrentPage] = useState<PageTab>("chat")
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [scrollPositions, setScrollPositions] = useState<ScrollPosition>({
    camera: 0,
    results: 0,
    chat: 0,
    history: 0,
    places: 0,
  })
  // Track if Places tab was ever visited (for lazy loading)
  const [placesVisited, setPlacesVisited] = useState(false)

  useEffect(() => {
    const metaViewport = document.querySelector('meta[name="viewport"]')
    if (metaViewport && !metaViewport.getAttribute("content")?.includes("viewport-fit")) {
      metaViewport.setAttribute(
        "content",
        "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover",
      )
    }
  }, [])

  const handleTabChange = useCallback(
    (newTab: PageTab) => {
      const contentArea = document.querySelector("[data-content-area]")
      if (contentArea) {
        setScrollPositions((prev) => ({
          ...prev,
          [currentPage]: contentArea.scrollTop,
        }))
      }
      // Mark Places as visited for lazy loading
      if (newTab === "places" && !placesVisited) {
        setPlacesVisited(true)
      }
      setCurrentPage(newTab)
    },
    [currentPage, placesVisited],
  )


  const restoreScrollPosition = useCallback(
    (tab: PageTab) => {
      setTimeout(() => {
        const contentArea = document.querySelector("[data-content-area]")
        if (contentArea) {
          contentArea.scrollTop = scrollPositions[tab]
        }
      }, 0)
    },
    [scrollPositions],
  )

  return (
    <div className="fixed inset-0 flex flex-col bg-background" style={{ height: "100dvh" }}>
      {/* Content area - flex-1 takes remaining space above tab bar */}
      <div
        data-content-area
        className="flex-1 overflow-hidden bg-background transition-all duration-300"
        style={{
          paddingTop: "env(safe-area-inset-top, 0px)",
        }}
        onLoad={() => restoreScrollPosition(currentPage)}
      >
        {/* Render all screens but hide inactive ones with CSS to prevent unmounting */}
        <div style={{ display: currentPage === "camera" ? "block" : "none", height: "100%" }}>
          <CameraScanner 
            onNavigate={handleTabChange} 
            selectedImage={selectedImage}
            onImageClear={() => setSelectedImage(null)}
          />
        </div>
        <div style={{ display: currentPage === "results" ? "block" : "none", height: "100%" }}>
          <AnalysisResults onNavigate={handleTabChange} />
        </div>
        <div style={{ display: currentPage === "chat" ? "block" : "none", height: "100%" }}>
          <ChatInterface 
            onNavigate={handleTabChange}
          />
        </div>
        <div style={{ display: currentPage === "history" ? "block" : "none", height: "100%" }}>
          <HistoryScreen onNavigate={handleTabChange} />
        </div>
        {/* Lazy load Places screen - only mount when first visited */}
        {placesVisited && (
          <div style={{ display: currentPage === "places" ? "block" : "none", height: "100%" }}>
            <PlacesScreen onNavigate={handleTabChange} />
          </div>
        )}
      </div>

      {/* Tab navigation at bottom on mobile */}
      <TabNavigation currentTab={currentPage} onTabChange={handleTabChange} />
    </div>
  )
}
