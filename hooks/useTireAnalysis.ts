'use client';

import { useState, useCallback } from 'react';

type WearPattern = 
  | 'even'
  | 'center'
  | 'edge'
  | 'one-side'
  | 'cupping'
  | 'feathering'
  | 'flat-spot'
  | 'diagonal'
  | 'unknown';

type TireCondition = 'good' | 'fair' | 'worn' | 'critical' | 'dangerous';

export type TireAnalysisResult = {
  treadDepth: {
    estimated: string;
    percentage: number;
    status: TireCondition;
  };
  wearPattern: {
    type: WearPattern;
    description: string;
    cause: string;
  };
  issues: Array<{
    issue: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    action: string;
  }>;
  tireInfo?: {
    brand?: string;
    model?: string;
    size?: string;
    dotCode?: string;
    speedRating?: string;
    loadIndex?: string;
  };
  recommendations: string[];
  safetyScore: number;
  estimatedLifeKm?: string;
};

type TireAnalysisState = {
  isLoading: boolean;
  result: TireAnalysisResult | null;
  error: string | null;
};

export function useTireAnalysis() {
  const [state, setState] = useState<TireAnalysisState>({
    isLoading: false,
    result: null,
    error: null,
  });

  const analyzeTire = useCallback(async (imageData: string | File): Promise<TireAnalysisResult | null> => {
    setState({ isLoading: true, result: null, error: null });

    try {
      const formData = new FormData();

      if (typeof imageData === 'string') {
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
        const file = new File([blob], 'tire-photo.jpg', { type: mimeType });
        formData.append('image', file);
      } else {
        formData.append('image', imageData);
      }

      const response = await fetch('/api/tire-analysis', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setState({ isLoading: false, result: data, error: null });
        return data;
      } else {
        setState({ isLoading: false, result: null, error: data.error });
        return null;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Tire analysis failed';
      setState({ isLoading: false, result: null, error: errorMessage });
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ isLoading: false, result: null, error: null });
  }, []);

  return {
    ...state,
    analyzeTire,
    reset,
  };
}

const CONDITION_EMOJI: Record<TireCondition, string> = {
  good: '✅',
  fair: '⚠️',
  worn: '🟠',
  critical: '🔴',
  dangerous: '🚨',
};

const WEAR_PATTERN_NAMES: Record<WearPattern, string> = {
  even: 'Even Wear',
  center: 'Center Wear',
  edge: 'Edge Wear',
  'one-side': 'One-Side Wear',
  cupping: 'Cupping/Scalloping',
  feathering: 'Feathering',
  'flat-spot': 'Flat Spot',
  diagonal: 'Diagonal Wear',
  unknown: 'Unknown Pattern',
};

const SEVERITY_EMOJI: Record<string, string> = {
  low: '🟢',
  medium: '🟡',
  high: '🟠',
  critical: '🔴',
};

export function formatTireAnalysisMessage(result: TireAnalysisResult): string {
  const { treadDepth, wearPattern, issues, tireInfo, recommendations, safetyScore, estimatedLifeKm } = result;
  
  let message = `## 🛞 Tire Analysis Results\n\n`;
  
  // Safety Score
  const safetyEmoji = safetyScore >= 7 ? '🟢' : safetyScore >= 5 ? '🟡' : safetyScore >= 3 ? '🟠' : '🔴';
  message += `### Safety Score: ${safetyEmoji} ${safetyScore}/10\n\n`;
  
  // Tread Depth
  message += `### Tread Depth\n`;
  message += `- ${CONDITION_EMOJI[treadDepth.status]} **${treadDepth.estimated}** (${treadDepth.percentage}% remaining)\n`;
  message += `- Status: **${treadDepth.status.charAt(0).toUpperCase() + treadDepth.status.slice(1)}**\n`;
  if (estimatedLifeKm) {
    message += `- Estimated life: ~${estimatedLifeKm}\n`;
  }
  message += `\n`;
  
  // Wear Pattern
  message += `### Wear Pattern\n`;
  message += `- Type: **${WEAR_PATTERN_NAMES[wearPattern.type]}**\n`;
  message += `- ${wearPattern.description}\n`;
  message += `- Likely cause: *${wearPattern.cause}*\n\n`;
  
  // Tire Info (if available)
  if (tireInfo && (tireInfo.brand || tireInfo.size || tireInfo.dotCode)) {
    message += `### Tire Information\n`;
    if (tireInfo.brand) message += `- Brand: **${tireInfo.brand}**\n`;
    if (tireInfo.model) message += `- Model: ${tireInfo.model}\n`;
    if (tireInfo.size) message += `- Size: \`${tireInfo.size}\`\n`;
    if (tireInfo.dotCode) {
      const week = tireInfo.dotCode.substring(0, 2);
      const year = tireInfo.dotCode.substring(2, 4);
      message += `- Manufactured: Week ${week}, 20${year}\n`;
    }
    if (tireInfo.speedRating) message += `- Speed Rating: ${tireInfo.speedRating}\n`;
    if (tireInfo.loadIndex) message += `- Load Index: ${tireInfo.loadIndex}\n`;
    message += `\n`;
  }
  
  // Issues
  if (issues.length > 0) {
    message += `### Issues Found\n`;
    issues.forEach((issue) => {
      message += `${SEVERITY_EMOJI[issue.severity]} **${issue.issue}**\n`;
      message += `   → ${issue.action}\n`;
    });
    message += `\n`;
  }
  
  // Recommendations
  if (recommendations.length > 0) {
    message += `### Recommendations\n`;
    recommendations.forEach((rec, i) => {
      message += `${i + 1}. ${rec}\n`;
    });
  }
  
  return message;
}
