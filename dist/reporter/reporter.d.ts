import type { TranslationReport, FileReport, ErrorEntry, TranslationResponse, ExtractResult } from '../types/translation';
/**
 * Builder for creating translation reports
 */
export declare class ReportBuilder {
    private startTime;
    private endTime?;
    private provider;
    private model?;
    private sourceLanguage;
    private targetLanguages;
    private fileReports;
    private errors;
    private totalInputTokens;
    private totalOutputTokens;
    constructor();
    /**
     * Set configuration info
     */
    setConfig(config: {
        provider: string;
        model?: string;
        sourceLanguage: string;
        targetLanguages: string[];
    }): this;
    /**
     * Add a file report
     */
    addFileReport(report: FileReport): this;
    /**
     * Add an error
     */
    addError(error: ErrorEntry): this;
    /**
     * Add token usage from translation response
     */
    addTokenUsage(usage?: {
        inputTokens: number;
        outputTokens: number;
    }): this;
    /**
     * Create a file report from extraction and translation results
     */
    createFileReport(extractResult: ExtractResult, translationResponse: TranslationResponse, skipped?: number, failed?: number): FileReport;
    /**
     * Build the final report
     */
    build(): TranslationReport;
}
/**
 * Publish report to GitHub Actions outputs
 */
export declare function publishToActions(report: TranslationReport): void;
/**
 * Format duration in human-readable form
 */
export declare function formatDuration(ms: number): string;
/**
 * Create an error entry
 */
export declare function createErrorEntry(error: Error, code: string, unitId?: string, filePath?: string): ErrorEntry;
/**
 * Get report status emoji
 */
export declare function getStatusEmoji(report: TranslationReport): string;
/**
 * Simple report summary as string
 */
export declare function getReportSummary(report: TranslationReport): string;
//# sourceMappingURL=reporter.d.ts.map