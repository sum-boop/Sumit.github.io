import { useSyncExternalStore } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useIsTouch } from './useIsTouch';

export type MotionTier = 'native' | 'framer' | 'reduced';

let cachedSupportsScrollTimeline: boolean | null = null;

function checkScrollTimelineSupport(): boolean {
  if (cachedSupportsScrollTimeline !== null) return cachedSupportsScrollTimeline;
  if (typeof CSS === 'undefined' || typeof CSS.supports !== 'function') {
    cachedSupportsScrollTimeline = false;
    return false;
  }
  cachedSupportsScrollTimeline =
    CSS.supports('animation-timeline: view()') && CSS.supports('animation-range: entry 0%');
  return cachedSupportsScrollTimeline;
}

const subscribeNoop = () => () => {};

/**
 * Selects exactly one scroll-reveal engine so Tier 1 (native CSS scroll-driven
 * animations) and Tier 2 (Framer Motion whileInView) never double-animate.
 */
export function useMotionTier(): MotionTier {
  const prefersReducedMotion = useReducedMotion();
  const isTouch = useIsTouch();

  const nativeSupported = useSyncExternalStore(
    subscribeNoop,
    checkScrollTimelineSupport,
    () => false,
  );

  if (prefersReducedMotion) return 'reduced';
  if (nativeSupported && !isTouch) return 'native';
  return 'framer';
}
