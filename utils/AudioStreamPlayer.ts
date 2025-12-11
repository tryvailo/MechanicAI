/**
 * AudioStreamPlayer - Handles seamless playback of incoming PCM audio chunks
 * Designed for real-time audio streaming from Gemini API
 */
export class AudioStreamPlayer {
  private audioContext: AudioContext | null = null;
  private sampleRate: number;
  private nextStartTime: number = 0;
  private isPlaying: boolean = false;
  private gainNode: GainNode | null = null;

  constructor(sampleRate: number = 24000) {
    this.sampleRate = sampleRate;
  }

  /**
   * Initialize the AudioContext (must be called after user interaction)
   */
  async init(): Promise<void> {
    if (this.audioContext) return;

    this.audioContext = new AudioContext({ sampleRate: this.sampleRate });
    this.gainNode = this.audioContext.createGain();
    this.gainNode.connect(this.audioContext.destination);
    this.gainNode.gain.value = 1.0;

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    this.nextStartTime = this.audioContext.currentTime;
    this.isPlaying = true;
  }

  /**
   * Add 16-bit PCM audio data (base64 encoded) for playback
   * Converts Int16 to Float32 and schedules for seamless playback
   */
  add16BitPCM(base64Data: string): void {
    if (!this.audioContext || !this.gainNode) {
      console.warn('AudioStreamPlayer not initialized');
      return;
    }

    try {
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const int16Array = new Int16Array(bytes.buffer);
      const float32Array = new Float32Array(int16Array.length);

      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
      }

      const audioBuffer = this.audioContext.createBuffer(
        1,
        float32Array.length,
        this.sampleRate
      );
      audioBuffer.getChannelData(0).set(float32Array);

      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.gainNode);

      const currentTime = this.audioContext.currentTime;
      const startTime = Math.max(currentTime, this.nextStartTime);
      
      source.start(startTime);
      this.nextStartTime = startTime + audioBuffer.duration;

    } catch (error) {
      console.error('Error processing audio chunk:', error);
    }
  }

  /**
   * Stop playback and clean up resources
   */
  stop(): void {
    this.isPlaying = false;
    
    if (this.audioContext) {
      this.audioContext.close().catch(console.error);
      this.audioContext = null;
      this.gainNode = null;
    }
    
    this.nextStartTime = 0;
  }

  /**
   * Resume audio context if suspended
   */
  async resume(): Promise<void> {
    if (this.audioContext?.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  /**
   * Check if player is active
   */
  get active(): boolean {
    return this.isPlaying && this.audioContext !== null;
  }
}
