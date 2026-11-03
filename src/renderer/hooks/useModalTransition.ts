import { useState, useEffect, useRef } from 'react';

/**
 * useModalTransition - Coordinates entrance and exit transitions for dialogs and modals.
 * When closing, it delays unmounting until the CSS exit animation completes.
 */
export function useModalTransition(isOpen: boolean, durationMs: number = 180) {
  const isTest = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';
  const effectiveDuration = isTest ? 0 : durationMs;

  const [mounted, setMounted] = useState(isOpen);
  const [isExiting, setIsExiting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setMounted(true);
      setIsExiting(false);
    } else if (mounted) {
      if (effectiveDuration <= 0) {
        setMounted(false);
        setIsExiting(false);
      } else {
        setIsExiting(true);
        timerRef.current = setTimeout(() => {
          setMounted(false);
          setIsExiting(false);
          timerRef.current = null;
        }, effectiveDuration);
      }
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isOpen, effectiveDuration, mounted]);

  return {
    mounted,
    isExiting,
    scrimClassName: isExiting ? 'ds-scrim is-exiting' : 'ds-scrim',
  };
}
