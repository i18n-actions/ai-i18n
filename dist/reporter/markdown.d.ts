import type { TranslationReport, FileReport } from '../types/translation';
/**
 * Generate a markdown report
 */
export declare function generateMarkdownReport(report: TranslationReport): string;
/**
 * Generate a compact summary for PR comments
 */
export declare function generateCompactSummary(report: TranslationReport): string;
/**
 * Generate a table of changes for PR description
 */
export declare function generateChangesTable(files: FileReport[]): string;
/**
 * Generate badges for README
 */
export declare function generateBadges(report: TranslationReport): string;
/**
 * Generate JSON summary for machine parsing
 */
export declare function generateJsonSummary(report: TranslationReport): string;
//# sourceMappingURL=markdown.d.ts.map