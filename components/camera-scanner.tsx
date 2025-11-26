"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Zap, ImageIcon, Mic, Camera, MicOff, Focus, Crosshair } from "lucide-react"

interface CameraScannerProps {
  onNavigate?: (tab: "camera" | "results" | "chat" | "history") => void
}

export default function CameraScanner({ onNavigate }: CameraScannerProps) {
  const [flashOn, setFlashOn] = useState(false)
  const [isCapturing, setIsCapturing] = useState(false)
  const [isRecording, setIsRecording] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)

  const handleCapture = () => {
    setIsCapturing(true)
    setTimeout(() => {
      setIsCapturing(false)
      onNavigate?.("results")
    }, 300)
  }

  const handleGallerySelect = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setTimeout(() => {
        onNavigate?.("results")
      }, 300)
    }
    event.target.value = ""
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop())
        onNavigate?.("chat")
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (error) {
      console.error("Error accessing microphone:", error)
      alert("Unable to access microphone. Please check your permissions.")
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const handleVoiceInput = () => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  const recentScans = [
    { id: 1, image: "/car-engine.jpg" },
    { id: 2, image: "/car-suspension.jpg" },
    { id: 3, image: "/car-brake-system.png" },
  ]

  return (
    <div className="relative h-full w-full bg-foreground">
      {/* Hidden file input for gallery selection */}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

      {/* Camera view area - fills available space above bottom sheet */}
      <div className="absolute inset-0 bottom-[260px]">
        <div className="h-full w-full overflow-hidden">
          <div className="h-full w-full bg-gradient-to-b from-neutral-900 via-neutral-800 to-neutral-900 relative">
            {/* Subtle vignette effect */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]" />
            {/* Center focus area with animated border */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative w-64 h-64 md:w-80 md:h-80">
                {/* Animated corner brackets */}
                <div className="absolute top-0 left-0 w-12 h-12 border-t-2 border-l-2 border-primary/80 rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-12 h-12 border-t-2 border-r-2 border-primary/80 rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-12 h-12 border-b-2 border-l-2 border-primary/80 rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-12 h-12 border-b-2 border-r-2 border-primary/80 rounded-br-lg" />
                {/* Crosshair in center */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <Crosshair className="w-8 h-8 text-primary/60 animate-pulse" strokeWidth={1} />
                </div>
                {/* Scanning line animation */}
                <div className="absolute inset-x-4 top-4 h-0.5 bg-gradient-to-r from-transparent via-primary/50 to-transparent animate-scan" />
              </div>
            </div>
            {/* Focus indicator text */}
            <div className="absolute bottom-8 left-0 right-0 flex justify-center">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/40 backdrop-blur-sm border border-white/10">
                <Focus className="w-4 h-4 text-primary" />
                <span className="text-xs text-white/80 font-medium">Point camera at the issue</span>
              </div>
            </div>
          </div>
        </div>
        {isCapturing && <div className="absolute inset-0 bg-white animate-fade-out z-20" />}
        {/* Top controls */}
        <div
          className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4"
          style={{ paddingTop: `calc(env(safe-area-inset-top, 12px) + 12px)` }}
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 rounded-full bg-black/30 backdrop-blur-md hover:bg-black/50 border border-white/10 transition-all duration-200"
            onClick={() => setFlashOn(!flashOn)}
          >
            <Zap
              className={`h-5 w-5 transition-colors duration-200 ${flashOn ? "fill-primary text-primary" : "text-white/90"}`}
            />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 rounded-full bg-black/30 backdrop-blur-md hover:bg-black/50 border border-white/10 transition-all duration-200"
            onClick={handleGallerySelect}
          >
            <ImageIcon className="h-5 w-5 text-white/90" />
          </Button>
        </div>
      </div>

      {/* Capture button - positioned above bottom sheet */}
      <div className="absolute bottom-[230px] left-0 right-0 z-30 flex justify-center">
        <button
          onClick={handleCapture}
          className={`relative group transition-all duration-200 active:scale-90 hover:scale-105 ${
            isCapturing ? "scale-90" : ""
          }`}
          style={{ width: "76px", height: "76px" }}
          aria-label="Capture diagnostic photo"
        >
          {/* Outer ring */}
          <div className="absolute inset-0 rounded-full border-4 border-white/90 shadow-lg" />
          {/* Inner button */}
          <div className="absolute inset-2 rounded-full bg-primary shadow-xl flex items-center justify-center group-hover:bg-primary/90 transition-colors">
            <Camera className="h-7 w-7 text-primary-foreground" strokeWidth={2} />
          </div>
          {/* Pulse animation */}
          <div className="absolute inset-2 rounded-full bg-primary opacity-50 animate-ping" />
        </button>
      </div>

      {/* Bottom sheet */}
      <div className="absolute bottom-0 left-0 right-0 z-20 rounded-t-3xl bg-card shadow-[0_-4px_30px_rgba(0,0,0,0.1)] border-t border-border/50">
        <div className="px-5 pt-4 pb-4">
          {/* Drag Handle */}
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted-foreground/20" />
          <h2 className="mb-1 text-xl font-semibold tracking-tight text-card-foreground">Photograph the issue</h2>
          <p className="mb-4 text-sm text-muted-foreground">Engine, suspension, body, electrical</p>
          <Button
            variant="outline"
            className={`mb-4 w-full gap-2 border rounded-xl bg-transparent py-5 text-sm font-medium transition-all ${
              isRecording
                ? "border-destructive bg-destructive/10 text-destructive hover:bg-destructive/20"
                : "border-border hover:bg-secondary hover:border-primary/50"
            }`}
            onClick={handleVoiceInput}
          >
            {isRecording ? (
              <>
                <MicOff className="h-4 w-4" />
                Tap to stop recording...
              </>
            ) : (
              <>
                <Mic className="h-4 w-4 text-primary" />
                Describe issue by voice
              </>
            )}
          </Button>
          {/* Recent Scans */}
          <div className="space-y-2">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Recent scans</h3>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {recentScans.map((scan) => (
                <button
                  key={scan.id}
                  className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl border border-border/50 bg-muted transition-all duration-200 hover:scale-105 hover:border-primary/50 hover:shadow-md active:scale-95"
                  aria-label={`Recent scan ${scan.id}`}
                  onClick={() => onNavigate?.("results")}
                >
                  <img
                    src={scan.image || "/placeholder.svg"}
                    alt={`Scan ${scan.id}`}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
