"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, ArrowLeft, Save, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"

interface SeverityBadgeProps {
  level: "high" | "medium" | "low"
}

function SeverityBadge({ level }: SeverityBadgeProps) {
  const colors = {
    high: "bg-red-50 text-red-700 border-red-200",
    medium: "bg-amber-50 text-amber-700 border-amber-200",
    low: "bg-emerald-50 text-emerald-700 border-emerald-200",
  }

  const labels = {
    high: "Urgent",
    medium: "Moderate",
    low: "Low Priority",
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border-2 ${colors[level]}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${level === "high" ? "bg-red-500" : level === "medium" ? "bg-amber-500" : "bg-emerald-500"}`}
      />
      {labels[level]}
    </span>
  )
}

interface LikelihoodBadgeProps {
  percentage: number
}

function LikelihoodBadge({ percentage }: LikelihoodBadgeProps) {
  return (
    <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-primary/10 text-primary border border-primary/20">
      {percentage}% likely
    </span>
  )
}

function SkeletonLoader() {
  return (
    <div className="space-y-6 pb-32 px-6 pt-6">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-lg bg-muted/60 animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-6 w-32 rounded-lg bg-muted/60 animate-pulse" />
          <div className="h-4 w-24 rounded-lg bg-muted/60 animate-pulse" />
        </div>
      </div>

      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <div className="h-6 w-24 rounded-lg bg-muted/60 animate-pulse" />
          <div className="space-y-3">
            <div className="h-4 w-full rounded-lg bg-muted/60 animate-pulse" />
            <div className="h-4 w-5/6 rounded-lg bg-muted/60 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  )
}

interface AnalysisResultsProps {
  onNavigate?: (tab: "camera" | "results" | "chat" | "history") => void
}

export default function AnalysisResults({ onNavigate }: AnalysisResultsProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [expandedCauses, setExpandedCauses] = useState(false)

  useState(() => {
    const timer = setTimeout(() => setIsLoading(false), 2000)
    return () => clearTimeout(timer)
  }, [])

  if (isLoading) {
    return (
      <div className="flex h-screen w-full flex-col bg-background">
        <div className="flex-1 overflow-y-auto">
          <SkeletonLoader />
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen w-full flex-col bg-background">
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-md px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full hover:bg-muted"
              onClick={() => onNavigate?.("camera")}
              aria-label="Go back to camera"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-foreground">Analysis Complete</h1>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-5 px-6 pt-6 pb-6">
          {/* Scanned Photo and Severity */}
          <div className="flex items-start gap-4">
            <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-2xl border-2 border-border bg-muted shadow-sm">
              <img src="/car-engine-problem.jpg" alt="Scanned vehicle" className="h-full w-full object-cover" />
            </div>
            <div className="flex flex-1 flex-col justify-between py-1">
              <div className="mb-3">
                <h2 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Diagnosis</h2>
                <p className="text-lg font-bold text-foreground leading-snug">Engine trouble detected</p>
              </div>
              <SeverityBadge level="high" />
            </div>
          </div>

          {/* Diagnosis Card */}
          <div className="rounded-2xl border-2 border-border bg-card p-6 shadow-sm">
            <h3 className="mb-3 text-base font-bold text-card-foreground">Diagnosis</h3>
            <p className="text-sm leading-relaxed text-card-foreground/90">
              An issue with the engine fuel system has been detected. Possible fuel leak or faulty fuel injector.
              Immediate diagnostic and repair is required.
            </p>
          </div>

          {/* Possible Causes Card */}
          <div className="rounded-2xl border-2 border-border bg-card overflow-hidden shadow-sm">
            <button
              onClick={() => setExpandedCauses(!expandedCauses)}
              className="w-full flex items-center justify-between p-6 hover:bg-muted/50 transition-colors"
              aria-expanded={expandedCauses}
            >
              <h3 className="text-base font-bold text-card-foreground">Possible Causes</h3>
              {expandedCauses ? (
                <ChevronUp className="h-5 w-5 text-primary" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              )}
            </button>

            {expandedCauses && (
              <div className="space-y-4 border-t-2 border-border px-6 py-5 bg-muted/30">
                {[
                  { text: "Faulty pressure regulator", percentage: 65 },
                  { text: "Clogged fuel filter", percentage: 45 },
                  { text: "Defective fuel injector", percentage: 78 },
                ].map((cause, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-card-foreground">{cause.text}</p>
                    <span className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold bg-primary/15 text-primary border border-primary/30">
                      {cause.percentage}% likely
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recommendations Card */}
          <div className="rounded-2xl border-2 border-border bg-card p-6 shadow-sm">
            <h3 className="mb-5 text-base font-bold text-card-foreground">Recommendations</h3>
            <ol className="space-y-4">
              {[
                { step: "Consult with a specialist", urgency: "high" },
                { step: "Perform fuel system diagnostics", urgency: "high" },
                { step: "Replace fuel filter", urgency: "medium" },
              ].map((item, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground flex-shrink-0">
                    {idx + 1}
                  </span>
                  <div className="flex-1 flex flex-col gap-2 pt-0.5">
                    <span className="text-sm font-medium text-card-foreground">{item.step}</span>
                    <SeverityBadge level={item.urgency as "high" | "medium" | "low"} />
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Price Estimate Card */}
          <div className="rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 p-6 shadow-sm">
            <h3 className="mb-4 text-base font-bold text-card-foreground">Estimated Cost</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-primary">€1,200 - €2,800</span>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">Cost includes diagnostics and basic repair</p>
          </div>
        </div>
      </div>

      {/* Fixed Bottom Action Bar */}
      <div className="border-t-2 border-border bg-card px-6 py-4 safe-bottom shadow-lg">
        <div className="flex gap-3">
          <Button
            onClick={() => onNavigate?.("chat")}
            className="flex-1 gap-2 h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base shadow-sm"
          >
            <MessageSquare className="h-5 w-5" />
            Ask Question
          </Button>
          <Button
            variant="outline"
            className="flex-1 gap-2 h-12 bg-transparent border-2 font-semibold text-base hover:bg-muted"
          >
            <Save className="h-5 w-5" />
            Save
          </Button>
        </div>
      </div>
    </div>
  )
}
