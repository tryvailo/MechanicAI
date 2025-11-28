'use client';

import { useEffect } from 'react';

/**
 * Global fix for removeChild errors from Google Maps API
 * This suppresses NotFoundError when React tries to remove DOM nodes
 * that Google Maps has already removed or moved.
 * Also handles Next.js chunk loading errors.
 */
export function RemoveChildFix() {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof Node === 'undefined') {
      return;
    }

    // Fix removeChild errors
    const originalRemoveChild = Node.prototype.removeChild;
    
    Node.prototype.removeChild = function<T extends Node>(child: T): T {
      try {
        return originalRemoveChild.call(this, child) as T;
      } catch (error: any) {
        // Ignore NotFoundError for removeChild - common with Google Maps API
        // This happens when React tries to remove nodes that Google Maps already removed
        if (error?.name === 'NotFoundError' && 
            error?.message?.includes('removeChild')) {
          return child;
        }
        throw error;
      }
    };

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

