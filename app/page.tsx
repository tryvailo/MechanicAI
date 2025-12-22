"use client"

import { useState } from "react"
import SplashScreen from "@/components/splash-screen"
import ResultsPage from "@/components/results-page"

// TODO: Set to true to re-enable splash screen
const SHOW_SPLASH_SCREEN = false

export default function Home() {
  const [showSplash, setShowSplash] = useState(SHOW_SPLASH_SCREEN)

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />
  }

  return <ResultsPage />
}
