'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, X, Copy, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorInfo {
  message: string;
  stack?: string;
  timestamp: Date;
  url?: string;
  userAgent?: string;
}

const ERRORS_STORAGE_KEY = 'app_errors_log';
const MAX_STORED_ERRORS = 50;

// Load errors from localStorage
function loadErrorsFromStorage(): ErrorInfo[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(ERRORS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Convert timestamp strings back to Date objects
      return parsed.map((e: any) => ({
        ...e,
        timestamp: new Date(e.timestamp),
      }));
    }
  } catch {
    // Ignore parse errors
  }
  return [];
}

// Save errors to localStorage
function saveErrorsToStorage(errors: ErrorInfo[]) {
  if (typeof window === 'undefined') return;
  
  try {
    // Keep only last MAX_STORED_ERRORS errors
    const toSave = errors.slice(0, MAX_STORED_ERRORS);
    localStorage.setItem(ERRORS_STORAGE_KEY, JSON.stringify(toSave));
  } catch {
    // Ignore storage errors (quota exceeded, etc.)
  }
}

export function ErrorDisplay() {
  const router = useRouter();
  const [errors, setErrors] = useState<ErrorInfo[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  // Load errors from storage on mount
  useEffect(() => {
    const storedErrors = loadErrorsFromStorage();
    if (storedErrors.length > 0) {
      setErrors(storedErrors);
    }
  }, []);

  const copyError = (error: ErrorInfo) => {
    try {
      const currentUrl = typeof window !== 'undefined' ? window.location.href : 'N/A';
      const text = `Error: ${error.message}\n\nTime: ${error.timestamp.toISOString()}\nURL: ${error.url || currentUrl}\n\n${error.stack || ''}`;
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(text).catch(() => {
          // Ignore clipboard errors
        });
      }
    } catch {
      // Ignore errors
    }
  };

  const shareAllErrors = async () => {
    try {
      const text = errors
        .map((e, i) => `Error #${i + 1}:\n${e.message}\nTime: ${e.timestamp.toISOString()}\nURL: ${e.url || 'N/A'}\n${e.stack ? `Stack: ${e.stack}` : ''}\n\n`)
        .join('---\n\n');
      
      if (typeof navigator !== 'undefined' && navigator.share) {
        try {
          await navigator.share({
            title: 'App Errors Log',
            text: text,
          });
        } catch {
          // Fallback to copy
          if (navigator.clipboard) {
            navigator.clipboard.writeText(text).catch(() => {});
          }
        }
      } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(text).catch(() => {});
      }
    } catch {
      // Ignore errors
    }
  };

  useEffect(() => {
    // Capture console errors
    const originalError = console.error;
    console.error = (...args: any[]) => {
      try {
        originalError.apply(console, args);
      } catch {
        // Ignore errors in error handler
      }
      
      try {
        const errorMessage = args
          .map(arg => {
            if (arg instanceof Error) {
              return `${arg.name}: ${arg.message}\n${arg.stack || ''}`;
            }
            return String(arg);
          })
          .join(' ');

        const newError: ErrorInfo = {
          message: errorMessage,
          timestamp: new Date(),
          url: typeof window !== 'undefined' ? window.location.href : undefined,
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        };
        
        setErrors(prev => {
          const updated = [newError, ...prev.slice(0, 49)]; // Keep last 50 errors
          try {
            saveErrorsToStorage(updated);
          } catch {
            // Ignore storage errors
          }
          return updated;
        });
      } catch {
        // Ignore errors in error handler to prevent infinite loops
      }
    };

    // Capture unhandled errors
    const handleError = (event: ErrorEvent) => {
      try {
        const newError: ErrorInfo = {
          message: `${event.message}\n${event.filename}:${event.lineno}:${event.colno}`,
          stack: event.error?.stack,
          timestamp: new Date(),
          url: typeof window !== 'undefined' ? window.location.href : undefined,
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        };
        
        setErrors(prev => {
          const updated = [newError, ...prev.slice(0, 49)];
          try {
            saveErrorsToStorage(updated);
          } catch {
            // Ignore storage errors
          }
          return updated;
        });
      } catch {
        // Ignore errors in error handler
      }
    };

    // Capture unhandled promise rejections
    const handleRejection = (event: PromiseRejectionEvent) => {
      try {
        const message = event.reason instanceof Error 
          ? `${event.reason.name}: ${event.reason.message}\n${event.reason.stack || ''}`
          : String(event.reason);
        
        const newError: ErrorInfo = {
          message,
          timestamp: new Date(),
          url: typeof window !== 'undefined' ? window.location.href : undefined,
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        };
        
        setErrors(prev => {
          const updated = [newError, ...prev.slice(0, 49)];
          try {
            saveErrorsToStorage(updated);
          } catch {
            // Ignore storage errors
          }
          return updated;
        });
      } catch {
        // Ignore errors in error handler
      }
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
              onClick={() => {
                setErrors([]);
                localStorage.removeItem(ERRORS_STORAGE_KEY);
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
        
        {isExpanded && (
          <div className="max-h-96 overflow-y-auto p-3 space-y-3">
            <div className="flex gap-2 mb-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7"
                onClick={shareAllErrors}
              >
                <Share2 className="h-3 w-3 mr-1" />
                Поделиться
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7"
                onClick={() => {
                  try {
                    router.push('/debug');
                  } catch (error) {
                    // Fallback to window.location if router fails
                    window.location.href = '/debug';
                  }
                }}
              >
                Открыть страницу отладки
              </Button>
            </div>
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

