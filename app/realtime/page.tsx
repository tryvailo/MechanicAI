'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useDashboardMechanic, SessionStatus } from '@/hooks/useDashboardMechanic';

const STATUS_TEXT: Record<SessionStatus, string> = {
  idle: 'Ready to start',
  connecting: 'Connecting to AI...',
  connected: 'Setting up...',
  listening: 'AI Watching & Listening...',
  error: 'Connection error',
};

const STATUS_COLORS: Record<SessionStatus, string> = {
  idle: 'bg-zinc-800',
  connecting: 'bg-amber-600',
  connected: 'bg-blue-600',
  listening: 'bg-emerald-600',
  error: 'bg-red-600',
};

export default function RealtimeDashboardPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const {
    isConnected,
    status,
    errorMessage,
    startSession,
    stopSession,
  } = useDashboardMechanic(videoRef);

  const setupCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraReady(true);
        setCameraError(null);
      }
    } catch (error) {
      console.error('Camera error:', error);
      setCameraError('Unable to access camera. Please grant permission.');
    }
  }, []);

  useEffect(() => {
    setupCamera();

    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [setupCamera]);

  const handleToggleSession = useCallback(() => {
    if (isConnected) {
      stopSession();
    } else {
      startSession();
    }
  }, [isConnected, startSession, stopSession]);

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
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
            </span>
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

      {/* Camera Viewfinder */}
      <div className="flex-1 relative overflow-hidden">
        {cameraError ? (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
            <div className="text-center p-6">
              <div className="text-5xl mb-4">📷</div>
              <p className="text-white text-lg mb-4">{cameraError}</p>
              <button
                onClick={setupCamera}
                className="px-6 py-3 bg-[#21808D] text-white rounded-xl font-medium"
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
      </div>

      {/* Control Bar */}
      <div className="relative z-10 bg-gradient-to-t from-black via-black/90 to-transparent pt-8 pb-safe">
        <div className="px-6 pb-6">
          {/* Instructions */}
          <p className="text-center text-zinc-400 text-sm mb-4">
            {isConnected 
              ? 'Point at dashboard warning lights and ask questions'
              : 'Point your camera at the car dashboard'
            }
          </p>

          {/* Main Button */}
          <button
            onClick={handleToggleSession}
            disabled={!cameraReady || status === 'connecting'}
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
              AI will analyze dashboard and respond to your voice questions
            </p>
          )}
        </div>
      </div>

      {/* Custom styles for animations */}
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
