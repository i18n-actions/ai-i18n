import type { TranslationUnit } from '../types/translation';
import type { PluralCategory } from '../icu/types';
/**
 * Options for building translation prompts
 */
export interface ContextBuilderOptions {
    /**
     * Additional context from user
     */
    userContext?: string;
    /**
     * Whether to preserve formatting
     */
    preserveFormatting: boolean;
    /**
     * Whether to preserve placeholders
     */
    preservePlaceholders: boolean;
    /**
     * Whether to detect and handle ICU patterns
     */
    handleICU: boolean;
    /**
     * Glossary terms to include
     */
    glossary?: Record<string, string>;
}
/**
 * Build the system prompt for translation
 */
export declare function buildSystemPrompt(sourceLanguage: string, targetLanguage: string, options?: Partial<ContextBuilderOptions>): string;
/**
 * Build the user prompt with strings to translate
 */
export declare function buildUserPrompt(units: TranslationUnit[], sourceLanguage: string, targetLanguage: string, options?: Partial<ContextBuilderOptions>): string;
/**
 * Build a prompt specifically for plural translation
 */
export declare function buildPluralPrompt(variable: string, sourceVariants: Array<{
    category: string;
    text: string;
}>, sourceLanguage: string, targetLanguage: string, targetCategories: PluralCategory[]): string;
/**
 * Validate that a translation preserves required elements
 */
export declare function validateTranslation(source: string, translation: string, options?: Partial<ContextBuilderOptions>): {
    valid: boolean;
    issues: string[];
};
/**
 * Extract context from surrounding strings
 */
export declare function extractSurroundingContext(unitId: string, allUnits: TranslationUnit[], contextSize?: number): string;
//# sourceMappingURL=context-builder.d.ts.map