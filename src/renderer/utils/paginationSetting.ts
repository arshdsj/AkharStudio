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

export type PaginationEngineSetting = 'unified';

export const PAGINATION_SETTING_STORAGE_KEY = 'akhar_pagination_engine';
export const DEFAULT_PAGINATION_ENGINE: PaginationEngineSetting = 'unified';

/**
 * Validates whether a value is a recognised PaginationEngineSetting.
 */
export function isValidPaginationEngine(val: unknown): val is PaginationEngineSetting {
  return val === 'unified';
}

/**
 * Resolves the active pagination engine.
 * Unified pagination is the sole authoritative engine.
 */
export function resolvePaginationEngine(
  _savedPreference?: string | null,
  _devOverride?: boolean
): PaginationEngineSetting {
  return 'unified';
}

/**
 * Checks whether an explicit development override is currently active in the runtime environment.
 */
export function isDevPaginationOverrideActive(): boolean {
  return true;
}

/**
 * Loads the active pagination engine setting from persistent application storage,
 * migrating any legacy 'legacy' value to 'unified'.
 */
export function getStoredPaginationEngine(): PaginationEngineSetting {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(PAGINATION_SETTING_STORAGE_KEY);
      if (saved === 'legacy') {
        localStorage.setItem(PAGINATION_SETTING_STORAGE_KEY, 'unified');
      }
    }
  } catch (err) {
    console.warn('[PaginationSetting] Failed to read/migrate localStorage:', err);
  }

  return 'unified';
}

/**
 * Persists the user's pagination engine choice to application storage.
 */
export function setStoredPaginationEngine(engine: PaginationEngineSetting): void {
  if (engine !== 'unified' && engine !== 'legacy') {
    console.warn('[PaginationSetting] Invalid engine setting:', engine);
    return;
  }
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(PAGINATION_SETTING_STORAGE_KEY, 'unified');
    }
  } catch (err) {
    console.warn('[PaginationSetting] Failed to write to localStorage:', err);
  }
}
