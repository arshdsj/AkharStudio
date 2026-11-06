/**
 * Tooltip.tsx - Fast, responsive, token-styled tooltip component
 * Eliminates native HTML title hover delays and provides smooth micro-interactions
 */

import React, { useState, useRef, useEffect } from 'react';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number; // ms delay before appearing (default 50ms for instant feel)
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'bottom',
  delay = 50,
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showTooltip = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (delay <= 0) {
      setIsVisible(true);
    } else {
      timeoutRef.current = setTimeout(() => {
        setIsVisible(true);
      }, delay);
    }
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-1.5',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-1.5',
    left: 'right-full top-1/2 -translate-y-1/2 mr-1.5',
    right: 'left-full top-1/2 -translate-y-1/2 ml-1.5',
  }[position];

  return (
    <div
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {children}
      {isVisible && content && (
        <div
          role="tooltip"
          className={`absolute ${positionClasses} z-[9999] pointer-events-none select-none whitespace-nowrap px-2 py-1 text-xs font-sans rounded shadow-lg transition-all duration-150 ease-out animate-in fade-in-0 zoom-in-95`}
          style={{
            background: 'var(--surface-overlay)',
            color: 'var(--text-primary)',
            border: '1px solid var(--line-separator)',
            boxShadow: 'var(--shadow-overlay)',
            borderRadius: 'var(--radius-sm)',
            fontSize: 'var(--text-xs)',
            lineHeight: 1.2,
          }}
        >
          {content}
        </div>
      )}
    </div>
  );
};
