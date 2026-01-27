/**
 * ICU Message Reconstructor
 *
 * Rebuilds valid ICU MessageFormat messages from translated parts.
 */
import type { ParsedICUMessage, PluralTranslationResponse, PluralVariant, SelectOption, SelectTranslationResponse } from './types';
/**
 * Options for reconstruction
 */
export interface ReconstructOptions {
    /**
     * Target language code for CLDR rule validation
     */
    targetLanguage?: string;
    /**
     * Whether to validate plural categories against CLDR rules
     */
    validateCategories?: boolean;
    /**
     * Whether to preserve exact matches (=0, =1, etc.)
     */
    preserveExactMatches?: boolean;
}
/**
 * Reconstruct a complete ICU message from translated parts
 */
export declare function reconstructICUMessage(parsed: ParsedICUMessage, translations: {
    text?: Map<number, string>;
    plurals?: Map<string, PluralTranslationResponse>;
    selects?: Map<string, SelectTranslationResponse>;
}, options?: ReconstructOptions): string;
/**
 * Reconstruct a plural element
 */
export declare function reconstructPlural(name: string, variants: PluralVariant[], offset?: number, options?: ReconstructOptions): string;
/**
 * Reconstruct a selectordinal element
 */
export declare function reconstructSelectordinal(name: string, variants: PluralVariant[], options?: ReconstructOptions): string;
/**
 * Reconstruct a select element
 */
export declare function reconstructSelect(name: string, options: SelectOption[]): string;
/**
 * Build a complete ICU message from simple text translation
 * Used when the entire message (including ICU patterns) is translated as one
 */
export declare function buildICUFromTranslation(original: ParsedICUMessage, translatedText: string): string;
/**
 * Extract text segments from parsed message for translation
 */
export declare function extractTextSegments(parsed: ParsedICUMessage): Array<{
    index: number;
    text: string;
    context?: string;
}>;
/**
 * Create plural variants for a target language based on source variants
 */
export declare function createTargetPluralVariants(sourceVariants: PluralVariant[], targetLanguage: string, isOrdinal: boolean): PluralVariant[];
//# sourceMappingURL=reconstructor.d.ts.map