/**
 * paginationSetting.ts - Application Pagination Engine Settings & Mode Precedence
 * Governing ID: AKHAR-ARCH-PAG — Milestone M2E
 *
 * Manages the user-facing setting for choosing the screenplay pagination engine:
 * - 'legacy': The stable, production-default screenplay pagination plugin (line-estimation & CSS multi-column)
 * - 'unified': The new unified layout and pagination engine (font-metrics, line wrapping, slot pagination)
 *
 * Precedence Rules:
 * 1. Saved User Preference: If a valid preference is stored in localStorage ('legacy' or 'unified'), it takes precedence.
 * 2. Development / Test Override: If no valid preference is saved, environment/window flags are checked.
 * 3. Safe Production Default: Always defaults to 'legacy'.
 */

export type PaginationEngineSetting = 'legacy' | 'unified';

export const PAGINATION_SETTING_STORAGE_KEY = 'akhar_pagination_engine';
export const DEFAULT_PAGINATION_ENGINE: PaginationEngineSetting = 'legacy';

/**
 * Validates whether a value is a recognised PaginationEngineSetting.
 */
export function isValidPaginationEngine(val: unknown): val is PaginationEngineSetting {
  return val === 'legacy' || val === 'unified';
}

/**
 * Resolves the active pagination engine following deterministic precedence rules:
 * 1. Saved user preference in localStorage (if valid).
 * 2. Explicit development/test override (window.__AKHAR_USE_UNIFIED_PAGINATION__ or process.env.AKHAR_USE_UNIFIED_PAGINATION).
 * 3. Safe production default ('legacy').
 */
export function resolvePaginationEngine(
  savedPreference?: string | null,
  devOverride?: boolean
): PaginationEngineSetting {
  // 1. Saved user preference takes highest priority so dev flags don't silently override user choices
  if (savedPreference && isValidPaginationEngine(savedPreference)) {
    return savedPreference;
  }

  // 2. Explicit development or test override
  if (devOverride === true) {
    return 'unified';
  }

  // 3. Safe production default
  return DEFAULT_PAGINATION_ENGINE;
}

/**
 * Checks whether an explicit development override is currently active in the runtime environment.
 */
export function isDevPaginationOverrideActive(): boolean {
  if (typeof window !== 'undefined') {
    const win = window as unknown as { __AKHAR_USE_UNIFIED_PAGINATION__?: boolean };
    if (win.__AKHAR_USE_UNIFIED_PAGINATION__ === true) {
      return true;
    }
  }
  if (typeof process !== 'undefined' && process.env) {
    if (process.env.AKHAR_USE_UNIFIED_PAGINATION === '1') {
      return true;
    }
  }
  return false;
}

/**
 * Loads the active pagination engine setting from persistent application storage
 * applying full precedence resolution.
 */
export function getStoredPaginationEngine(): PaginationEngineSetting {
  let saved: string | null = null;
  try {
    if (typeof localStorage !== 'undefined') {
      saved = localStorage.getItem(PAGINATION_SETTING_STORAGE_KEY);
    }
  } catch (err) {
    console.warn('[PaginationSetting] Failed to read from localStorage:', err);
  }

  const devOverride = isDevPaginationOverrideActive();
  return resolvePaginationEngine(saved, devOverride);
}

/**
 * Persists the user's pagination engine choice to application storage.
 */
export function setStoredPaginationEngine(engine: PaginationEngineSetting): void {
  if (!isValidPaginationEngine(engine)) {
    console.warn(`[PaginationSetting] Invalid pagination engine '${engine}', ignoring set request.`);
    return;
  }
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(PAGINATION_SETTING_STORAGE_KEY, engine);
    }
  } catch (err) {
    console.warn('[PaginationSetting] Failed to write to localStorage:', err);
  }
}
