/**
 * Core translation types used throughout the application
 */

/**
 * Metadata associated with a translation unit
 */
export interface TranslationUnitMetadata {
  file: string;
  line?: number;
  notes?: string;
  context?: string;
  maxLength?: number;
  state?: string;
  approved?: boolean;
}

/**
 * A single translation unit (string to be translated)
 */
export interface TranslationUnit {
  id: string;
  source: string;
  target?: string;
  context?: string;
  metadata: TranslationUnitMetadata;
  hash: string;
}

/**
 * File format information
 */
export interface FormatInfo {
  format: 'xliff-1.2' | 'xliff-2.0' | 'json-flat' | 'json-nested';
  version?: string;
  encoding?: string;
}

/**
 * Result of extracting translation units from a file
 */
export interface ExtractResult {
  filePath: string;
  sourceLanguage: string;
  targetLanguage: string;
  units: TranslationUnit[];
  formatInfo: FormatInfo;
  originalContent: string;
  preservedData?: Record<string, unknown>;
}

/**
 * Request to translate a batch of units
 */
export interface TranslationRequest {
  units: TranslationUnit[];
  sourceLanguage: string;
  targetLanguage: string;
  context?: string;
  preserveFormatting: boolean;
  preservePlaceholders: boolean;
}

/**
 * Result of a translation request
 */
export interface TranslationResponse {
  translations: TranslatedUnit[];
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
  provider: string;
  model: string;
}

/**
 * A translated unit
 */
export interface TranslatedUnit {
  id: string;
  source: string;
  target: string;
  confidence?: number;
}

/**
 * Result of formatting translated units back to file
 */
export interface FormatResult {
  content: string;
  updatedCount: number;
  unchangedCount: number;
}

/**
 * Change type for diffing
 */
export type ChangeType = 'new' | 'modified' | 'deleted' | 'unchanged';

/**
 * A diff entry showing what changed
 */
export interface DiffEntry {
  unit: TranslationUnit;
  changeType: ChangeType;
  previousHash?: string;
}

/**
 * Result of comparing two sets of translation units
 */
export interface DiffResult {
  entries: DiffEntry[];
  summary: {
    new: number;
    modified: number;
    deleted: number;
    unchanged: number;
    total: number;
  };
}

/**
 * Translation report for output
 */
export interface TranslationReport {
  startTime: Date;
  endTime: Date;
  durationMs: number;
  config: {
    provider: string;
    model?: string;
    sourceLanguage: string;
    targetLanguages: string[];
  };
  files: FileReport[];
  summary: {
    totalFiles: number;
    totalUnits: number;
    translatedUnits: number;
    failedUnits: number;
    skippedUnits: number;
  };
  errors: ErrorEntry[];
}

/**
 * Report for a single file
 */
export interface FileReport {
  filePath: string;
  targetLanguage: string;
  unitsProcessed: number;
  unitsTranslated: number;
  unitsFailed: number;
  unitsSkipped: number;
}

/**
 * Error entry for reporting
 */
export interface ErrorEntry {
  unitId?: string;
  filePath?: string;
  message: string;
  code: string;
  timestamp: Date;
}
