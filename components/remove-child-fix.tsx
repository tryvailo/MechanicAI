'use client';

import { useEffect } from 'react';

/**
 * Global fix for removeChild errors from Google Maps API
 * This suppresses NotFoundError when React tries to remove DOM nodes
 * that Google Maps has already removed or moved.
 */
export function RemoveChildFix() {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof Node === 'undefined') {
      return;
    }

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

    // Cleanup on unmount (though this component should never unmount)
    return () => {
      Node.prototype.removeChild = originalRemoveChild;
    };
  }, []);

  return null;
}

