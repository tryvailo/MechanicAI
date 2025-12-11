'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useDashboardMechanic, SessionStatus, SessionMode } from '@/hooks/useDashboardMechanic';
import { Camera, Upload, Mic } from 'lucide-react';

const STATUS_TEXT: Record<SessionStatus, string> = {
  idle: 'Ready to start',
  connecting: 'Connecting to AI...',
  connected: 'Setting up...',
  listening: 'Listening',
  error: 'Connection error',
};

const STATUS_COLORS: Record<SessionStatus, string> = {
  idle: 'bg-zinc-800',
  connecting: 'bg-amber-600',
  connected: 'bg-blue-600',
  listening: 'bg-emerald-600',
  error: 'bg-red-600',
};

// Language detection from text (simple heuristic)
const detectLanguage = (text: string): string => {
  if (!text) return '';
  
  // Russian characters
  if (/[а-яА-ЯёЁ]/.test(text)) return 'RU';
  // German characters
  if (/[äöüÄÖÜß]/.test(text)) return 'DE';
  // Spanish/French/Italian
  if (/[àáâãäåæçèéêëìíîïñòóôõöùúûüý]/.test(text)) return 'ES';
  // Default to English
  return 'EN';
};

export default function ScanPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<SessionMode>('stream');
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [detectedLanguage, setDetectedLanguage] = useState<string>('');

  const {
    isConnected,
    status,
    errorMessage,
    startSession,
    stopSession,
    sendStaticImage,
  } = useDashboardMechanic(videoRef, mode);

  // Setup camera for stream mode
  const setupCamera = useCallback(async () => {
    if (mode !== 'stream') return;

    try {
      // Stop any existing stream first
      if (videoRef.current?.srcObject) {
        const existingStream = videoRef.current.srcObject as MediaStream;
        existingStream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      if (mode !== 'stream' || !videoRef.current) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }

      videoRef.current.srcObject = stream;
      
      await new Promise<void>((resolve, reject) => {
        if (!videoRef.current) {
          reject(new Error('Video element not available'));
          return;
        }

        const video = videoRef.current;
        const onLoadedMetadata = () => {
          video.removeEventListener('loadedmetadata', onLoadedMetadata);
          resolve();
        };

        const onError = () => {
          video.removeEventListener('error', onError);
          reject(new Error('Video load error'));
        };

        video.addEventListener('loadedmetadata', onLoadedMetadata);
        video.addEventListener('error', onError);

        setTimeout(() => {
          video.removeEventListener('loadedmetadata', onLoadedMetadata);
          video.removeEventListener('error', onError);
          resolve();
        }, 2000);
      });

      if (mode !== 'stream' || !videoRef.current) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }

      try {
        await videoRef.current.play();
      } catch (playError: any) {
        if (playError?.name !== 'AbortError' && playError?.name !== 'NotAllowedError') {
          throw playError;
        }
      }

      if (mode === 'stream' && videoRef.current) {
        setCameraReady(true);
        setCameraError(null);
      }
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        return;
      }
      console.error('Camera error:', error);
      if (mode === 'stream') {
        setCameraError('Unable to access camera. Please grant permission.');
        setCameraReady(false);
      }
    }
  }, [mode]);

  // Cleanup camera when switching modes
  useEffect(() => {
    let isMounted = true;

    if (mode === 'stream') {
      setupCamera();
    } else {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
      if (isMounted) {
        setCameraReady(false);
        setCameraError(null);
      }
    }

    return () => {
      isMounted = false;
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
      }
    };
  }, [mode, setupCamera]);

  // Handle file selection
  const handleFileSelect = useCallback((file: File | null) => {
    if (!file || !file.type.startsWith('image/')) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setSelectedImage(result);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    handleFileSelect(file);
  }, [handleFileSelect]);

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0] || null;
    handleFileSelect(file);
  }, [handleFileSelect]);

  // Analyze static image
  const handleAnalyzePhoto = useCallback(async () => {
    if (!selectedImage) return;
    await startSession();
  }, [selectedImage, startSession]);

  // Send image when session becomes active in static mode
  useEffect(() => {
    if (mode === 'static' && status === 'listening' && selectedImage) {
      sendStaticImage(selectedImage);
    }
  }, [mode, status, selectedImage, sendStaticImage]);

  const handleToggleSession = useCallback(() => {
    if (isConnected) {
      stopSession();
      setDetectedLanguage('');
    } else {
      if (mode === 'stream') {
        startSession();
      } else if (mode === 'static' && selectedImage) {
        handleAnalyzePhoto();
      }
    }
  }, [isConnected, mode, selectedImage, startSession, stopSession, handleAnalyzePhoto]);

  // Monitor console logs for language detection (simple approach)
  useEffect(() => {
    const originalLog = console.log;
    console.log = (...args: any[]) => {
      originalLog(...args);
      const message = args.join(' ');
      if (message.includes('[Gemini Response]:')) {
        const text = message.replace('[Gemini Response]:', '').trim();
        const lang = detectLanguage(text);
        if (lang) {
          setDetectedLanguage(lang);
        }
      }
    };

    return () => {
      console.log = originalLog;
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      {/* Status Bar */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4 safe-area-top">
        <div className={`
          inline-flex items-center gap-2 px-4 py-2 rounded-full
          ${STATUS_COLORS[status]} bg-opacity-90 backdrop-blur-sm
          text-white text-sm font-medium shadow-lg
        `}>
          {status === 'listening' && (
            <>
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
              </span>
              <Mic className="h-4 w-4" />
              {detectedLanguage && (
                <span className="ml-1 text-xs opacity-90">({detectedLanguage})</span>
              )}
            </>
          )}
          {status === 'connecting' && (
            <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          )}
          {STATUS_TEXT[status]}
        </div>
        
        {errorMessage && (
          <div className="mt-2 px-4 py-2 bg-red-600 bg-opacity-90 rounded-lg text-white text-sm">
            {errorMessage}
          </div>
        )}
      </div>

      {/* Mode Toggle Header */}
      <div className="absolute top-20 left-0 right-0 z-20 px-4 safe-area-top">
        <div className="flex gap-2 bg-zinc-900/80 backdrop-blur-sm rounded-lg p-1">
          <button
            onClick={() => {
              if (isConnected) stopSession();
              setMode('stream');
              setSelectedImage(null);
            }}
            className={`
              flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md
              transition-all duration-200 font-medium text-sm
              ${mode === 'stream'
                ? 'bg-[#21808D] text-white shadow-md'
                : 'text-zinc-400 hover:text-white'
              }
            `}
          >
            <Camera className="w-4 h-4" />
            Live Camera
          </button>
          <button
            onClick={() => {
              if (isConnected) stopSession();
              setMode('static');
            }}
            className={`
              flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md
              transition-all duration-200 font-medium text-sm
              ${mode === 'static'
                ? 'bg-[#21808D] text-white shadow-md'
                : 'text-zinc-400 hover:text-white'
              }
            `}
          >
            <Upload className="w-4 h-4" />
            Upload Photo
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 relative overflow-hidden mt-32">
        {mode === 'stream' ? (
          // Live Camera Mode
          <>
            {cameraError ? (
              <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
                <div className="text-center p-6">
                  <div className="text-5xl mb-4">📷</div>
                  <p className="text-white text-lg mb-4">{cameraError}</p>
                  <button
                    onClick={setupCamera}
                    className="px-6 py-3 bg-[#21808D] hover:bg-[#1a6b75] text-white rounded-xl font-medium transition-colors"
                  >
                    Retry Camera Access
                  </button>
                </div>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="absolute inset-0 w-full h-full object-cover"
                />
                
                {/* Scanning Overlay */}
                {status === 'listening' && (
                  <div className="absolute inset-0 pointer-events-none">
                    {/* Corner brackets */}
                    <div className="absolute top-8 left-8 w-16 h-16 border-l-4 border-t-4 border-[#21808D] rounded-tl-lg opacity-80" />
                    <div className="absolute top-8 right-8 w-16 h-16 border-r-4 border-t-4 border-[#21808D] rounded-tr-lg opacity-80" />
                    <div className="absolute bottom-32 left-8 w-16 h-16 border-l-4 border-b-4 border-[#21808D] rounded-bl-lg opacity-80" />
                    <div className="absolute bottom-32 right-8 w-16 h-16 border-r-4 border-b-4 border-[#21808D] rounded-br-lg opacity-80" />
                    
                    {/* Scan line animation */}
                    <div className="absolute left-8 right-8 top-8 bottom-32 overflow-hidden">
                      <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#21808D] to-transparent animate-scan" />
                    </div>
                  </div>
                )}

                {/* Camera loading state */}
                {!cameraReady && (
                  <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
                    <div className="text-center">
                      <div className="animate-pulse text-5xl mb-4">📷</div>
                      <p className="text-zinc-400">Starting camera...</p>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          // Upload Photo Mode
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 p-4">
            {selectedImage ? (
              <div className="w-full h-full flex flex-col items-center justify-center">
                <div className="relative w-full max-w-2xl aspect-video mb-4 rounded-lg overflow-hidden border-2 border-zinc-700 shadow-xl">
                  <img
                    src={selectedImage}
                    alt="Selected photo"
                    className="w-full h-full object-contain bg-black"
                  />
                </div>
                <button
                  onClick={() => {
                    setSelectedImage(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                  className="px-4 py-2 text-zinc-400 hover:text-white text-sm transition-colors"
                >
                  Choose Different Photo
                </button>
              </div>
            ) : (
              <div
                className={`
                  w-full max-w-md border-2 border-dashed rounded-xl p-8
                  transition-colors cursor-pointer
                  ${isDragging 
                    ? 'border-[#21808D] bg-[#21808D]/10' 
                    : 'border-zinc-700 hover:border-zinc-600'
                  }
                `}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                <div className="text-center">
                  <Upload className="mx-auto h-16 w-16 text-zinc-500 mb-4" />
                  <p className="text-white text-lg font-medium mb-2">
                    Drop a photo here or click to select
                  </p>
                  <p className="text-zinc-400 text-sm">
                    Upload a screenshot of dashboard or error code
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Control Bar */}
      <div className="relative z-10 bg-gradient-to-t from-black via-black/90 to-transparent pt-8 pb-safe">
        <div className="px-6 pb-6">
          {/* Instructions */}
          <p className="text-center text-zinc-400 text-sm mb-4">
            {mode === 'stream' 
              ? (isConnected 
                  ? 'Point at dashboard warning lights and ask questions'
                  : 'Point your camera at the car dashboard'
                )
              : (selectedImage
                  ? (isConnected
                      ? 'Ask questions about the photo - microphone is active'
                      : 'Ready to analyze this photo'
                    )
                  : 'Upload a photo to get started'
                )
            }
          </p>

          {/* Main Button */}
          <button
            onClick={handleToggleSession}
            disabled={
              (mode === 'stream' && !cameraReady) ||
              (mode === 'static' && !selectedImage) ||
              status === 'connecting'
            }
            className={`
              w-full py-4 px-6 rounded-2xl font-semibold text-lg
              transition-all duration-300 transform active:scale-95
              disabled:opacity-50 disabled:cursor-not-allowed
              flex items-center justify-center gap-3
              ${isConnected 
                ? 'bg-red-600 hover:bg-red-700 text-white' 
                : 'bg-[#21808D] hover:bg-[#1a6b75] text-white'
              }
              shadow-lg shadow-black/30
            `}
          >
            {isConnected ? (
              <>
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                </svg>
                Stop Diagnostics
              </>
            ) : mode === 'static' ? (
              <>
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                Analyze Photo
              </>
            ) : (
              <>
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Start Diagnostics
              </>
            )}
          </button>

          {/* Hint */}
          {!isConnected && (
            <p className="text-center text-zinc-500 text-xs mt-3">
              {mode === 'stream'
                ? 'AI will analyze dashboard and respond to your voice questions'
                : 'AI will analyze the photo and respond to your voice questions'
              }
            </p>
          )}
        </div>
      </div>

      {/* Custom styles */}
      <style jsx>{`
        @keyframes scan {
          0%, 100% { top: 0; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .animate-scan {
          animation: scan 2s ease-in-out infinite;
        }
        .safe-area-top {
          padding-top: max(1rem, env(safe-area-inset-top));
        }
        .pb-safe {
          padding-bottom: max(1.5rem, env(safe-area-inset-bottom));
        }
      `}</style>
    </div>
  );
}
