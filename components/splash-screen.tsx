"use client"

import { useState, useEffect } from "react"
import { Wrench, Camera, Mic, Brain } from "lucide-react"

interface SplashScreenProps {
  onComplete: () => void
}

interface FeatureBadge {
  icon: React.ReactNode
  animatedIcon: React.ReactNode
  label: string
  description: string
  delay: number
  themeColor: string
  glowColor: string
}

// Animated Camera Icon (lens focusing effect)
const AnimatedCamera = () => (
  <div className="relative">
    <Camera className="h-5 w-5 animate-[focus_2s_ease-in-out_infinite] origin-center" strokeWidth={2.5} />
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="w-2 h-2 rounded-full bg-current animate-[pulse_1.5s_ease-in-out_infinite] opacity-60" />
    </div>
  </div>
)

// Animated Mic Icon (waveform pulsing effect)
const AnimatedMic = () => (
  <div className="relative flex items-center justify-center">
    <Mic className="h-5 w-5 animate-[waveform_1.5s_ease-in-out_infinite]" strokeWidth={2.5} />
    <div className="absolute -left-1 flex gap-0.5">
      <div className="w-0.5 h-2 bg-current rounded-full animate-[waveformBar_1.5s_ease-in-out_infinite]" style={{ animationDelay: '0s' }} />
      <div className="w-0.5 h-3 bg-current rounded-full animate-[waveformBar_1.5s_ease-in-out_infinite]" style={{ animationDelay: '0.2s' }} />
      <div className="w-0.5 h-2 bg-current rounded-full animate-[waveformBar_1.5s_ease-in-out_infinite]" style={{ animationDelay: '0.4s' }} />
    </div>
    <div className="absolute -right-1 flex gap-0.5">
      <div className="w-0.5 h-2 bg-current rounded-full animate-[waveformBar_1.5s_ease-in-out_infinite]" style={{ animationDelay: '0.6s' }} />
      <div className="w-0.5 h-3 bg-current rounded-full animate-[waveformBar_1.5s_ease-in-out_infinite]" style={{ animationDelay: '0.8s' }} />
      <div className="w-0.5 h-2 bg-current rounded-full animate-[waveformBar_1.5s_ease-in-out_infinite]" style={{ animationDelay: '1s' }} />
    </div>
  </div>
)

// Animated Brain Icon (thinking/pulsing effect)
const AnimatedBrain = () => (
  <div className="relative">
    <Brain className="h-5 w-5 animate-[think_2s_ease-in-out_infinite]" strokeWidth={2.5} />
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="w-3 h-3 rounded-full border border-current animate-[thinkPulse_2s_ease-in-out_infinite] opacity-40" />
    </div>
  </div>
)

