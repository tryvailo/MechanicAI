'use client';

import { useCallback, useRef, useState } from 'react';
import { AudioStreamPlayer } from '@/utils/AudioStreamPlayer';

// WebSocket message types
type GeminiServerContent = {
  serverContent?: {
    modelTurn?: {
      parts?: Array<{
        text?: string;
        inlineData?: {
          mimeType: string;
          data: string;
        };
      }>;
    };
    turnComplete?: boolean;
  };
  setupComplete?: boolean;
};

type GeminiClientMessage = {
  setup?: {
    model: string;
    generationConfig?: {
      responseModalities: string[];
      speechConfig?: {
        voiceConfig?: {
          prebuiltVoiceConfig?: {
            voiceName: string;
          };
        };
      };
    };
    systemInstruction?: {
      parts: Array<{ text: string }>;
    };
  };
  realtimeInput?: {
    mediaChunks: Array<{
      mimeType: string;
      data: string;
    }>;
  };
};

const OIL_CHANGE_SYSTEM_INSTRUCTION = `You are an expert mechanic guiding a user through car maintenance via video. Your goal is safety and accuracy.

## DASHBOARD WARNING LIGHT RECOGNITION (CRITICAL!)

If you see a car dashboard in the video, IMMEDIATELY identify any warning lights:

### 🔴 CRITICAL (RED) — Announce urgently:
- **Oil Pressure** (oil can): "STOP! I see the oil pressure warning! Do NOT start the engine until oil is checked!"
- **Temperature** (thermometer): "Warning! Engine temperature light is on. The engine may be overheating!"
- **Brake Warning** (circle with !): "I see the brake warning light. Check brake fluid and handbrake!"
- **Battery** (battery icon): "Battery or charging system warning detected!"
- **Airbag/SRS** (person with circle): "Airbag system warning is on. Safe to drive but airbags may not deploy."

### 🟡 WARNING (YELLOW/AMBER) — Explain clearly:
- **Check Engine** (engine outline): "Check engine light is on. This indicates an emission or engine issue."
- **ABS** (letters ABS): "ABS warning - your anti-lock brakes may not function."
- **Traction/ESP** (car with wavy lines): "Stability control warning light detected."
- **Tire Pressure** (tire with !): "Low tire pressure warning. Check all tires."
- **DPF** (diesel): "Diesel particulate filter warning. Needs a highway drive to regenerate."
- **Glow Plug** (coil, diesel): "Glow plug indicator - wait before starting in cold weather."
- **EPC** (VW/Audi): "Electronic Power Control warning - throttle system issue."
- **Service** (wrench): "Service reminder is on. Scheduled maintenance is due."

### ALWAYS:
1. Describe the COLOR of the light (red = critical, yellow = warning, green = info)
2. Describe the SYMBOL shape
3. Explain what it means
4. Give immediate action advice

## VIN DETECTION:
If you see a VIN sticker or plate, immediately read and announce it:
- VIN is a 17-character code (letters A-Z except I,O,Q and numbers 0-9)
- Common locations: door jamb, windshield, engine bay
- Say: "I can see your VIN: [read the code]. This appears to be a [make] [model] from [year]."

## OIL CHANGE GUIDANCE:

Step 1: Ask for car model OR detect VIN from video to identify the vehicle automatically.

Step 2: Verify the car is safely on jack stands (CRITICAL). 

Step 3: Guide them to find the drain plug. You MUST ask the user to point the camera at the bolt and confirm it is correct visually before they unscrew it. 

Step 4: Guide through draining, filter change, plug replacement, and refilling. 

Step 5: Ask to see the dipstick on camera to verify oil level.

## GENERAL VIDEO GUIDANCE:
- If you see the dashboard, always check for warning lights first
- Announce any warning lights immediately with explanation
- If user shows a warning light, explain what it means and what to do
- Be proactive about safety - if you see a red warning, prioritize addressing it

Keep voice responses loud, clear, and concise.`;

