/**
 * AkharStudioLogo.tsx - Official Branding & Identity Logo for AkharStudio
 *
 * Bold, modern, elegant logo reflecting premium Punjabi writing & screenplay craftsmanship.
 * Smoothly transitions between "AkharStudio" and "ਅੱਖਰStudio" every few minutes.
 */

import React, { useState, useEffect } from 'react';

interface AkharStudioLogoProps {
  className?: string;
  transitionIntervalMs?: number; // Defaults to 2 minutes (120,000ms)
  mode?: 'en' | 'pa'; // If provided, locks the logo to this specific mode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'hero'; // Sizing variant
}

export const AkharStudioLogo: React.FC<AkharStudioLogoProps> = ({
  className = '',
  transitionIntervalMs = 120_000, // 2 minutes
  mode,
  size = 'md',
}) => {
  // 'en' -> AkharStudio, 'pa' -> ਅੱਖਰStudio
  const [langMode, setLangMode] = useState<'en' | 'pa'>(mode || 'en');
  const [isAnimating, setIsAnimating] = useState<boolean>(false);

  useEffect(() => {
    if (mode) {
      setLangMode(mode);
    }
  }, [mode]);

  useEffect(() => {
    // If explicit mode is fixed from parent (e.g. Welcome Screen), do not auto-transition
    if (mode) return;

    const timer = setInterval(() => {
      triggerTransition();
    }, transitionIntervalMs);

    return () => clearInterval(timer);
  }, [transitionIntervalMs, mode]);

  const triggerTransition = () => {
    if (mode) return; // Locked by parent
    setIsAnimating(true);
    setTimeout(() => {
      setLangMode((prev) => (prev === 'en' ? 'pa' : 'en'));
      setIsAnimating(false);
    }, 300); // mid-point swap
  };

  const isHero = size === 'hero' || size === 'xl';
  const isLg = size === 'lg';
  const isSm = size === 'sm';

  return (
    <div
      onClick={mode ? undefined : triggerTransition}
      title={mode ? undefined : "AkharStudio (ਅੱਖਰStudio) — Click to switch logo script"}
      className={`flex items-center gap-3 select-none group ${mode ? '' : 'cursor-pointer'} transition-all duration-300 ${className}`}
    >
      {/* Premium Logo Mark: Stylized Gurmukhi 'ਅ' + Modern Pen Nib geometry */}
      <div
        className={`relative ${
          isHero
            ? 'w-14 h-14 rounded-2xl'
            : isLg
            ? 'w-10 h-10 rounded-xl'
            : isSm
            ? 'w-6 h-6 rounded-md'
            : 'w-7 h-7 rounded-lg'
        } bg-gradient-to-br from-zinc-800 via-zinc-900 to-[#18181b] border border-white/10 shadow-md flex items-center justify-center overflow-hidden group-hover:border-rose-500/50 group-hover:shadow-[0_0_12px_rgba(244,63,94,0.3)] transition-all duration-300 shrink-0`}
      >
        {/* Subtle ambient glow behind emblem */}
        <div className="absolute inset-0 bg-gradient-to-tr from-rose-500/15 via-transparent to-amber-500/10 opacity-70 group-hover:opacity-100 transition-opacity" />

        {/* Gurmukhi 'ਅ' Stylized Vector Mark */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`${
            isHero ? 'w-8 h-8' : isLg ? 'w-6 h-6' : isSm ? 'w-3.5 h-3.5' : 'w-4 h-4'
          } relative z-10 text-zinc-100 group-hover:text-rose-400 transition-colors duration-300`}
        >
          {/* Top horizontal Gurmukhi bar */}
          <path
            d="M5 6H19"
            stroke="currentColor"
            strokeWidth={isHero ? '2.5' : '2.2'}
            strokeLinecap="round"
          />
          {/* Elegant Punjabi 'ਅ' cursive curve looping into studio pen nib */}
          <path
            d="M8.5 6C8.5 8.2 10.2 9.8 12.5 9.8C14.8 9.8 16.5 11.2 16.5 13.5C16.5 16 14.5 18 12 18C9.8 18 8.2 16.5 8 14.5"
            stroke="currentColor"
            strokeWidth={isHero ? '2.3' : '2.0'}
            strokeLinecap="round"
          />
          {/* Vertical stem */}
          <path
            d="M16 6V18"
            stroke="currentColor"
            strokeWidth={isHero ? '2.5' : '2.2'}
            strokeLinecap="round"
          />
          {/* Core creative dot (Bindi / Essence) */}
          <circle cx="12" cy="13.5" r={isHero ? 2.0 : isLg ? 1.5 : 1.2} fill="#f43f5e" />
        </svg>
      </div>

      {/* Typography: Smoothly transitions between AkharStudio and ਅੱਖਰStudio */}
      <div
        className={`flex items-center ${
          isHero
            ? 'text-3xl font-bold'
            : isLg
            ? 'text-2xl font-bold'
            : isSm
            ? 'text-xs font-semibold'
            : 'text-sm font-semibold'
        } tracking-tight transition-transform duration-300`}
      >
        <span
          className={`transition-all duration-300 transform ${
            isAnimating
              ? 'opacity-0 scale-95 -translate-y-1'
              : 'opacity-100 scale-100 translate-y-0'
          } ${
            langMode === 'pa'
              ? `${
                  isHero
                    ? 'font-bold text-3xl text-white tracking-normal font-sans'
                    : isLg
                    ? 'font-bold text-2xl text-white tracking-normal font-sans'
                    : 'font-bold text-[15px] text-white tracking-normal font-sans'
                }`
              : `${
                  isHero
                    ? 'font-bold text-3xl text-white tracking-tight'
                    : isLg
                    ? 'font-bold text-2xl text-white tracking-tight'
                    : 'font-bold text-white tracking-tight'
                }`
          }`}
        >
          {langMode === 'en' ? 'Akhar' : 'ਅੱਖਰ'}
        </span>
        <span
          className={`text-zinc-400 font-medium ml-1 tracking-normal ${
            isHero ? 'text-3xl' : isLg ? 'text-2xl' : ''
          }`}
        >
          Studio
        </span>
        <span
          className={`${
            isHero
              ? 'ml-3 px-2 py-0.5 text-[11px]'
              : isLg
              ? 'ml-2 px-1.5 py-0.5 text-[10px]'
              : 'ml-1.5 px-1 py-0.2 text-[9px]'
          } font-semibold uppercase tracking-wider text-rose-400/90 bg-rose-500/10 border border-rose-500/20 rounded`}
        >
          Pro
        </span>
      </div>
    </div>
  );
};
