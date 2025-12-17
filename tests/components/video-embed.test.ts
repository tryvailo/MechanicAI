import { describe, it, expect } from 'vitest';
import { isEmbeddableVideo } from '@/components/video-embed';

describe('VideoEmbed', () => {
  describe('isEmbeddableVideo', () => {
    it('detects YouTube watch URLs', () => {
      expect(isEmbeddableVideo('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
      expect(isEmbeddableVideo('https://youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
    });

    it('detects YouTube short URLs', () => {
      expect(isEmbeddableVideo('https://youtu.be/dQw4w9WgXcQ')).toBe(true);
    });

    it('detects YouTube embed URLs', () => {
      expect(isEmbeddableVideo('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe(true);
    });

    it('detects Club AutoDoc URLs', () => {
      expect(isEmbeddableVideo('https://club.autodoc.co.uk/manuals/bmw/3-series')).toBe(true);
      expect(isEmbeddableVideo('https://club.autodoc.de/manuals/vw/golf')).toBe(true);
    });

    it('rejects non-video URLs', () => {
      expect(isEmbeddableVideo('https://www.autodoc.co.uk/car-parts')).toBe(false);
      expect(isEmbeddableVideo('https://www.google.com')).toBe(false);
      expect(isEmbeddableVideo('https://example.com')).toBe(false);
    });

    it('rejects empty or invalid URLs', () => {
      expect(isEmbeddableVideo('')).toBe(false);
      expect(isEmbeddableVideo('not-a-url')).toBe(false);
    });

    it('handles YouTube URLs with extra parameters', () => {
      expect(isEmbeddableVideo('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=120')).toBe(true);
      expect(isEmbeddableVideo('https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLtest')).toBe(true);
    });
  });
});
