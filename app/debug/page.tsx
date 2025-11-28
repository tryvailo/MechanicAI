'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, Trash2, Download, Share2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface ErrorInfo {
  message: string;
  stack?: string;
  timestamp: Date;
  url?: string;
  userAgent?: string;
}

const ERRORS_STORAGE_KEY = 'app_errors_log';

export default function DebugPage() {
  const [errors, setErrors] = useState<ErrorInfo[]>([]);
  const [selectedError, setSelectedError] = useState<number | null>(null);

  useEffect(() => {
    loadErrors();
  }, []);

  const loadErrors = () => {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(ERRORS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const errorsWithDates = parsed.map((e: any) => ({
          ...e,
          timestamp: new Date(e.timestamp),
        }));
        setErrors(errorsWithDates);
      }
    } catch {
      // Ignore parse errors
    }
  };

  const clearAllErrors = () => {
    if (confirm('Удалить все ошибки?')) {
      localStorage.removeItem(ERRORS_STORAGE_KEY);
      setErrors([]);
    }
  };

  const exportErrors = () => {
    const text = errors
      .map((e, i) => {
        return `=== Error #${i + 1} ===
Time: ${e.timestamp.toISOString()}
URL: ${e.url || 'N/A'}
User Agent: ${e.userAgent || 'N/A'}

Message:
${e.message}

${e.stack ? `Stack Trace:\n${e.stack}` : ''}

`;
      })
      .join('\n\n');

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `errors-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const shareErrors = async () => {
    const text = errors
      .map((e, i) => {
        return `Error #${i + 1}:\n${e.message}\nTime: ${e.timestamp.toISOString()}\nURL: ${e.url || 'N/A'}\n${e.stack ? `Stack: ${e.stack}` : ''}`;
      })
      .join('\n\n---\n\n');

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'App Errors Log',
          text: text,
        });
      } catch {
        // User cancelled or share failed
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(text);
      alert('Ошибки скопированы в буфер обмена');
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Страница отладки</h1>
              <p className="text-muted-foreground text-sm">
                Просмотр всех ошибок приложения
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="bg-card rounded-lg border p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-destructive">
                {errors.length}
              </div>
              <div className="text-muted-foreground text-sm">
                Всего ошибок
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={exportErrors}
                disabled={errors.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Экспорт
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={shareErrors}
                disabled={errors.length === 0}
              >
                <Share2 className="h-4 w-4 mr-2" />
                Поделиться
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={clearAllErrors}
                disabled={errors.length === 0}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Очистить
              </Button>
            </div>
          </div>
        </div>

        {/* Errors List */}
        {errors.length === 0 ? (
          <div className="bg-card rounded-lg border p-8 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Ошибок не найдено</h3>
            <p className="text-muted-foreground text-sm">
              Все ошибки будут автоматически сохраняться здесь
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {errors.map((error, index) => (
              <div
                key={index}
                className="bg-card rounded-lg border border-destructive/20 overflow-hidden"
              >
                <div
                  className="p-4 cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => setSelectedError(selectedError === index ? null : index)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                        <span className="text-sm font-semibold text-destructive">
                          Ошибка #{errors.length - index}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {error.timestamp.toLocaleString('ru-RU')}
                        </span>
                      </div>
                      <div className="text-sm font-mono whitespace-pre-wrap break-words line-clamp-3">
                        {error.message}
                      </div>
                      {error.url && (
                        <div className="text-xs text-muted-foreground mt-2 truncate">
                          URL: {error.url}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(
                          `Error: ${error.message}\n\nTime: ${error.timestamp.toISOString()}\nURL: ${error.url || 'N/A'}\n\n${error.stack || ''}`
                        );
                      }}
                    >
                      Копировать
                    </Button>
                  </div>
                </div>

                {selectedError === index && (
                  <div className="border-t bg-muted/30 p-4 space-y-3">
                    {error.stack && (
                      <div>
                        <div className="text-xs font-semibold mb-2">Stack Trace:</div>
                        <pre className="text-xs font-mono bg-background p-3 rounded overflow-x-auto">
                          {error.stack}
                        </pre>
                      </div>
                    )}
                    {error.userAgent && (
                      <div>
                        <div className="text-xs font-semibold mb-1">User Agent:</div>
                        <div className="text-xs text-muted-foreground break-all">
                          {error.userAgent}
                        </div>
                      </div>
                    )}
                    <div>
                      <div className="text-xs font-semibold mb-1">Полное сообщение:</div>
                      <pre className="text-xs font-mono bg-background p-3 rounded overflow-x-auto whitespace-pre-wrap">
                        {error.message}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

