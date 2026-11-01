/**
 * customDictionary.ts - Local-First Offline Custom Gurmukhi Dictionary
 * Manages user-defined Roman trigger/alias -> Gurmukhi mappings,
 * TSV import/export, local persistence, and conflict prevention.
 */

export interface CustomDictionaryEntry {
  id: string;
  gurmukhi: string;
  aliases: string[]; // lowercased Roman triggers
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface TSVImportResult {
  added: number;
  updated: number;
  errors: string[];
  totalRows: number;
}

export class CustomDictionary {
  private static STORAGE_KEY = 'punjabi_custom_dict';
  private entries: Map<string, CustomDictionaryEntry> = new Map();
  // Reverse lookup: normalized Roman alias -> entry ID
  private aliasMap: Map<string, string> = new Map();

  constructor() {
    this.load();
  }

  /**
   * Normalize Roman trigger: trimmed, lowercased
   */
  public static normalizeRoman(alias: string): string {
    return alias.trim().toLowerCase();
  }

  /**
   * Normalize Gurmukhi text: trimmed, canonical NFC
   */
  public static normalizeGurmukhi(text: string): string {
    return text.trim().normalize('NFC');
  }

  /**
   * Load entries from localStorage
   */
  public load(): void {
    this.entries.clear();
    this.aliasMap.clear();

    if (typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem(CustomDictionary.STORAGE_KEY);
        if (raw) {
          const list: CustomDictionaryEntry[] = JSON.parse(raw);
          for (const item of list) {
            this.setInternal(item);
          }
        }
      } catch (err) {
        console.warn('Failed to load custom dictionary from localStorage:', err);
      }
    }
  }

