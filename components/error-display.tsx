'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, X, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorInfo {
  message: string;
  stack?: string;
  timestamp: Date;
}

export function ErrorDisplay() {
  const [errors, setErrors] = useState<ErrorInfo[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  const copyError = (error: ErrorInfo) => {
    const text = `Error: ${error.message}\n\nTime: ${error.timestamp.toISOString()}\n\n${error.stack || ''}`;
    navigator.clipboard.writeText(text).then(() => {
      // Visual feedback could be added here
    });
  };

  useEffect(() => {
    // Capture console errors
    const originalError = console.error;
    console.error = (...args: any[]) => {
      originalError.apply(console, args);
      
      const errorMessage = args
        .map(arg => {
          if (arg instanceof Error) {
            return `${arg.name}: ${arg.message}\n${arg.stack || ''}`;
          }
          return String(arg);
        })
        .join(' ');

      setErrors(prev => [
        {
          message: errorMessage,
          timestamp: new Date(),
        },
        ...prev.slice(0, 9), // Keep last 10 errors
      ]);
    };

    // Capture unhandled errors
    const handleError = (event: ErrorEvent) => {
      setErrors(prev => [
        {
          message: `${event.message}\n${event.filename}:${event.lineno}:${event.colno}`,
          stack: event.error?.stack,
          timestamp: new Date(),
        },
        ...prev.slice(0, 9),
      ]);
    };

    // Capture unhandled promise rejections
    const handleRejection = (event: PromiseRejectionEvent) => {
      const message = event.reason instanceof Error 
        ? `${event.reason.name}: ${event.reason.message}\n${event.reason.stack || ''}`
        : String(event.reason);
      
      setErrors(prev => [
        {
          message,
          timestamp: new Date(),
        },
        ...prev.slice(0, 9),
      ]);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      console.error = originalError;
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  if (errors.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-[9999] max-w-sm">
      <div className="bg-destructive text-destructive-foreground rounded-lg shadow-lg border border-destructive/50">
        <div className="flex items-center justify-between p-3 border-b border-destructive/50">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span className="font-semibold text-sm">
              Ошибки ({errors.length})
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-destructive-foreground hover:bg-destructive/80"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Свернуть' : 'Развернуть'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-destructive-foreground hover:bg-destructive/80"
              onClick={() => setErrors([])}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
        
        {isExpanded && (
          <div className="max-h-96 overflow-y-auto p-3 space-y-3">
            {errors.map((error, index) => (
              <div
                key={index}
                className="bg-destructive/20 rounded p-2 text-xs font-mono whitespace-pre-wrap break-words"
              >
                <div className="text-destructive-foreground/70 mb-1">
                  {error.timestamp.toLocaleTimeString()}
                </div>
                <div className="flex items-start justify-between gap-2">
                  <div className="text-destructive-foreground flex-1">
                    {error.message}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-destructive-foreground/70 hover:bg-destructive/30 shrink-0"
                    onClick={() => copyError(error)}
                    title="Копировать ошибку"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                {error.stack && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-destructive-foreground/70">
                      Stack trace
                    </summary>
                    <pre className="mt-1 text-[10px] text-destructive-foreground/70 overflow-x-auto">
                      {error.stack}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}
        
        {!isExpanded && (
          <div className="p-3">
            <div className="text-xs font-mono whitespace-pre-wrap break-words line-clamp-3">
              {errors[0].message}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

