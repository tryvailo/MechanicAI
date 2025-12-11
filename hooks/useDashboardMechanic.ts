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

const SYSTEM_INSTRUCTION = `Ты — опытный автомеханик-инструктор, который помогает новичку поменять масло в реальном времени.

У тебя есть доступ к видеопотоку. Твой приоритет — безопасность.

Алгоритм работы:

1. Сначала спроси марку, модель и год авто, а также какой объем двигателя.

2. Спроси, есть ли у пользователя масло, фильтр, инструменты и, главное, НАДЕЖНО ЛИ ПОДНЯТА МАШИНА (подставки/jack stands). Не продолжай, пока не убедишься в безопасности.

3. Веди пользователя по шагам:

   - Найти сливную пробку (попроси показать её на камеру, чтобы подтвердить, что это не КПП!).

   - Открутить и слить масло (предупреди, что оно может быть горячим).

   - Найти и заменить масляный фильтр.

   - Закрутить пробку обратно (напомни про новую шайбу, если нужно).

   - Залить новое масло (подскажи объем).

   - Проверить уровень щупом (попроси показать щуп на камеру, чтобы оценить уровень).

ВАЖНО:

- Говори кратко и четко. Руки пользователя грязные, он не смотрит в экран.

- Всегда проси визуальное подтверждение перед критическим действием ("Покажи мне болт, который собираешься крутить").

- Используй видеопоток для проверки правильности действий пользователя.

- Отвечай на том же языке, на котором говорит пользователь.`;

const GEMINI_WS_URL = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent`;

export type SessionStatus = 
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'listening'
  | 'error';

export type SessionMode = 'stream' | 'static';

export function useDashboardMechanic(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  mode: SessionMode = 'stream'
) {
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
  const modeRef = useRef<SessionMode>(mode);

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
   * Send a static image (base64 data)
   */
  const sendStaticImage = useCallback((base64Data: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected, cannot send image');
      return;
    }

    // Remove data URL prefix if present (e.g., "data:image/jpeg;base64,")
    const cleanBase64 = base64Data.includes(',') 
      ? base64Data.split(',')[1] 
      : base64Data;

    const message: GeminiClientMessage = {
      realtimeInput: {
        mediaChunks: [{
          mimeType: 'image/jpeg',
          data: cleanBase64,
        }],
      },
    };

    wsRef.current.send(JSON.stringify(message));
  }, []);

  /**
   * Handle incoming WebSocket messages
   */
  const handleWebSocketMessage = useCallback((event: MessageEvent) => {
    try {
      const data: GeminiServerContent = JSON.parse(event.data);

      if (data.setupComplete) {
        setStatus('listening');
        isSessionActiveRef.current = true;
        // Only start frame capture if in stream mode
        if (modeRef.current === 'stream') {
          startFrameCapture();
        }
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
   * Start the diagnostic session
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

      // Update mode ref
      modeRef.current = mode;

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
              parts: [{ text: SYSTEM_INSTRUCTION }],
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
  }, [mode, setupAudioInput, handleWebSocketMessage, stopFrameCapture]);

  /**
   * Stop the diagnostic session
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
    sendStaticImage,
  };
}
