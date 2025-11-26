"use client"

import { useState } from "react"
import SplashScreen from "@/components/splash-screen"
import ResultsPage from "@/components/results-page"

export default function Home() {
  const [showSplash, setShowSplash] = useState(true)

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />
  }

  return <ResultsPage />
}
