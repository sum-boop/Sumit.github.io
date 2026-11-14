import { useEffect, useRef, useState } from 'react';
import { assetPath } from '../utils/assets';

interface BackgroundVideoProps {
  className: string;
  poster: string;
  src: string;
  paused?: boolean;
  posterClassName?: string;
  posterAlt?: string;
}

export function BackgroundVideo({
  className,
  poster,
  src,
  paused = false,
  posterClassName,
  posterAlt = '',
}: BackgroundVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoFailed, setVideoFailed] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || videoFailed) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (paused || reducedMotion) {
      video.pause();
      return;
    }

    const play = () => {
      void video.play().catch(() => undefined);
    };

    if (!('IntersectionObserver' in window)) {
      play();
      return () => video.pause();
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !paused) play();
        else video.pause();
      },
      { rootMargin: '240px 0px', threshold: 0.01 },
    );

    observer.observe(video);

    return () => {
      observer.disconnect();
      video.pause();
    };
  }, [paused, videoFailed]);

  if (videoFailed) {
    return (
      <img
        alt={posterAlt}
        aria-hidden={posterAlt === ''}
        className={posterClassName ?? className}
        decoding="async"
        src={assetPath(poster)}
      />
    );
  }

  return (
    <video
      aria-hidden="true"
      className={className}
      loop
      muted
      onError={() => setVideoFailed(true)}
      playsInline
      poster={assetPath(poster)}
      preload="metadata"
      ref={videoRef}
      tabIndex={-1}
    >
      <source src={assetPath(src)} type="video/mp4" />
    </video>
  );
}
