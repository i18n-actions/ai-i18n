import * as core from '@actions/core';
import type {
  TranslationReport,
  FileReport,
  ErrorEntry,
  TranslationResponse,
  ExtractResult,
} from '../types/translation';
import { logger } from '../utils/logger';

/**
 * Builder for creating translation reports
 */
export class ReportBuilder {
  private startTime: Date;
  private endTime?: Date;
  private provider: string = '';
  private model?: string;
  private sourceLanguage: string = '';
  private targetLanguages: string[] = [];
  private fileReports: FileReport[] = [];
  private errors: ErrorEntry[] = [];
  private totalInputTokens = 0;
  private totalOutputTokens = 0;

  constructor() {
    this.startTime = new Date();
  }

  /**
   * Set configuration info
   */
  setConfig(config: {
    provider: string;
    model?: string;
    sourceLanguage: string;
    targetLanguages: string[];
  }): this {
    this.provider = config.provider;
    this.model = config.model;
    this.sourceLanguage = config.sourceLanguage;
    this.targetLanguages = config.targetLanguages;
    return this;
  }

  /**
   * Add a file report
   */
  addFileReport(report: FileReport): this {
    this.fileReports.push(report);
    return this;
  }

  /**
   * Add an error
   */
  addError(error: ErrorEntry): this {
    this.errors.push(error);
    return this;
  }

  /**
   * Add token usage from translation response
   */
  addTokenUsage(usage?: { inputTokens: number; outputTokens: number }): this {
    if (usage) {
      this.totalInputTokens += usage.inputTokens;
      this.totalOutputTokens += usage.outputTokens;
    }
    return this;
  }

  /**
   * Create a file report from extraction and translation results
   */
  createFileReport(
    extractResult: ExtractResult,
    translationResponse: TranslationResponse,
    skipped = 0,
    failed = 0
  ): FileReport {
    return {
      filePath: extractResult.filePath,
      targetLanguage: extractResult.targetLanguage,
      unitsProcessed: extractResult.units.length,
      unitsTranslated: translationResponse.translations.length,
      unitsFailed: failed,
      unitsSkipped: skipped,
    };
  }

  /**
   * Build the final report
   */
  build(): TranslationReport {
    this.endTime = new Date();

    const summary = this.fileReports.reduce(
      (acc, file) => ({
        totalFiles: acc.totalFiles + 1,
        totalUnits: acc.totalUnits + file.unitsProcessed,
        translatedUnits: acc.translatedUnits + file.unitsTranslated,
        failedUnits: acc.failedUnits + file.unitsFailed,
        skippedUnits: acc.skippedUnits + file.unitsSkipped,
      }),
      {
        totalFiles: 0,
        totalUnits: 0,
        translatedUnits: 0,
        failedUnits: 0,
        skippedUnits: 0,
      }
    );

    return {
      startTime: this.startTime,
      endTime: this.endTime,
      durationMs: this.endTime.getTime() - this.startTime.getTime(),
      config: {
        provider: this.provider,
        model: this.model,
        sourceLanguage: this.sourceLanguage,
        targetLanguages: this.targetLanguages,
      },
      files: this.fileReports,
      summary,
      errors: this.errors,
    };
  }
}

/**
 * Publish report to GitHub Actions outputs
 */
export function publishToActions(report: TranslationReport): void {
  // Set outputs
  core.setOutput('translated-count', report.summary.translatedUnits);
  core.setOutput('files-updated', report.summary.totalFiles);

  // Log summary
  logger.group('Translation Summary');
  logger.info(
    `Provider: ${report.config.provider}${report.config.model ? ` (${report.config.model})` : ''}`
  );
  logger.info(
    `Languages: ${report.config.sourceLanguage} → ${report.config.targetLanguages.join(', ')}`
  );
  logger.info(`Duration: ${formatDuration(report.durationMs)}`);
  logger.info(`Files processed: ${report.summary.totalFiles}`);
  logger.info(`Strings translated: ${report.summary.translatedUnits}/${report.summary.totalUnits}`);

  if (report.summary.failedUnits > 0) {
    logger.warning(`Failed translations: ${report.summary.failedUnits}`);
  }

  if (report.summary.skippedUnits > 0) {
    logger.info(`Skipped (unchanged): ${report.summary.skippedUnits}`);
  }

  logger.groupEnd();

  // Log errors if any
  if (report.errors.length > 0) {
    logger.group('Errors');
    for (const error of report.errors) {
      logger.error(`[${error.code}] ${error.message}`, {
        unitId: error.unitId,
        filePath: error.filePath,
      });
    }
    logger.groupEnd();
  }
}

/**
 * Format duration in human-readable form
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }

  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes < 60) {
    return `${minutes}m ${remainingSeconds}s`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Create an error entry
 */
export function createErrorEntry(
  error: Error,
  code: string,
  unitId?: string,
  filePath?: string
): ErrorEntry {
  return {
    message: error.message,
    code,
    unitId,
    filePath,
    timestamp: new Date(),
  };
}

/**
 * Get report status emoji
 */
export function getStatusEmoji(report: TranslationReport): string {
  if (report.errors.length > 0 || report.summary.failedUnits > 0) {
    return '⚠️';
  }
  if (report.summary.translatedUnits === 0) {
    return '📭';
  }
  return '✅';
}

/**
 * Simple report summary as string
 */
export function getReportSummary(report: TranslationReport): string {
  const status = getStatusEmoji(report);
  return `${status} Translated ${report.summary.translatedUnits}/${report.summary.totalUnits} strings in ${report.summary.totalFiles} files`;
}