// Particle component for background
const Particle = ({ delay, duration, left, size }: { delay: number; duration: number; left: string; size: number }) => (
  <div
    className="absolute rounded-full bg-white/20 backdrop-blur-sm"
    style={{
      left,
      width: `${size}px`,
      height: `${size}px`,
      animation: `floatParticle ${duration}s ease-in-out infinite`,
      animationDelay: `${delay}s`,
    }}
  />
)

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [isFadingOut, setIsFadingOut] = useState(false)
  const [badgesVisible, setBadgesVisible] = useState(false)
  const [showDescriptions, setShowDescriptions] = useState(false)
  const [particles, setParticles] = useState<Array<{ delay: number; duration: number; left: string; size: number }>>([])

  const handleTap = () => {
    setIsFadingOut(true)
    setTimeout(() => {
      setIsVisible(false)
      onComplete()
    }, 500)
  }

  useEffect(() => {
    // Generate particles only on client side to avoid hydration mismatch
    setParticles(
      Array.from({ length: 20 }, (_, i) => ({
        delay: Math.random() * 5,
        duration: 8 + Math.random() * 4,
        left: `${Math.random() * 100}%`,
        size: 2 + Math.random() * 3,
      }))
    )

    // Show badges after logo animation starts
    const badgeTimer = setTimeout(() => {
      setBadgesVisible(true)
    }, 800)

    // Show descriptions after badges appear
    const descriptionTimer = setTimeout(() => {
      setShowDescriptions(true)
    }, 1500)

    // Auto-dismiss after 4 seconds if user doesn't tap
    const timer = setTimeout(() => {
      handleTap()
    }, 4000)

    return () => {
      clearTimeout(timer)
      clearTimeout(badgeTimer)
      clearTimeout(descriptionTimer)
    }
  }, [])

  if (!isVisible) return null

  const features: FeatureBadge[] = [
    {
      icon: <Camera className="h-5 w-5" strokeWidth={2.5} />,
      animatedIcon: <AnimatedCamera />,
      label: "GPT-4 Vision",
      description: "Photo Analysis",
      delay: 0,
      themeColor: "#3B82F6", // Blue
      glowColor: "rgba(59, 130, 246, 0.4)",
    },
    {
      icon: <Mic className="h-5 w-5" strokeWidth={2.5} />,
      animatedIcon: <AnimatedMic />,
      label: "Audio AI",
      description: "Voice Recognition",
      delay: 200,
      themeColor: "#10B981", // Green
      glowColor: "rgba(16, 185, 129, 0.4)",
    },
    {
      icon: <Brain className="h-5 w-5" strokeWidth={2.5} />,
      animatedIcon: <AnimatedBrain />,
      label: "Claude Analysis",
      description: "Smart Diagnostics",
      delay: 400,
      themeColor: "#8B5CF6", // Purple
      glowColor: "rgba(139, 92, 246, 0.4)",
    },
  ]


  return (
    <div
      onClick={handleTap}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center cursor-pointer transition-opacity duration-500 ${
        isFadingOut ? "opacity-0" : "opacity-100"
      }`}
      style={{
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {/* Animated Gradient Background - Orange Theme (darker for better contrast) */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, #c2410c 0%, #ea580c 25%, #c2410c 50%, #ea580c 75%, #c2410c 100%)',
          backgroundSize: '200% 200%',
          animation: 'gradient-shift 15s ease infinite',
        }}
      />
      {/* Dark overlay for better text contrast */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/30" />
      
      {/* Floating Particles Background */}
      {particles.length > 0 && (
        <div className="absolute inset-0 overflow-hidden">
          {particles.map((particle, i) => (
            <Particle key={i} {...particle} />
          ))}
        </div>
      )}

      {/* Main Content Container with Entrance Animation */}
      <div
        className={`relative z-10 flex flex-col items-center justify-center transition-all duration-700 ${
          badgesVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"
        }`}
      >
        {/* Animated Logo */}
        <div className="relative mb-6">
          {/* Pulsating glow effect - Orange */}
          <div className="absolute inset-0 animate-[ping_2s_ease-in-out_infinite]">
            <div className="h-32 w-32 rounded-full bg-orange-300/30 blur-xl" />
          </div>

          {/* Main logo with bounce animation */}
          <div className="relative animate-[bounce_2s_ease-in-out_infinite]">
            <div className="flex h-32 w-32 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm border-4 border-white/40 shadow-2xl">
              <Wrench className="h-16 w-16 text-white" strokeWidth={2.5} />
            </div>
          </div>

          {/* Rotating ring - Orange accent */}
          <div className="absolute inset-0 animate-spin" style={{ animationDuration: "3s" }}>
            <div className="h-32 w-32 rounded-full border-4 border-transparent border-t-orange-200/60" />
          </div>
        </div>

        {/* App Name */}
        <div className="relative mb-8 px-4">
          {/* Dark backdrop for better readability */}
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm rounded-2xl -mx-4 -my-2" />
          <h1 
            className="relative text-4xl md:text-5xl font-bold text-white tracking-tight text-center"
            style={{
              textShadow: '0 2px 8px rgba(0, 0, 0, 0.5), 0 4px 16px rgba(0, 0, 0, 0.3), 0 0 32px rgba(0, 0, 0, 0.2)',
            }}
          >
            AutoDoc Mechanic AI
          </h1>
        </div>

        {/* Feature Badges Section */}
        <div
          className={`w-full max-w-md px-6 mb-4 transition-all duration-700 ${
            badgesVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <div className="flex flex-wrap justify-center gap-3 md:gap-4">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group relative flex flex-col items-center"
                style={{
                  animation: `fadeInUp 0.6s ease-out ${feature.delay}ms both`,
                }}
              >
                {/* Glassmorphism badge */}
                <div 
                  className="relative flex items-center gap-2 px-4 py-2.5 rounded-full backdrop-blur-md border transition-all duration-300 hover:scale-105"
                  style={{
                    animation: `float 3s ease-in-out infinite`,
                    animationDelay: `${feature.delay}ms`,
                    backgroundColor: 'rgba(0, 0, 0, 0.4)',
                    borderColor: `${feature.themeColor}60`,
                    boxShadow: `0 8px 32px rgba(0, 0, 0, 0.4), 0 0 16px ${feature.glowColor}, inset 0 1px 0 rgba(255, 255, 255, 0.1)`,
                  }}
                >
                  {/* Animated icon with glow */}
                  <div className="relative" style={{ color: feature.themeColor }}>
                    <div className="absolute inset-0 blur-sm opacity-50">
                      {feature.animatedIcon}
                    </div>
                    <div className="relative" style={{ filter: `drop-shadow(0 0 6px ${feature.glowColor})` }}>
                      {feature.animatedIcon}
                    </div>
                  </div>
                  
                  {/* Badge text */}
                  <span 
                    className="text-sm md:text-base font-bold text-white tracking-tight whitespace-nowrap"
                    style={{
                      textShadow: '0 2px 4px rgba(0, 0, 0, 0.5), 0 0 8px rgba(0, 0, 0, 0.3)',
                    }}
                  >
                    {feature.label}
                  </span>

                  {/* Subtle glow border on hover */}
                  <div 
                    className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{
                      boxShadow: `0 0 20px ${feature.glowColor}, inset 0 0 20px ${feature.glowColor}20`,
                    }}
                  />
                </div>

                {/* Description text (appears below badge) */}
                <div
                  className={`mt-2 relative text-xs font-medium whitespace-nowrap transition-all duration-300 ${
                    showDescriptions ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
                  }`}
                  style={{ animationDelay: `${feature.delay + 600}ms` }}
                >
                  {/* Dark backdrop for description */}
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-sm rounded-full px-2 py-0.5 -mx-2 -my-0.5" />
                  <span 
                    className="relative text-white font-semibold"
                    style={{
                      textShadow: '0 1px 3px rgba(0, 0, 0, 0.6), 0 0 6px rgba(0, 0, 0, 0.4)',
                    }}
                  >
                    {feature.description}
                  </span>
                </div>

                {/* Pulse ring effect on hover */}
                <div 
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full rounded-full border-2 animate-[ping_2s_ease-in-out_infinite] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  style={{ 
                    animationDelay: `${feature.delay + 1000}ms`,
                    borderColor: `${feature.themeColor}60`,
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* AI-Powered Tagline */}
        <div
          className={`mb-8 relative transition-all duration-700 ${
            showDescriptions ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
          style={{ animationDelay: '800ms' }}
        >
          {/* Dark backdrop */}
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm rounded-full px-4 py-1 -mx-4 -my-1" />
          <p 
            className="relative text-white/90 text-xs font-medium tracking-widest uppercase"
            style={{
              textShadow: '0 1px 3px rgba(0, 0, 0, 0.6), 0 0 6px rgba(0, 0, 0, 0.4)',
            }}
          >
            AI-Powered
          </p>
        </div>

        {/* Loading Dots Animation */}
        <div
          className={`flex gap-1.5 mb-4 transition-all duration-700 ${
            showDescriptions ? "opacity-100" : "opacity-0"
          }`}
          style={{ animationDelay: '1000ms' }}
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-white/40 animate-[pulse_1.5s_ease-in-out_infinite]"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
      </div>

      {/* Subtle instruction text */}
      <div className="absolute bottom-12 left-0 right-0 flex justify-center z-10">
        <div className="animate-[pulse_1.5s_ease-in-out_infinite] relative">
          {/* Dark backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm rounded-full px-4 py-2 -mx-4 -my-2" />
          <p 
            className="relative text-white/90 text-xs font-medium"
            style={{
              textShadow: '0 1px 3px rgba(0, 0, 0, 0.6), 0 0 6px rgba(0, 0, 0, 0.4)',
            }}
          >
            Swipe or tap to continue
          </p>
        </div>
      </div>
    </div>
  )
}
