'use client';

import { useState, useCallback } from 'react';

export type VinResult = {
  vin: string;
  confidence: 'high' | 'medium' | 'low';
  vehicleInfo?: {
    year?: string;
    make?: string;
    model?: string;
    engine?: string;
    country?: string;
  };
};

type VinOcrState = {
  isLoading: boolean;
  result: VinResult | null;
  error: string | null;
};

export function useVinOcr() {
  const [state, setState] = useState<VinOcrState>({
    isLoading: false,
    result: null,
    error: null,
  });

  const scanVin = useCallback(async (imageData: string | File): Promise<VinResult | null> => {
    setState({ isLoading: true, result: null, error: null });

    try {
      const formData = new FormData();

      if (typeof imageData === 'string') {
        // Convert base64 to File
        const base64Data = imageData.includes(',') ? imageData.split(',')[1] : imageData;
        const mimeMatch = imageData.match(/data:([^;]+)/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
        
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: mimeType });
        const file = new File([blob], 'vin-photo.jpg', { type: mimeType });
        formData.append('image', file);
      } else {
        formData.append('image', imageData);
      }

      const response = await fetch('/api/vin-ocr', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        const result: VinResult = {
          vin: data.vin,
          confidence: data.confidence,
          vehicleInfo: data.vehicleInfo,
        };
        setState({ isLoading: false, result, error: null });
        return result;
      } else {
        setState({ isLoading: false, result: null, error: data.error });
        return null;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'VIN scan failed';
      setState({ isLoading: false, result: null, error: errorMessage });
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ isLoading: false, result: null, error: null });
  }, []);

  return {
    ...state,
    scanVin,
    reset,
  };
}

/**
 * Format VIN result as a message for the chat
 */
export function formatVinMessage(result: VinResult): string {
  const { vin, confidence, vehicleInfo } = result;
  
  let message = `🔍 **VIN Detected:** \`${vin}\`\n`;
  message += `📊 Confidence: ${confidence === 'high' ? '✅ High' : confidence === 'medium' ? '⚠️ Medium' : '❓ Low'}\n\n`;
  
  if (vehicleInfo) {
    message += '🚗 **Vehicle Info:**\n';
    if (vehicleInfo.make) message += `- Make: **${vehicleInfo.make}**\n`;
    if (vehicleInfo.model) message += `- Model: **${vehicleInfo.model}**\n`;
    if (vehicleInfo.year) message += `- Year: **${vehicleInfo.year}**\n`;
    if (vehicleInfo.engine) message += `- Engine: **${vehicleInfo.engine}**\n`;
    if (vehicleInfo.country) message += `- Country: ${vehicleInfo.country}\n`;
  }
  
  return message;
}