  /**
   * Save entries to localStorage
   */
  public save(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        const list = Array.from(this.entries.values());
        localStorage.setItem(CustomDictionary.STORAGE_KEY, JSON.stringify(list));
      } catch (err) {
        console.warn('Failed to save custom dictionary to localStorage:', err);
      }
    }
  }

  private setInternal(entry: CustomDictionaryEntry): void {
    const normGurmukhi = CustomDictionary.normalizeGurmukhi(entry.gurmukhi);
    const normAliases = Array.from(
      new Set(
        entry.aliases
          .map((a) => CustomDictionary.normalizeRoman(a))
          .filter((a) => a.length > 0)
      )
    );

    const cleanEntry: CustomDictionaryEntry = {
      ...entry,
      gurmukhi: normGurmukhi,
      aliases: normAliases,
    };

    this.entries.set(cleanEntry.id, cleanEntry);
    for (const alias of normAliases) {
      this.aliasMap.set(alias, cleanEntry.id);
    }
  }

  /**
   * Find if an alias already exists in the dictionary
   */
  public findConflict(alias: string, excludeEntryId?: string): CustomDictionaryEntry | null {
    const norm = CustomDictionary.normalizeRoman(alias);
    const existingId = this.aliasMap.get(norm);
    if (!existingId || existingId === excludeEntryId) return null;
    return this.entries.get(existingId) || null;
  }

  /**
   * Add a new entry.
   * If allowOverwrite is false, throws an error if any alias already exists.
   */
  public addEntry(
    gurmukhi: string,
    aliases: string[],
    notes?: string,
    allowOverwrite: boolean = false
  ): CustomDictionaryEntry {
    const normGurmukhi = CustomDictionary.normalizeGurmukhi(gurmukhi);
    if (!normGurmukhi) {
      throw new Error('Gurmukhi word cannot be empty');
    }

    const normAliases = Array.from(
      new Set(
        aliases
          .map((a) => CustomDictionary.normalizeRoman(a))
          .filter((a) => a.length > 0)
      )
    );

    if (normAliases.length === 0) {
      throw new Error('At least one Roman trigger/alias is required');
    }

    // Check for alias conflicts
    for (const alias of normAliases) {
      const conflict = this.findConflict(alias);
      if (conflict) {
        if (!allowOverwrite) {
          throw new Error(
            `Trigger "${alias}" is already assigned to "${conflict.gurmukhi}". Explicitly confirm to overwrite.`
          );
        } else {
          // Remove conflicting alias from other entry
          conflict.aliases = conflict.aliases.filter((a) => a !== alias);
          if (conflict.aliases.length === 0) {
            this.entries.delete(conflict.id);
          } else {
            conflict.updatedAt = Date.now();
          }
        }
      }
    }

    const now = Date.now();
    const entry: CustomDictionaryEntry = {
      id: `custom_${now}_${Math.random().toString(36).slice(2, 8)}`,
      gurmukhi: normGurmukhi,
      aliases: normAliases,
      notes: notes?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    };

    this.setInternal(entry);
    this.save();
    return entry;
  }

  /**
   * Update an existing entry
   */
  public updateEntry(
    id: string,
    gurmukhi: string,
    aliases: string[],
    notes?: string,
    allowOverwrite: boolean = false
  ): CustomDictionaryEntry {
    const existing = this.entries.get(id);
    if (!existing) {
      throw new Error(`Entry with id "${id}" not found`);
    }

    const normGurmukhi = CustomDictionary.normalizeGurmukhi(gurmukhi);
    if (!normGurmukhi) {
      throw new Error('Gurmukhi word cannot be empty');
    }

    const normAliases = Array.from(
      new Set(
        aliases
          .map((a) => CustomDictionary.normalizeRoman(a))
          .filter((a) => a.length > 0)
      )
    );

    if (normAliases.length === 0) {
      throw new Error('At least one Roman trigger/alias is required');
    }

    // Check conflicts
    for (const alias of normAliases) {
      const conflict = this.findConflict(alias, id);
      if (conflict) {
        if (!allowOverwrite) {
          throw new Error(
            `Trigger "${alias}" is already assigned to "${conflict.gurmukhi}". Explicitly confirm to overwrite.`
          );
        } else {
          conflict.aliases = conflict.aliases.filter((a) => a !== alias);
          if (conflict.aliases.length === 0) {
            this.entries.delete(conflict.id);
          } else {
            conflict.updatedAt = Date.now();
          }
        }
      }
    }

    // Clear old aliases from map
    for (const oldAlias of existing.aliases) {
      if (this.aliasMap.get(oldAlias) === id) {
        this.aliasMap.delete(oldAlias);
      }
    }

    existing.gurmukhi = normGurmukhi;
    existing.aliases = normAliases;
    existing.notes = notes?.trim() || undefined;
    existing.updatedAt = Date.now();

    this.setInternal(existing);
    this.save();
    return existing;
  }

  /**
   * Delete an entry by ID
   */
  public deleteEntry(id: string): boolean {
    const entry = this.entries.get(id);
    if (!entry) return false;

    for (const alias of entry.aliases) {
      if (this.aliasMap.get(alias) === id) {
        this.aliasMap.delete(alias);
      }
    }
    this.entries.delete(id);
    this.save();
    return true;
  }

  /**
   * Get all entries as an array sorted by Gurmukhi text
   */
  public getAllEntries(): CustomDictionaryEntry[] {
    return Array.from(this.entries.values()).sort((a, b) =>
      a.gurmukhi.localeCompare(b.gurmukhi, 'pa')
    );
  }

  /**
   * Get exact match Gurmukhi candidate(s) for a Roman input
   */
  public getExactMatches(roman: string): string[] {
    const norm = CustomDictionary.normalizeRoman(roman);
    const entryId = this.aliasMap.get(norm);
    if (!entryId) return [];
    const entry = this.entries.get(entryId);
    return entry ? [entry.gurmukhi] : [];
  }

  /**
   * Export all entries to UTF-8 TSV format.
   * Format: roman_triggers\tgurmukhi\tnotes
   */
  public exportTSV(): string {
    const header = 'triggers\tgurmukhi\tnotes\n';
    const rows = Array.from(this.entries.values()).map((entry) => {
      const triggers = entry.aliases.join(', ');
      const gurmukhi = entry.gurmukhi;
      const notes = entry.notes ? entry.notes.replace(/[\t\n\r]/g, ' ') : '';
      return `${triggers}\t${gurmukhi}\t${notes}`;
    });
    return header + rows.join('\n');
  }

  /**
   * Import entries from a TSV string.
   * Validates line by line; logs malformed rows without losing valid ones.
   */
  public importTSV(tsvString: string, overwriteConflicts: boolean = true): TSVImportResult {
    const lines = tsvString.split(/\r?\n/);
    const result: TSVImportResult = {
      added: 0,
      updated: 0,
      errors: [],
      totalRows: 0,
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].replace(/[\r\n]/g, '');
      if (!line.trim() || line.trim().startsWith('#')) continue; // Skip empty lines and comments

      // Detect header
      if (i === 0 && line.toLowerCase().includes('triggers') && line.toLowerCase().includes('gurmukhi')) {
        continue;
      }

      result.totalRows++;
      const cols = line.split('\t');
      if (cols.length < 2) {
        result.errors.push(`Line ${i + 1}: Malformed row (must have at least 2 tab-separated columns): "${line}"`);
        continue;
      }

      const rawTriggers = cols[0].trim();
      const rawGurmukhi = cols[1].trim();
      const rawNotes = cols[2]?.trim() || '';

      const aliases = rawTriggers
        .split(/[,;|]/)
        .map((a) => a.trim())
        .filter((a) => a.length > 0);

      const normGurmukhi = CustomDictionary.normalizeGurmukhi(rawGurmukhi);

      if (!normGurmukhi) {
        result.errors.push(`Line ${i + 1}: Gurmukhi word is missing`);
        continue;
      }
      if (aliases.length === 0) {
        result.errors.push(`Line ${i + 1}: No valid Roman triggers found for "${normGurmukhi}"`);
        continue;
      }

      try {
        // Check if an entry with this Gurmukhi word already exists
        const existingEntry = Array.from(this.entries.values()).find(
          (e) => e.gurmukhi === normGurmukhi
        );

        if (existingEntry) {
          const mergedAliases = Array.from(new Set([...existingEntry.aliases, ...aliases]));
          this.updateEntry(
            existingEntry.id,
            existingEntry.gurmukhi,
            mergedAliases,
            rawNotes || existingEntry.notes,
            overwriteConflicts
          );
          result.updated++;
        } else {
          this.addEntry(normGurmukhi, aliases, rawNotes, overwriteConflicts);
          result.added++;
        }
      } catch (err) {
        result.errors.push(`Line ${i + 1}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return result;
  }
}
