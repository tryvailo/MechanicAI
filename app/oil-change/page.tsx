'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useOilChangeInstructor, SessionStatus } from '@/hooks/useOilChangeInstructor';
import { Zap, Mic, MicOff } from 'lucide-react';

const STATUS_TEXT: Record<SessionStatus, string> = {
  idle: 'Ready to start',
  connecting: 'Connecting to AI...',
  connected: 'Setting up...',
  listening: 'Mic is Open - AI Listening',
  error: 'Connection error',
};

const STATUS_COLORS: Record<SessionStatus, string> = {
  idle: 'bg-zinc-800',
  connecting: 'bg-amber-600',
  connected: 'bg-blue-600',
  listening: 'bg-emerald-600',
  error: 'bg-red-600',
};

export default function OilChangePage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [flashlightOn, setFlashlightOn] = useState(false);
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);

  const {
    isConnected,
    status,
    errorMessage,
    startSession,
    stopSession,
  } = useOilChangeInstructor(videoRef);

  /**
   * Toggle flashlight/torch on mobile devices
   */
  const toggleFlashlight = useCallback(async () => {
    if (!videoTrackRef.current) return;

    try {
      const capabilities = videoTrackRef.current.getCapabilities();
      
      // Check if torch is supported
      if ('torch' in capabilities) {
        await videoTrackRef.current.applyConstraints({
          advanced: [{ torch: !flashlightOn } as any],
        });
        setFlashlightOn(!flashlightOn);
      } else {
        console.warn('Torch/flashlight not supported on this device');
        // Fallback: try to use the facingMode constraint
        // This is a workaround for devices that don't support torch directly
      }
    } catch (error) {
      console.error('Error toggling flashlight:', error);
      // Flashlight might not be available or already in use
    }
  }, [flashlightOn]);

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
        
        // Store video track reference for flashlight control
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrackRef.current = videoTrack;
        }
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
      videoTrackRef.current = null;
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
          {status === 'listening' && (
            <Mic className="h-4 w-4" />
          )}
          {STATUS_TEXT[status]}
        </div>
        
        {errorMessage && (
          <div className="mt-2 px-4 py-2 bg-red-600 bg-opacity-90 rounded-lg text-white text-sm">
            {errorMessage}
          </div>
        )}
      </div>

      {/* Full-screen Camera Viewfinder */}
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
            
            {/* Step Indicator Overlay */}
            {status === 'listening' && (
              <div className="absolute top-20 left-0 right-0 z-10 flex justify-center">
                <div className="px-4 py-2 bg-black/70 backdrop-blur-sm rounded-full border border-white/20">
                  <p className="text-white text-sm font-medium">
                    Step: Following AI Instructions
                  </p>
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
              ? 'Point camera at your work area. AI will guide you step-by-step.'
              : 'Ready to start oil change guidance'
            }
          </p>

          {/* Flashlight Toggle Button */}
          <div className="flex gap-3 mb-4">
            <button
              onClick={toggleFlashlight}
              disabled={!cameraReady}
              className={`
                flex-1 py-3 px-4 rounded-xl font-medium text-sm
                transition-all duration-200
                disabled:opacity-50 disabled:cursor-not-allowed
                flex items-center justify-center gap-2
                ${flashlightOn 
                  ? 'bg-amber-600 hover:bg-amber-700 text-white' 
                  : 'bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700'
                }
              `}
            >
              <Zap className={`h-5 w-5 ${flashlightOn ? 'fill-current' : ''}`} />
              {flashlightOn ? 'Flashlight On' : 'Turn On Flashlight'}
            </button>
          </div>

          {/* Main Session Toggle Button */}
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
                Stop Guidance
              </>
            ) : (
              <>
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Start Oil Change Guide
              </>
            )}
          </button>

          {/* Hint */}
          {!isConnected && (
            <p className="text-center text-zinc-500 text-xs mt-3">
              AI will guide you through each step with voice instructions
            </p>
          )}
        </div>
      </div>

      {/* Custom styles for safe areas */}
      <style jsx>{`
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

