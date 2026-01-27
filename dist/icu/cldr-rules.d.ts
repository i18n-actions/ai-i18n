/**
 * CLDR Plural Rules
 *
 * This module provides plural category requirements for languages based on CLDR data.
 * Languages have different plural rules - some have only 'one' and 'other',
 * while others like Russian have 'one', 'few', 'many', and 'other'.
 *
 * Reference: https://cldr.unicode.org/index/cldr-spec/plural-rules
 */
import type { PluralCategory } from './types';
/**
 * Plural rule set for a language
 */
export interface PluralRuleSet {
    /**
     * Required plural categories for this language
     */
    cardinalCategories: PluralCategory[];
    /**
     * Required ordinal categories for this language
     */
    ordinalCategories: PluralCategory[];
    /**
     * Example numbers for each category (useful for prompts)
     */
    cardinalExamples: Partial<Record<PluralCategory, number[]>>;
    /**
     * Example numbers for ordinals
     */
    ordinalExamples: Partial<Record<PluralCategory, number[]>>;
}
/**
 * CLDR plural rules by language code
 *
 * This is a subset of CLDR rules covering common languages.
 * For a complete list, see: https://unicode-org.github.io/cldr-staging/charts/latest/supplemental/language_plural_rules.html
 */
export declare const PLURAL_RULES: Record<string, PluralRuleSet>;
/**
 * Get plural rules for a language
 *
 * @param languageCode Language code (e.g., 'en', 'en-US', 'zh-Hans')
 * @returns Plural rule set for the language
 */
export declare function getPluralRules(languageCode: string): PluralRuleSet;
/**
 * Get required cardinal categories for a language
 */
export declare function getCardinalCategories(languageCode: string): PluralCategory[];
/**
 * Get required ordinal categories for a language
 */
export declare function getOrdinalCategories(languageCode: string): PluralCategory[];
/**
 * Get example numbers for a category in a language
 */
export declare function getCategoryExamples(languageCode: string, category: PluralCategory, isOrdinal?: boolean): number[];
/**
 * Format category description for prompts
 */
export declare function formatCategoryDescription(category: PluralCategory, languageCode: string, isOrdinal?: boolean): string;
//# sourceMappingURL=cldr-rules.d.ts.map