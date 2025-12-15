"use client"

import type React from "react"

import { useState, useRef, useEffect, useCallback } from "react"
import { Send, Mic, Camera, ArrowLeft, MicOff, X, ImageIcon, ScanLine, Circle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { useVinOcr, formatVinMessage } from "@/hooks/useVinOcr"
import { useTireAnalysis, formatTireAnalysisMessage } from "@/hooks/useTireAnalysis"

interface Message {
  id: string
  type: "user" | "assistant"
  content: string
  timestamp: Date
  image?: string
}

interface ChatInterfaceProps {
  onNavigate?: (page: "camera" | "results" | "chat" | "history") => void
  onImageSelect?: (image: string) => void
}

export default function ChatInterface({ onNavigate, onImageSelect }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      type: "assistant",
      content: "Hello! I'm your AutoDoc AI mechanic. How can I help you today with your vehicle?",
      timestamp: new Date(Date.now() - 10 * 60000),
    },
    {
      id: "2",
      type: "user",
      content: "My engine is making a strange knocking sound",
      timestamp: new Date(Date.now() - 8 * 60000),
    },
    {
      id: "3",
      type: "assistant",
      content:
        "Engine knocking can have several causes. Is the sound louder when accelerating or at idle? Also, when did you first notice it?",
      timestamp: new Date(Date.now() - 7 * 60000),
    },
  ])

  const [input, setInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [showImagePicker, setShowImagePicker] = useState(false)
  const [isVinScanMode, setIsVinScanMode] = useState(false)
  const [isTireScanMode, setIsTireScanMode] = useState(false)
  
  const { isLoading: isVinScanning, scanVin } = useVinOcr()
  const { isLoading: isTireAnalyzing, analyzeTire } = useTireAnalysis()

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const suggestedQuestions = [
    "What does this warning light mean?",
    "Analyze damage in my photo",
    "Check my tire condition",
    "When should I change oil?",
  ]

  useEffect(() => {
    const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }
    scrollToBottom()
  }, [messages])

  const handleInputFocus = useCallback(() => {
    // Scroll input into view when keyboard opens
    setTimeout(() => {
      inputRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
    }, 300)
  }, [])

  const handleSendMessage = async () => {
    if (!input.trim() && !selectedImage) return

    const userMessage = input.trim()
    const imageToAnalyze = selectedImage
    
    // Create user message content - include image reference if present
    const messageContent = userMessage || (imageToAnalyze ? "Please analyze this image" : "")
    
    const newMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: messageContent,
      timestamp: new Date(),
      image: imageToAnalyze || undefined,
    }

    setMessages((prev) => [...prev, newMessage])
    const currentInput = input
    setInput("")
    setSelectedImage(null)
    setIsTyping(true)

    try {
      let diagnosticSummary: string | undefined = undefined

      // If image is provided, analyze it first
      if (imageToAnalyze) {
        try {
          console.log('Analyzing image...')
          
          // Convert base64 data URL to File for API
          // Extract base64 data and mime type
          const base64Data = imageToAnalyze.includes(',') 
            ? imageToAnalyze.split(',')[1] 
            : imageToAnalyze
          const mimeMatch = imageToAnalyze.match(/data:([^;]+)/)
          const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg'
          const extension = mimeType.includes('png') ? 'png' : 'jpg'
          
          // Convert base64 to binary
          const byteCharacters = atob(base64Data)
          const byteNumbers = new Array(byteCharacters.length)
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i)
          }
          const byteArray = new Uint8Array(byteNumbers)
          const blob = new Blob([byteArray], { type: mimeType })
          const file = new File([blob], `image.${extension}`, { type: mimeType })

          // Send to analyze-photo API
          const analyzeFormData = new FormData()
          analyzeFormData.append('image', file)
          if (currentInput.trim()) {
            analyzeFormData.append('description', currentInput)
          }

          console.log('Sending to analyze-photo API...')
          const analyzeResponse = await fetch('/api/analyze-photo', {
            method: 'POST',
            body: analyzeFormData,
          })

          if (analyzeResponse.ok) {
            const analyzeData = await analyzeResponse.json()
            console.log('Analysis result:', analyzeData)
            
            // Create comprehensive summary from analysis
            // Format it clearly for the LLM to understand
            const causesText = Array.isArray(analyzeData.causes) && analyzeData.causes.length > 0
              ? analyzeData.causes.join(', ')
              : 'Unable to determine specific causes'
            
            const recommendationsText = Array.isArray(analyzeData.recommendations) && analyzeData.recommendations.length > 0
              ? analyzeData.recommendations.join(', ')
              : 'General diagnostic recommended'
            
            diagnosticSummary = `The user uploaded a photo that was analyzed by AI vision. Here are the analysis results:

DIAGNOSIS: ${analyzeData.diagnosis || 'No specific diagnosis available'}
SEVERITY LEVEL: ${analyzeData.severity || 'unknown'}
POSSIBLE CAUSES: ${causesText}
RECOMMENDATIONS: ${recommendationsText}
DETAILED SUMMARY: ${analyzeData.summary || analyzeData.diagnosis || 'Image was analyzed but no specific issues were identified'}

IMPORTANT: You can see and understand what's in the photo through this analysis. When the user asks about the image, dashboard, warning lights, or what you see, use this diagnostic information to provide accurate answers.`
          } else {
            const errorData = await analyzeResponse.json().catch(() => ({}))
            console.error('Analysis API error:', errorData)
          }
        } catch (analyzeError) {
          console.error('Photo analysis error:', analyzeError)
          // Continue with chat even if analysis fails
        }
      }

      // Prepare messages for API (convert to API format)
      // Use current messages state + new message
      const allMessages = [...messages, newMessage]
      const apiMessages = allMessages
        .filter((msg) => msg.content && msg.content.trim()) // Filter out empty messages
        .map((msg) => ({
          role: msg.type === "user" ? "user" : "assistant",
          content: msg.content,
        }))

      // If we have image but no user message, add context about the image
      if (imageToAnalyze && !currentInput.trim()) {
        apiMessages[apiMessages.length - 1].content = "Please analyze the image I uploaded and tell me what you see, especially any warning lights or indicators on the dashboard."
      }

      console.log('Sending to chat API with diagnosticSummary:', diagnosticSummary ? 'Yes' : 'No')
      
      // Call chat API with diagnostic summary if available
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: apiMessages,
          diagnosticSummary: diagnosticSummary,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to get response")
      }

      const data = await response.json()
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: data.reply || "I'm sorry, I couldn't process your request.",
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      console.error("Chat error:", error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: error instanceof Error 
          ? `Sorry, I encountered an error: ${error.message}` 
          : "Sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsTyping(false)
    }

    if (inputRef.current) {
      inputRef.current.style.height = "auto"
    }
  }

  const handleSuggestedQuestion = (question: string) => {
    setInput(question)
    setTimeout(() => {
      inputRef.current?.focus()
    }, 0)
  }

  const adjustTextareaHeight = () => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto"
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 100) + "px"
    }
  }

  // Get supported mimeType for MediaRecorder
  const getSupportedMimeType = () => {
    const mimeTypes = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg',
      'audio/wav'
    ]
    return mimeTypes.find(type => MediaRecorder.isTypeSupported(type)) || ''
  }

  // Primary: Use Gemini API for transcription
  const transcribeWithGemini = async (audioBlob: Blob): Promise<{ text: string; fallback?: boolean }> => {
    const formData = new FormData()
    const extension = audioBlob.type.includes('webm') ? 'webm' : 
                      audioBlob.type.includes('mp4') ? 'mp4' : 
                      audioBlob.type.includes('ogg') ? 'ogg' : 'wav'
    formData.append('audio', audioBlob, `recording.${extension}`)

    const response = await fetch('/api/transcribe-gemini', {
      method: 'POST',
      body: formData,
    })

    const data = await response.json()
    
    if (!response.ok) {
      if (data.fallback) {
        throw new Error('FALLBACK_TO_WHISPER')
      }
      throw new Error(data.error || 'Transcription failed')
    }

    return { text: data.text || '' }
  }

  // Fallback: Use Whisper API for transcription
  const transcribeWithWhisper = async (audioBlob: Blob): Promise<string> => {
    const formData = new FormData()
    const extension = audioBlob.type.includes('webm') ? 'webm' : 
                      audioBlob.type.includes('mp4') ? 'mp4' : 
                      audioBlob.type.includes('ogg') ? 'ogg' : 'wav'
    formData.append('audio', audioBlob, `recording.${extension}`)

    const response = await fetch('/api/transcribe', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || 'Transcription failed')
    }

    const data = await response.json()
    return data.text || ''
  }

  // Start recording audio
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = getSupportedMimeType()
      
      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop())
        
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType || 'audio/webm' })
        
        setInput((prev) => prev + " [Transcribing...]")
        setIsTyping(true)

        try {
          // Try Gemini first
          const result = await transcribeWithGemini(audioBlob)
          setInput((prev) => {
            const withoutPlaceholder = prev.replace(' [Transcribing...]', '')
            return withoutPlaceholder + (result.text ? ` ${result.text}` : '')
          })
        } catch (error) {
          // If Gemini fails with fallback flag, try Whisper
          if (error instanceof Error && error.message === 'FALLBACK_TO_WHISPER') {
            console.log('Gemini unavailable, falling back to Whisper...')
            try {
              const whisperText = await transcribeWithWhisper(audioBlob)
              setInput((prev) => {
                const withoutPlaceholder = prev.replace(' [Transcribing...]', '')
                return withoutPlaceholder + (whisperText ? ` ${whisperText}` : '')
              })
            } catch (whisperError) {
              console.error('Whisper fallback error:', whisperError)
              const errorMessage = whisperError instanceof Error ? whisperError.message : 'Transcription failed'
              const userMessage = errorMessage.includes('API key not configured')
                ? ' [Voice transcription is not configured.]'
                : ' [Voice transcription failed. Please type your message.]'
              
              setInput((prev) => {
                const withoutPlaceholder = prev.replace(' [Transcribing...]', '')
                return withoutPlaceholder + userMessage
              })
            }
          } else {
            console.error('Transcription error:', error)
            setInput((prev) => {
              const withoutPlaceholder = prev.replace(' [Transcribing...]', '')
              return withoutPlaceholder + ' [Voice transcription failed. Please type your message.]'
            })
          }
        } finally {
          setIsTyping(false)
          audioChunksRef.current = []
        }
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

  const handlePhotoSelect = () => {
    setShowImagePicker(true)
  }

  const handleTakePhoto = () => {
    setShowImagePicker(false)
    setTimeout(() => {
      cameraInputRef.current?.click()
    }, 100)
  }

  const handleChooseFromGallery = () => {
    setShowImagePicker(false)
    setTimeout(() => {
      fileInputRef.current?.click()
    }, 100)
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        const imageData = reader.result as string
        setSelectedImage(imageData)
        // Image stays in chat, no navigation to Scan tab
      }
      reader.readAsDataURL(file)
    }
    event.target.value = ""
  }

  const handleCameraChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = async () => {
        const imageData = reader.result as string
        
        if (isVinScanMode) {
          // VIN scanning mode - process the image for VIN
          setIsVinScanMode(false)
          setIsTyping(true)
          
          // Add user message showing they're scanning VIN
          const scanMessage: Message = {
            id: Date.now().toString(),
            type: "user",
            content: "📷 Scanning VIN code...",
            timestamp: new Date(),
            image: imageData,
          }
          setMessages(prev => [...prev, scanMessage])
          
          try {
            const vinResult = await scanVin(imageData)
            
            if (vinResult) {
              // VIN detected successfully
              const vinMessage = formatVinMessage(vinResult)
              const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                type: "assistant",
                content: vinMessage + "\n\nI've detected your vehicle information. How can I help you with this car?",
                timestamp: new Date(),
              }
              setMessages(prev => [...prev, assistantMessage])
            } else {
              // VIN not detected
              const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                type: "assistant",
                content: "❌ **VIN not detected**\n\nI couldn't find a valid VIN code in the image. Please try:\n\n1. 📍 **Door jamb** - Open driver's door, check the sticker\n2. 🚗 **Windshield** - Look at the bottom-left corner from outside\n3. 📄 **Registration** - Check your vehicle registration document\n4. 💡 **Better lighting** - Ensure the VIN is clearly visible\n\nWould you like to try again?",
                timestamp: new Date(),
              }
              setMessages(prev => [...prev, errorMessage])
            }
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error'
            const errorMessage: Message = {
              id: (Date.now() + 1).toString(),
              type: "assistant",
              content: `❌ **VIN scan failed:** ${errorMsg}\n\nPlease try again with a clearer photo.`,
              timestamp: new Date(),
            }
            setMessages(prev => [...prev, errorMessage])
          } finally {
            setIsTyping(false)
          }
        } else if (isTireScanMode) {
          // Tire analysis mode
          setIsTireScanMode(false)
          setIsTyping(true)
          
          const scanMessage: Message = {
            id: Date.now().toString(),
            type: "user",
            content: "🛞 Analyzing tire condition...",
            timestamp: new Date(),
            image: imageData,
          }
          setMessages(prev => [...prev, scanMessage])
          
          try {
            const tireResult = await analyzeTire(imageData)
            
            if (tireResult) {
              const tireMessage = formatTireAnalysisMessage(tireResult)
              const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                type: "assistant",
                content: tireMessage,
                timestamp: new Date(),
              }
              setMessages(prev => [...prev, assistantMessage])
            } else {
              const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                type: "assistant",
                content: "❌ **Tire analysis failed**\n\nI couldn't analyze the tire in this image. Please try:\n\n1. 📸 **Tread photo** - Take a photo directly above the tire tread\n2. 💡 **Good lighting** - Ensure the tire is well-lit\n3. 🔍 **Close-up** - Get close enough to see the tread pattern clearly\n4. 🧹 **Clean tire** - Remove dirt or debris for better visibility\n\nWould you like to try again?",
                timestamp: new Date(),
              }
              setMessages(prev => [...prev, errorMessage])
            }
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error'
            const errorMessage: Message = {
              id: (Date.now() + 1).toString(),
              type: "assistant",
              content: `❌ **Tire analysis error:** ${errorMsg}\n\nPlease try again with a clearer photo.`,
              timestamp: new Date(),
            }
            setMessages(prev => [...prev, errorMessage])
          } finally {
            setIsTyping(false)
          }
        } else {
          // Normal image mode
          setSelectedImage(imageData)
        }
      }
      reader.readAsDataURL(file)
    }
    event.target.value = ""
  }

  const removeSelectedImage = () => {
    setSelectedImage(null)
  }

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Header - fixed height */}
      <div className="flex items-center gap-4 px-4 py-3 border-b border-border bg-card shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full hover:bg-muted"
          onClick={() => onNavigate("results")}
          aria-label="Go back to results"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold text-foreground">Chat with AI</h1>
      </div>

      {/* Messages Area - scrollable, takes remaining space */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`flex gap-2 max-w-[85%] ${message.type === "user" ? "flex-row-reverse" : ""}`}>
              {message.type === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11z" />
                  </svg>
                </div>
              )}
              <div
                className={`rounded-2xl px-3 py-2.5 ${
                  message.type === "user"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-muted text-foreground rounded-bl-sm"
                }`}
              >
                {message.image && (
                  <img
                    src={message.image || "/placeholder.svg"}
                    alt="Uploaded"
                    className="max-w-full h-auto rounded-lg mb-2 max-h-40 object-cover"
                  />
                )}
                <div className="text-sm leading-relaxed markdown-content">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({ children }) => {
                        const text = String(children);
                        if (text.startsWith('📚')) {
                          return <p className="mb-2 mt-4 pt-3 border-t border-border/50 text-muted-foreground text-xs whitespace-pre-wrap break-words">{children}</p>;
                        }
                        return <p className="mb-2.5 last:mb-0 whitespace-pre-wrap break-words">{children}</p>;
                      },
                      ul: ({ children }) => <ul className="list-disc list-outside mb-3 space-y-1.5 ml-4 pl-1">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal list-outside mb-3 space-y-1.5 ml-4 pl-1">{children}</ol>,
                      li: ({ children }) => <li className="leading-relaxed pl-1">{children}</li>,
                      strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                      em: ({ children }) => <em className="italic">{children}</em>,
                      h1: ({ children }) => <h1 className="text-base font-semibold mb-2 mt-3 first:mt-0">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-sm font-semibold mb-2 mt-3 first:mt-0">{children}</h2>,
                      h3: ({ children }) => <h3 className="text-sm font-semibold mb-1.5 mt-2 first:mt-0">{children}</h3>,
                      code: ({ children, className }) => {
                        const isInline = !className
                        return isInline ? (
                          <code className="bg-muted/80 px-1.5 py-0.5 rounded text-xs font-mono break-all">{children}</code>
                        ) : (
                          <code className="block bg-muted/80 p-2 rounded text-xs font-mono overflow-x-auto mb-2 whitespace-pre">{children}</code>
                        )
                      },
                      blockquote: ({ children }) => <blockquote className="border-l-2 border-muted-foreground/30 pl-3 ml-2 italic my-2">{children}</blockquote>,
                      a: ({ href, children }) => (
                        <a 
                          href={href} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
                        >
                          {children}
                        </a>
                      ),
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
                <p
                  className={`text-[10px] mt-1.5 ${
                    message.type === "user" ? "text-primary-foreground/70" : "text-muted-foreground"
                  }`}
                >
                  {message.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="flex gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11z" />
                </svg>
              </div>
              <div className="rounded-2xl px-3 py-2.5 bg-muted rounded-bl-sm">
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0s" }} />
                  <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0.15s" }} />
                  <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0.3s" }} />
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested questions - fixed height */}
      {messages.length < 5 && (
        <div className="px-4 py-3 border-t border-border bg-muted/30 shrink-0">
          <p className="text-[10px] font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
            Suggested questions
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {suggestedQuestions.map((question, index) => (
              <button
                key={index}
                onClick={() => handleSuggestedQuestion(question)}
                className="px-3 py-1.5 text-xs whitespace-nowrap rounded-full bg-card text-foreground hover:bg-primary hover:text-primary-foreground transition-all flex-shrink-0 border border-border font-medium"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Hidden file input for gallery */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Hidden file input for camera */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleCameraChange}
      />

      {/* Image picker dialog */}
      <Dialog open={showImagePicker} onOpenChange={setShowImagePicker}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select Image</DialogTitle>
            <DialogDescription>
              Choose how you want to add an image
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-4">
            <Button
              onClick={handleTakePhoto}
              className="w-full h-14 flex items-center justify-start gap-3 text-left"
              variant="outline"
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                <Camera className="h-5 w-5 text-primary" />
              </div>
              <div className="flex flex-col items-start">
                <span className="font-semibold">Take Photo</span>
                <span className="text-xs text-muted-foreground">Use your camera to capture a new photo</span>
              </div>
            </Button>
            <Button
              onClick={handleChooseFromGallery}
              className="w-full h-14 flex items-center justify-start gap-3 text-left"
              variant="outline"
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                <ImageIcon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex flex-col items-start">
                <span className="font-semibold">Choose from Gallery</span>
                <span className="text-xs text-muted-foreground">Select an existing photo from your device</span>
              </div>
            </Button>
            
            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Quick Analysis Tools</span>
              </div>
            </div>
            
            <Button
              onClick={() => {
                setIsVinScanMode(true);
                setShowImagePicker(false);
                setTimeout(() => cameraInputRef.current?.click(), 100);
              }}
              className="w-full h-14 flex items-center justify-start gap-3 text-left border-2 border-dashed border-emerald-500/50 hover:border-emerald-500 hover:bg-emerald-500/5"
              variant="outline"
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-500/10">
                <ScanLine className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="flex flex-col items-start">
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">Scan VIN Code</span>
                <span className="text-xs text-muted-foreground">Take a photo of VIN sticker to auto-detect vehicle</span>
              </div>
            </Button>
            
            <Button
              onClick={() => {
                setIsTireScanMode(true);
                setShowImagePicker(false);
                setTimeout(() => cameraInputRef.current?.click(), 100);
              }}
              className="w-full h-14 flex items-center justify-start gap-3 text-left border-2 border-dashed border-amber-500/50 hover:border-amber-500 hover:bg-amber-500/5"
              variant="outline"
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-500/10">
                <Circle className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex flex-col items-start">
                <span className="font-semibold text-amber-700 dark:text-amber-400">Analyze Tire Wear</span>
                <span className="text-xs text-muted-foreground">Check tread depth, wear pattern & safety score</span>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Selected image preview */}
      {selectedImage && (
        <div className="px-4 py-2 border-t border-border bg-card shrink-0">
          <div className="relative inline-block">
            <img
              src={selectedImage || "/placeholder.svg"}
              alt="Selected"
              className="h-16 w-16 object-cover rounded-lg border border-border"
            />
            <button
              onClick={removeSelectedImage}
              className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
              aria-label="Remove image"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Input bar - fixed at bottom, always visible */}
      <div
        className="border-t border-border bg-card px-4 py-3 shrink-0"
        style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="flex gap-2 items-end">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 flex-shrink-0 rounded-full hover:bg-muted"
            onClick={handlePhotoSelect}
            aria-label="Upload photo"
          >
            <Camera className="h-5 w-5 text-muted-foreground" />
          </Button>

          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              data-gramm="false"
              data-gramm_editor="false"
              data-enable-grammarly="false"
              onChange={(e) => {
                setInput(e.target.value)
                adjustTextareaHeight()
              }}
              onFocus={handleInputFocus}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage()
                }
              }}
              placeholder="Describe the issue..."
              className="w-full resize-none rounded-2xl border border-border bg-muted text-foreground px-4 py-2.5 pr-12 text-sm placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
              rows={1}
              style={{ maxHeight: "100px" }}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!input.trim() && !selectedImage}
              size="icon"
              className="absolute right-1.5 bottom-1.5 h-7 w-7 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              aria-label="Send message"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className={`h-10 w-10 flex-shrink-0 rounded-full transition-all ${
              isRecording
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90 animate-pulse"
                : "hover:bg-muted"
            }`}
            onClick={handleVoiceInput}
            aria-label={isRecording ? "Stop recording" : "Voice input"}
          >
            {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5 text-muted-foreground" />}
          </Button>
        </div>
      </div>
    </div>
  )
}
