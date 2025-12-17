'use client';

import { useState } from 'react';
import { Play, ExternalLink, X } from 'lucide-react';

interface VideoEmbedProps {
  url: string;
  title?: string;
}

/**
 * Extract YouTube video ID from various URL formats
 */
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  
  return null;
}

/**
 * Check if URL is a video URL we can embed
 */
export function isEmbeddableVideo(url: string): boolean {
  if (!url) return false;
  
  // YouTube
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    return extractYouTubeId(url) !== null;
  }
  
  // Club AutoDoc videos (they use YouTube embeds)
  if (url.includes('club.autodoc')) {
    return true;
  }
  
  return false;
}

/**
 * Video thumbnail with play button overlay
 */
function VideoThumbnail({ 
  videoId, 
  onClick,
  title,
}: { 
  videoId: string; 
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="relative w-full aspect-video rounded-lg overflow-hidden group cursor-pointer bg-black/10"
    >
      <img
        src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
        alt={title || 'Video thumbnail'}
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors flex items-center justify-center">
        <div className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
          <Play className="w-7 h-7 text-white fill-white ml-1" />
        </div>
      </div>
      {title && (
        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
          <p className="text-white text-xs font-medium line-clamp-2">{title}</p>
        </div>
      )}
    </button>
  );
}

/**
 * Embedded YouTube player
 */
function YouTubePlayer({ 
  videoId, 
  onClose,
}: { 
  videoId: string;
  onClose?: () => void;
}) {
  return (
    <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-black">
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-2 right-2 z-10 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4 text-white" />
        </button>
      )}
      <iframe
        src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
        title="YouTube video player"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="w-full h-full"
      />
    </div>
  );
}

/**
 * Main VideoEmbed component
 * Shows thumbnail first, then embeds video on click
 */
export function VideoEmbed({ url, title }: VideoEmbedProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  
  const videoId = extractYouTubeId(url);
  
  // If we can't extract video ID, show as regular link
  if (!videoId) {
    return (
      <a 
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-primary underline underline-offset-2 hover:text-primary/80"
      >
        <Play className="w-4 h-4 text-red-500" />
        {title || 'Watch Video'}
        <ExternalLink className="w-3 h-3" />
      </a>
    );
  }
  
  return (
    <div className="my-2 max-w-sm">
      {isPlaying ? (
        <YouTubePlayer 
          videoId={videoId} 
          onClose={() => setIsPlaying(false)}
        />
      ) : (
        <VideoThumbnail 
          videoId={videoId}
          title={title}
          onClick={() => setIsPlaying(true)}
        />
      )}
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1 text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
      >
        Open on YouTube <ExternalLink className="w-3 h-3" />
      </a>
    </div>
  );
}

/**
 * Inline video link that expands to embed
 */
export function VideoLink({ 
  url, 
  children 
}: { 
  url: string; 
  children: React.ReactNode;
}) {
  const [showEmbed, setShowEmbed] = useState(false);
  const videoId = extractYouTubeId(url);
  const isClubAutodoc = url.includes('club.autodoc');
  
  // For non-YouTube links (like Club AutoDoc pages), open in new tab
  if (!videoId && !isClubAutodoc) {
    return (
      <a 
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-primary underline underline-offset-2 hover:text-primary/80"
      >
        <Play className="w-3.5 h-3.5 text-red-500" />
        {children}
      </a>
    );
  }
  
  // For Club AutoDoc without video ID, open in new tab (iframe blocked by X-Frame-Options)
  if (!videoId && isClubAutodoc) {
    return (
      <a 
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-primary underline underline-offset-2 hover:text-primary/80"
      >
        <Play className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
        {children}
        <ExternalLink className="w-3 h-3 ml-1" />
      </a>
    );
  }
  
  return (
    <span className="inline">
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setShowEmbed(!showEmbed);
        }}
        type="button"
        className="inline-flex items-center gap-1 text-primary underline underline-offset-2 hover:text-primary/80 cursor-pointer bg-transparent border-none p-0"
      >
        <Play className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
        {children}
        <span className="text-xs text-muted-foreground ml-1">
          {showEmbed ? '(hide)' : '(play)'}
        </span>
      </button>
      {showEmbed && (
        <div className="block my-2">
          <VideoEmbed url={url} title={String(children)} />
        </div>
      )}
    </span>
  );
}

export default VideoEmbed;