const GEMINI_WS_URL = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent`;

export type SessionStatus = 
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'listening'
  | 'error';

export function useOilChangeInstructor(videoRef: React.RefObject<HTMLVideoElement | null>) {
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState<SessionStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioWorkletRef = useRef<AudioWorkletNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioPlayerRef = useRef<AudioStreamPlayer | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isSessionActiveRef = useRef(false);

  /**
   * Convert Float32 audio samples to base64 16-bit PCM
   */
  const float32ToBase64PCM = useCallback((float32Array: Float32Array): string => {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    
    const uint8Array = new Uint8Array(int16Array.buffer);
    let binary = '';
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    return btoa(binary);
  }, []);

  /**
   * Capture and send video frame
   */
  const captureAndSendFrame = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const maxWidth = 640;
    const scale = Math.min(1, maxWidth / video.videoWidth);
    canvas.width = video.videoWidth * scale;
    canvas.height = video.videoHeight * scale;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    const base64Data = dataUrl.split(',')[1];

    const message: GeminiClientMessage = {
      realtimeInput: {
        mediaChunks: [{
          mimeType: 'image/jpeg',
          data: base64Data,
        }],
      },
    };

    wsRef.current.send(JSON.stringify(message));
  }, [videoRef]);

  /**
   * Start video frame capture loop
   */
  const startFrameCapture = useCallback(() => {
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
    }

    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }

    frameIntervalRef.current = setInterval(() => {
      if (isSessionActiveRef.current) {
        captureAndSendFrame();
      }
    }, 1000);
  }, [captureAndSendFrame]);

  /**
   * Stop video frame capture
   */
  const stopFrameCapture = useCallback(() => {
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }
  }, []);

  /**
   * Setup audio input (microphone)
   */
  const setupAudioInput = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      mediaStreamRef.current = stream;

      audioContextRef.current = new AudioContext({ sampleRate: 16000 });
      
      await audioContextRef.current.audioWorklet.addModule(
        URL.createObjectURL(
          new Blob([`
            class AudioProcessor extends AudioWorkletProcessor {
              constructor() {
                super();
                this.bufferSize = 2048;
                this.buffer = new Float32Array(this.bufferSize);
                this.bufferIndex = 0;
              }

              process(inputs) {
                const input = inputs[0];
                if (input.length > 0) {
                  const channelData = input[0];
                  for (let i = 0; i < channelData.length; i++) {
                    this.buffer[this.bufferIndex++] = channelData[i];
                    if (this.bufferIndex >= this.bufferSize) {
                      this.port.postMessage(this.buffer.slice());
                      this.bufferIndex = 0;
                    }
                  }
                }
                return true;
              }
            }
            registerProcessor('audio-processor', AudioProcessor);
          `], { type: 'application/javascript' })
        )
      );

      const source = audioContextRef.current.createMediaStreamSource(stream);
      audioWorkletRef.current = new AudioWorkletNode(
        audioContextRef.current,
        'audio-processor'
      );

      audioWorkletRef.current.port.onmessage = (event) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        if (!isSessionActiveRef.current) return;

        const audioData = event.data as Float32Array;
        const base64Audio = float32ToBase64PCM(audioData);

        const message: GeminiClientMessage = {
          realtimeInput: {
            mediaChunks: [{
              mimeType: 'audio/pcm;rate=16000',
              data: base64Audio,
            }],
          },
        };

        wsRef.current.send(JSON.stringify(message));
      };

      source.connect(audioWorkletRef.current);
      audioWorkletRef.current.connect(audioContextRef.current.destination);

    } catch (error) {
      console.error('Error setting up audio input:', error);
      throw error;
    }
  }, [float32ToBase64PCM]);

  /**
   * Handle incoming WebSocket messages
   */
  const handleWebSocketMessage = useCallback(async (event: MessageEvent) => {
    try {
      // Handle both string and Blob data
      let messageData: string;
      if (event.data instanceof Blob) {
        messageData = await event.data.text();
      } else if (typeof event.data === 'string') {
        messageData = event.data;
      } else {
        console.warn('Unexpected WebSocket message type:', typeof event.data);
        return;
      }

      const data: GeminiServerContent = JSON.parse(messageData);

      if (data.setupComplete) {
        setStatus('listening');
        isSessionActiveRef.current = true;
        startFrameCapture();
      }

      if (data.serverContent?.modelTurn?.parts) {
        for (const part of data.serverContent.modelTurn.parts) {
          if (part.inlineData?.mimeType.startsWith('audio/')) {
            audioPlayerRef.current?.add16BitPCM(part.inlineData.data);
          }
          if (part.text) {
            console.log('[Gemini Response]:', part.text);
          }
        }
      }

    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }, [startFrameCapture]);

  /**
   * Start the oil change instruction session
   */
  const startSession = useCallback(async () => {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      setErrorMessage('NEXT_PUBLIC_GEMINI_API_KEY is not configured');
      setStatus('error');
      return;
    }

    try {
      setStatus('connecting');
      setErrorMessage(null);

      audioPlayerRef.current = new AudioStreamPlayer(24000);
      await audioPlayerRef.current.init();

      await setupAudioInput();

      const wsUrl = `${GEMINI_WS_URL}?key=${apiKey}`;
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        setIsConnected(true);
        setStatus('connected');

        const setupMessage: GeminiClientMessage = {
          setup: {
            model: 'models/gemini-2.0-flash-exp',
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: 'Aoede',
                  },
                },
              },
            },
            systemInstruction: {
              parts: [{ text: OIL_CHANGE_SYSTEM_INSTRUCTION }],
            },
          },
        };

        wsRef.current?.send(JSON.stringify(setupMessage));
      };

      wsRef.current.onmessage = handleWebSocketMessage;

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setErrorMessage('Connection error occurred');
        setStatus('error');
      };

      wsRef.current.onclose = () => {
        setIsConnected(false);
        setStatus('idle');
        isSessionActiveRef.current = false;
        stopFrameCapture();
      };

    } catch (error) {
      console.error('Error starting session:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to start session');
      setStatus('error');
    }
  }, [setupAudioInput, handleWebSocketMessage, stopFrameCapture]);

  /**
   * Stop the instruction session
   */
  const stopSession = useCallback(() => {
    isSessionActiveRef.current = false;
    stopFrameCapture();

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    if (audioWorkletRef.current) {
      audioWorkletRef.current.disconnect();
      audioWorkletRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    if (audioPlayerRef.current) {
      audioPlayerRef.current.stop();
      audioPlayerRef.current = null;
    }

    setIsConnected(false);
    setStatus('idle');
  }, [stopFrameCapture]);

  return {
    isConnected,
    status,
    errorMessage,
    startSession,
    stopSession,
  };
}

