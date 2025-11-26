/**
 * Shared types for API routes
 */

// Common API response wrapper
export type ApiResponse<T> = 
  | { success: true; data: T }
  | { success: false; error: string };

// Photo analysis types
export type PhotoAnalysis = {
  diagnosis: string;
  severity: 'low' | 'medium' | 'high';
  possibleCauses: string[];
  recommendations: string[];
  confidence: number; // 0-1
};

// Transcription types
export type Transcription = {
  text: string;
  language?: string;
  confidence?: number; // 0-1
};

// Chat message types
export type ChatMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

export type ChatContext = {
  recentAnalysis?: string;
  vehicleInfo?: string;
};

export type ChatResponse = {
  message: string;
  suggestions?: string[];
};

