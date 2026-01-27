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
export const PLURAL_RULES: Record<string, PluralRuleSet> = {
  // English - simple 'one' and 'other'
  en: {
    cardinalCategories: ['one', 'other'],
    ordinalCategories: ['one', 'two', 'few', 'other'],
    cardinalExamples: {
      one: [1],
      other: [0, 2, 3, 4, 5, 10, 100],
    },
    ordinalExamples: {
      one: [1, 21, 31, 41],
      two: [2, 22, 32, 42],
      few: [3, 23, 33, 43],
      other: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
    },
  },

  // German - same as English
  de: {
    cardinalCategories: ['one', 'other'],
    ordinalCategories: ['other'],
    cardinalExamples: {
      one: [1],
      other: [0, 2, 3, 4, 5, 10, 100],
    },
    ordinalExamples: {
      other: [1, 2, 3, 4, 5, 10, 100],
    },
  },

  // French - 'one' includes 0 in some contexts
  fr: {
    cardinalCategories: ['one', 'many', 'other'],
    ordinalCategories: ['one', 'other'],
    cardinalExamples: {
      one: [0, 1],
      many: [1000000],
      other: [2, 3, 4, 5, 10, 100],
    },
    ordinalExamples: {
      one: [1],
      other: [2, 3, 4, 5, 10, 100],
    },
  },

  // Spanish
  es: {
    cardinalCategories: ['one', 'many', 'other'],
    ordinalCategories: ['other'],
    cardinalExamples: {
      one: [1],
      many: [1000000],
      other: [0, 2, 3, 4, 5, 10, 100],
    },
    ordinalExamples: {
      other: [1, 2, 3, 4, 5, 10, 100],
    },
  },

  // Italian
  it: {
    cardinalCategories: ['one', 'many', 'other'],
    ordinalCategories: ['many', 'other'],
    cardinalExamples: {
      one: [1],
      many: [1000000],
      other: [0, 2, 3, 4, 5, 10, 100],
    },
    ordinalExamples: {
      many: [8, 11, 80, 800],
      other: [1, 2, 3, 4, 5, 10, 100],
    },
  },

  // Portuguese
  pt: {
    cardinalCategories: ['one', 'many', 'other'],
    ordinalCategories: ['other'],
    cardinalExamples: {
      one: [1],
      many: [1000000],
      other: [0, 2, 3, 4, 5, 10, 100],
    },
    ordinalExamples: {
      other: [1, 2, 3, 4, 5, 10, 100],
    },
  },

  // Russian - complex with 'one', 'few', 'many', 'other'
  ru: {
    cardinalCategories: ['one', 'few', 'many', 'other'],
    ordinalCategories: ['other'],
    cardinalExamples: {
      one: [1, 21, 31, 41, 51, 61],
      few: [2, 3, 4, 22, 23, 24, 32, 33, 34],
      many: [0, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
      other: [1.5, 2.5],
    },
    ordinalExamples: {
      other: [1, 2, 3, 4, 5, 10, 100],
    },
  },

  // Polish - similar to Russian
  pl: {
    cardinalCategories: ['one', 'few', 'many', 'other'],
    ordinalCategories: ['other'],
    cardinalExamples: {
      one: [1],
      few: [2, 3, 4, 22, 23, 24, 32, 33, 34],
      many: [0, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 25],
      other: [1.5, 2.5],
    },
    ordinalExamples: {
      other: [1, 2, 3, 4, 5, 10, 100],
    },
  },

  // Ukrainian - similar to Russian
  uk: {
    cardinalCategories: ['one', 'few', 'many', 'other'],
    ordinalCategories: ['few', 'other'],
    cardinalExamples: {
      one: [1, 21, 31, 41],
      few: [2, 3, 4, 22, 23, 24, 32, 33, 34],
      many: [0, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
      other: [1.5, 2.5],
    },
    ordinalExamples: {
      few: [3, 23, 33, 43],
      other: [1, 2, 4, 5, 10, 100],
    },
  },

  // Arabic - most complex with all categories
  ar: {
    cardinalCategories: ['zero', 'one', 'two', 'few', 'many', 'other'],
    ordinalCategories: ['other'],
    cardinalExamples: {
      zero: [0],
      one: [1],
      two: [2],
      few: [3, 4, 5, 6, 7, 8, 9, 10, 103, 104, 105],
      many: [11, 12, 13, 14, 15, 16, 17, 18, 19, 99, 111, 112],
      other: [100, 101, 102, 200, 201, 202],
    },
    ordinalExamples: {
      other: [1, 2, 3, 4, 5, 10, 100],
    },
  },

  // Japanese - only 'other'
  ja: {
    cardinalCategories: ['other'],
    ordinalCategories: ['other'],
    cardinalExamples: {
      other: [0, 1, 2, 3, 4, 5, 10, 100],
    },
    ordinalExamples: {
      other: [1, 2, 3, 4, 5, 10, 100],
    },
  },

  // Chinese - only 'other'
  zh: {
    cardinalCategories: ['other'],
    ordinalCategories: ['other'],
    cardinalExamples: {
      other: [0, 1, 2, 3, 4, 5, 10, 100],
    },
    ordinalExamples: {
      other: [1, 2, 3, 4, 5, 10, 100],
    },
  },

  // Korean - only 'other'
  ko: {
    cardinalCategories: ['other'],
    ordinalCategories: ['other'],
    cardinalExamples: {
      other: [0, 1, 2, 3, 4, 5, 10, 100],
    },
    ordinalExamples: {
      other: [1, 2, 3, 4, 5, 10, 100],
    },
  },

  // Turkish - only 'one' and 'other'
  tr: {
    cardinalCategories: ['one', 'other'],
    ordinalCategories: ['other'],
    cardinalExamples: {
      one: [1],
      other: [0, 2, 3, 4, 5, 10, 100],
    },
    ordinalExamples: {
      other: [1, 2, 3, 4, 5, 10, 100],
    },
  },

  // Dutch
  nl: {
    cardinalCategories: ['one', 'other'],
    ordinalCategories: ['other'],
    cardinalExamples: {
      one: [1],
      other: [0, 2, 3, 4, 5, 10, 100],
    },
    ordinalExamples: {
      other: [1, 2, 3, 4, 5, 10, 100],
    },
  },

  // Swedish
  sv: {
    cardinalCategories: ['one', 'other'],
    ordinalCategories: ['one', 'other'],
    cardinalExamples: {
      one: [1],
      other: [0, 2, 3, 4, 5, 10, 100],
    },
    ordinalExamples: {
      one: [1, 2, 21, 22, 31, 32],
      other: [3, 4, 5, 10, 100],
    },
  },

  // Norwegian (Bokmål)
  nb: {
    cardinalCategories: ['one', 'other'],
    ordinalCategories: ['other'],
    cardinalExamples: {
      one: [1],
      other: [0, 2, 3, 4, 5, 10, 100],
    },
    ordinalExamples: {
      other: [1, 2, 3, 4, 5, 10, 100],
    },
  },

  // Danish
  da: {
    cardinalCategories: ['one', 'other'],
    ordinalCategories: ['other'],
    cardinalExamples: {
      one: [1],
      other: [0, 2, 3, 4, 5, 10, 100],
    },
    ordinalExamples: {
      other: [1, 2, 3, 4, 5, 10, 100],
    },
  },

  // Finnish - only 'one' and 'other'
  fi: {
    cardinalCategories: ['one', 'other'],
    ordinalCategories: ['other'],
    cardinalExamples: {
      one: [1],
      other: [0, 2, 3, 4, 5, 10, 100],
    },
    ordinalExamples: {
      other: [1, 2, 3, 4, 5, 10, 100],
    },
  },

  // Czech - has 'one', 'few', 'many', 'other'
  cs: {
    cardinalCategories: ['one', 'few', 'many', 'other'],
    ordinalCategories: ['other'],
    cardinalExamples: {
      one: [1],
      few: [2, 3, 4],
      many: [1.5, 2.5],
      other: [0, 5, 6, 7, 8, 9, 10, 11, 100],
    },
    ordinalExamples: {
      other: [1, 2, 3, 4, 5, 10, 100],
    },
  },

  // Hebrew
  he: {
    cardinalCategories: ['one', 'two', 'many', 'other'],
    ordinalCategories: ['other'],
    cardinalExamples: {
      one: [1],
      two: [2],
      many: [20, 30, 100],
      other: [0, 3, 4, 5, 10, 11, 12],
    },
    ordinalExamples: {
      other: [1, 2, 3, 4, 5, 10, 100],
    },
  },

  // Hindi
  hi: {
    cardinalCategories: ['one', 'other'],
    ordinalCategories: ['one', 'two', 'few', 'many', 'other'],
    cardinalExamples: {
      one: [0, 1],
      other: [2, 3, 4, 5, 10, 100],
    },
    ordinalExamples: {
      one: [1],
      two: [2, 3],
      few: [4],
      many: [6],
      other: [5, 7, 8, 9, 10, 100],
    },
  },

  // Thai - only 'other'
  th: {
    cardinalCategories: ['other'],
    ordinalCategories: ['other'],
    cardinalExamples: {
      other: [0, 1, 2, 3, 4, 5, 10, 100],
    },
    ordinalExamples: {
      other: [1, 2, 3, 4, 5, 10, 100],
    },
  },

  // Vietnamese - only 'other'
  vi: {
    cardinalCategories: ['other'],
    ordinalCategories: ['one', 'other'],
    cardinalExamples: {
      other: [0, 1, 2, 3, 4, 5, 10, 100],
    },
    ordinalExamples: {
      one: [1],
      other: [2, 3, 4, 5, 10, 100],
    },
  },
};

/**
 * Default rule set for unknown languages
 */
const DEFAULT_RULES: PluralRuleSet = {
  cardinalCategories: ['one', 'other'],
  ordinalCategories: ['other'],
  cardinalExamples: {
    one: [1],
    other: [0, 2, 3, 4, 5, 10, 100],
  },
  ordinalExamples: {
    other: [1, 2, 3, 4, 5, 10, 100],
  },
};

/**
 * Get plural rules for a language
 *
 * @param languageCode Language code (e.g., 'en', 'en-US', 'zh-Hans')
 * @returns Plural rule set for the language
 */
export function getPluralRules(languageCode: string): PluralRuleSet {
  // Normalize language code (lowercase, handle subtags)
  const normalized = languageCode.toLowerCase().split('-')[0];

  if (!normalized) {
    return DEFAULT_RULES;
  }

  return PLURAL_RULES[normalized] ?? DEFAULT_RULES;
}

/**
 * Get required cardinal categories for a language
 */
export function getCardinalCategories(languageCode: string): PluralCategory[] {
  return getPluralRules(languageCode).cardinalCategories;
}

/**
 * Get required ordinal categories for a language
 */
export function getOrdinalCategories(languageCode: string): PluralCategory[] {
  return getPluralRules(languageCode).ordinalCategories;
}

/**
 * Get example numbers for a category in a language
 */
export function getCategoryExamples(
  languageCode: string,
  category: PluralCategory,
  isOrdinal = false
): number[] {
  const rules = getPluralRules(languageCode);
  const examples = isOrdinal ? rules.ordinalExamples : rules.cardinalExamples;
  return examples[category] ?? [];
}

/**
 * Format category description for prompts
 */
export function formatCategoryDescription(
  category: PluralCategory,
  languageCode: string,
  isOrdinal = false
): string {
  const examples = getCategoryExamples(languageCode, category, isOrdinal);
  const exampleStr = examples.length > 0 ? ` (e.g., ${examples.slice(0, 5).join(', ')})` : '';

  const descriptions: Record<PluralCategory, string> = {
    zero: 'Used for zero quantity',
    one: 'Used for singular (typically 1)',
    two: 'Used for dual (typically 2)',
    few: 'Used for small numbers',
    many: 'Used for larger numbers',
    other: 'Default/fallback form',
  };

  return `${category}: ${descriptions[category]}${exampleStr}`;
}
