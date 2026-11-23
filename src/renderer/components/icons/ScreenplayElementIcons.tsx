import React from 'react';
import { ScreenplayBlockType } from '../../../types/screenplay';

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  className?: string;
}

/**
 * Screenplay Element Icon System
 * Standardized across Akhar Studio:
 * 16px grid, 1.5px stroke, round caps/joins, outline only.
 */

export const SceneHeadingIcon: React.FC<IconProps> = ({ size = 16, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`shrink-0 ${className}`}
    aria-hidden="true"
    {...props}
  >
    <rect x="2" y="3" width="12" height="10" rx="1.5" />
    <circle cx="5.75" cy="6.5" r="0.9" />
    <path d="M2.5 11.5l3.2-3.2 2.3 2.3 2-2 3.5 3.5" />
  </svg>
);

export const ActionIcon: React.FC<IconProps> = ({ size = 16, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`shrink-0 ${className}`}
    aria-hidden="true"
    {...props}
  >
    <circle cx="8" cy="3.4" r="1.4" />
    <path d="M8 6.2v4M5.4 7.6h5.2M6.4 14.2L8 10.2l1.6 4" />
  </svg>
);

export const CharacterIcon: React.FC<IconProps> = ({ size = 16, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`shrink-0 ${className}`}
    aria-hidden="true"
    {...props}
  >
    <circle cx="8" cy="5.4" r="2.4" />
    <path d="M3.2 13.5c.6-2.6 2.5-4 4.8-4s4.2 1.4 4.8 4" />
  </svg>
);

export const ParentheticalIcon: React.FC<IconProps> = ({ size = 16, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`shrink-0 ${className}`}
    aria-hidden="true"
    {...props}
  >
    <path d="M5.6 2.4C3.7 4.6 3.7 11.4 5.6 13.6M10.4 2.4c1.9 2.2 1.9 9 0 11.2" />
  </svg>
);

export const DialogueIcon: React.FC<IconProps> = ({ size = 16, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`shrink-0 ${className}`}
    aria-hidden="true"
    {...props}
  >
    <path d="M2.5 3.5h11v7.2h-6l-3 2.3v-2.3h-2z" />
  </svg>
);

export const ShotIcon: React.FC<IconProps> = ({ size = 16, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`shrink-0 ${className}`}
    aria-hidden="true"
    {...props}
  >
    <rect x="1.8" y="4.5" width="8.2" height="7" rx="1.5" />
    <path d="M10 7.5l4.2-2v5l-4.2-2" />
  </svg>
);

export const TransitionIcon: React.FC<IconProps> = ({ size = 16, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`shrink-0 ${className}`}
    aria-hidden="true"
    {...props}
  >
    <path d="M2.5 8h8M7.5 4.5L11 8l-3.5 3.5M13.5 3.5v9" />
  </svg>
);

export const MixedElementIcon: React.FC<IconProps> = ({ size = 16, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`shrink-0 ${className}`}
    aria-hidden="true"
    {...props}
  >
    <path d="M3 4.5h10M3 8h10M3 11.5h6" />
  </svg>
);

export const RailChevronRightIcon: React.FC<IconProps> = ({ size = 16, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`shrink-0 ${className}`}
    aria-hidden="true"
    {...props}
  >
    <path d="M6 3.5l4.5 4.5L6 12.5" />
  </svg>
);

export const RailChevronLeftIcon: React.FC<IconProps> = ({ size = 16, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`shrink-0 ${className}`}
    aria-hidden="true"
    {...props}
  >
    <path d="M10 3.5L5.5 8l4.5 4.5" />
  </svg>
);

/**
 * Returns the corresponding outline icon component for a screenplay element type.
 */
export function getScreenplayElementIcon(
  type: ScreenplayBlockType | 'mixed' | null,
  props?: IconProps
): React.ReactElement {
  switch (type) {
    case 'scene_heading':
      return <SceneHeadingIcon {...props} />;
    case 'action':
      return <ActionIcon {...props} />;
    case 'character':
      return <CharacterIcon {...props} />;
    case 'parenthetical':
      return <ParentheticalIcon {...props} />;
    case 'dialogue':
      return <DialogueIcon {...props} />;
    case 'shot':
      return <ShotIcon {...props} />;
    case 'transition':
      return <TransitionIcon {...props} />;
    case 'mixed':
    default:
      return <MixedElementIcon {...props} />;
  }
}
