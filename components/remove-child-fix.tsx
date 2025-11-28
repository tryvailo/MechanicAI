'use client';

import { useEffect } from 'react';

/**
 * Global fix for removeChild errors from Google Maps API and React
 * This suppresses NotFoundError when React tries to remove DOM nodes
 * that have already been removed or moved.
 * Also handles Next.js chunk loading errors.
 */
export function RemoveChildFix() {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof Node === 'undefined') {
      return;
    }

    // Apply removeChild fix immediately
    const originalRemoveChild = Node.prototype.removeChild;
    
    // Check if already patched by checking if it's the original
    const isPatched = Node.prototype.removeChild !== originalRemoveChild || 
                      Node.prototype.removeChild.toString().includes('originalRemoveChild');
    
    if (!isPatched) {
      Node.prototype.removeChild = function<T extends Node>(child: T): T {
        try {
          return originalRemoveChild.call(this, child) as T;
        } catch (error: any) {
          // Suppress ALL NotFoundError for removeChild
          if (error?.name === 'NotFoundError') {
            return child;
          }
          // Also suppress "The object can not be found here" errors
          if (error?.message && (
            error.message.includes('can not be found') ||
            error.message.includes('not be found here')
          )) {
            return child;
          }
          throw error;
        }
      };
    }

    // Handle Next.js chunk loading errors and general NotFoundError
    const handleChunkError = (event: ErrorEvent) => {
      // Check if it's a chunk loading error or NotFoundError
      const isChunkError = event.message && (
        event.message.includes('chunk') ||
        event.message.includes('_next/static') ||
        event.message.includes('Failed to fetch dynamically imported module') ||
        event.message.includes('The object can not be found here')
      );

      const isNotFoundError = event.error?.name === 'NotFoundError' || 
                             event.message?.includes('NotFoundError');

      if (isChunkError || isNotFoundError) {
        // Log the error but don't crash
        console.warn('Chunk/NotFoundError detected:', event.message);
        
        // Only reload if it's a critical chunk error
        if (isChunkError && event.message.includes('_next/static')) {
          console.warn('Critical chunk error, attempting to reload...');
          setTimeout(() => {
            try {
              window.location.reload();
            } catch {
              // Ignore reload errors
            }
          }, 1000);
        }
        
        // Prevent default error handling for NotFoundError
        if (isNotFoundError) {
          event.preventDefault();
          return false;
        }
      }
    };

    window.addEventListener('error', handleChunkError);

    // Cleanup on unmount (though this component should never unmount)
    return () => {
      Node.prototype.removeChild = originalRemoveChild;
      window.removeEventListener('error', handleChunkError);
    };
  }, []);

  return null;
}

