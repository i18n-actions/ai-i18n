/**
 * ICU Message Reconstructor
 *
 * Rebuilds valid ICU MessageFormat messages from translated parts.
 */

import type {
  ParsedICUMessage,
  PluralCategory,
  PluralTranslationResponse,
  PluralVariant,
  SelectOption,
  SelectTranslationResponse,
} from './types';
import { getCardinalCategories, getOrdinalCategories } from './cldr-rules';

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
export function reconstructICUMessage(
  parsed: ParsedICUMessage,
  translations: {
    text?: Map<number, string>; // Maps element index to translated text
    plurals?: Map<string, PluralTranslationResponse>;
    selects?: Map<string, SelectTranslationResponse>;
  },
  options?: ReconstructOptions
): string {
  let result = '';

  for (let i = 0; i < parsed.elements.length; i++) {
    const element = parsed.elements[i];
    if (!element) {
      continue;
    }

    switch (element.type) {
      case 'text': {
        // Use translated text if available, otherwise original
        const translated = translations.text?.get(i);
        result += translated ?? element.value;
        break;
      }

      case 'argument': {
        // Arguments are not translated, preserve as-is
        result += reconstructArgument(element.name, element.argType, element.format);
        break;
      }

      case 'plural': {
        const translation = translations.plurals?.get(element.name);
        if (translation) {
          result += reconstructPlural(
            element.name,
            translation.translations,
            element.offset,
            options
          );
        } else {
          // No translation, preserve original
          result += reconstructPlural(element.name, element.variants, element.offset, options);
        }
        break;
      }

      case 'selectordinal': {
        const translation = translations.plurals?.get(element.name);
        if (translation) {
          result += reconstructSelectordinal(element.name, translation.translations, options);
        } else {
          result += reconstructSelectordinal(element.name, element.variants, options);
        }
        break;
      }

      case 'select': {
        const translation = translations.selects?.get(element.name);
        if (translation) {
          result += reconstructSelect(element.name, translation.translations);
        } else {
          result += reconstructSelect(element.name, element.options);
        }
        break;
      }
    }
  }

  return result;
}

/**
 * Reconstruct a simple argument
 */
function reconstructArgument(name: string, argType?: string, format?: string): string {
  if (!argType) {
    return `{${name}}`;
  }

  if (!format) {
    return `{${name}, ${argType}}`;
  }

  return `{${name}, ${argType}, ${format}}`;
}

/**
 * Reconstruct a plural element
 */
export function reconstructPlural(
  name: string,
  variants: PluralVariant[],
  offset?: number,
  options?: ReconstructOptions
): string {
  const validatedVariants = options?.validateCategories
    ? validatePluralVariants(variants, options.targetLanguage ?? 'en', false)
    : variants;

  let result = `{${name}, plural,`;

  if (offset !== undefined && offset > 0) {
    result += ` offset:${offset}`;
  }

  for (const variant of validatedVariants) {
    result += ` ${variant.category} {${variant.text}}`;
  }

  result += '}';
  return result;
}

/**
 * Reconstruct a selectordinal element
 */
export function reconstructSelectordinal(
  name: string,
  variants: PluralVariant[],
  options?: ReconstructOptions
): string {
  const validatedVariants = options?.validateCategories
    ? validatePluralVariants(variants, options.targetLanguage ?? 'en', true)
    : variants;

  let result = `{${name}, selectordinal,`;

  for (const variant of validatedVariants) {
    result += ` ${variant.category} {${variant.text}}`;
  }

  result += '}';
  return result;
}

/**
 * Reconstruct a select element
 */
export function reconstructSelect(name: string, options: SelectOption[]): string {
  let result = `{${name}, select,`;

  for (const option of options) {
    result += ` ${option.key} {${option.value}}`;
  }

  result += '}';
  return result;
}

/**
 * Validate plural variants against CLDR rules
 */
function validatePluralVariants(
  variants: PluralVariant[],
  targetLanguage: string,
  isOrdinal: boolean
): PluralVariant[] {
  const requiredCategories = isOrdinal
    ? getOrdinalCategories(targetLanguage)
    : getCardinalCategories(targetLanguage);

  const result: PluralVariant[] = [];
  const existingCategories = new Set<string>();

  // First, add all provided variants
  for (const variant of variants) {
    result.push(variant);
    existingCategories.add(variant.category);
  }

  // Ensure 'other' is always present
  if (!existingCategories.has('other')) {
    // Find any variant to use as fallback
    const fallback = variants[0];
    if (fallback) {
      result.push({
        category: 'other',
        text: fallback.text,
      });
    }
  }

  // Add missing required categories with 'other' text as fallback
  const otherVariant = result.find(v => v.category === 'other');
  for (const category of requiredCategories) {
    if (!existingCategories.has(category)) {
      result.push({
        category,
        text: otherVariant?.text ?? '',
      });
    }
  }

  // Sort variants: exact matches first, then CLDR categories
  return result.sort((a, b) => {
    const aIsExact = a.category.startsWith('=');
    const bIsExact = b.category.startsWith('=');

    if (aIsExact && !bIsExact) {
      return -1;
    }
    if (!aIsExact && bIsExact) {
      return 1;
    }

    const categoryOrder: PluralCategory[] = ['zero', 'one', 'two', 'few', 'many', 'other'];
    const aIndex = categoryOrder.indexOf(a.category as PluralCategory);
    const bIndex = categoryOrder.indexOf(b.category as PluralCategory);

    if (aIndex === -1 && bIndex === -1) {
      return a.category.localeCompare(b.category);
    }
    if (aIndex === -1) {
      return 1;
    }
    if (bIndex === -1) {
      return -1;
    }

    return aIndex - bIndex;
  });
}

/**
 * Build a complete ICU message from simple text translation
 * Used when the entire message (including ICU patterns) is translated as one
 */
export function buildICUFromTranslation(
  original: ParsedICUMessage,
  translatedText: string
): string {
  // If original has no ICU patterns, just return the translated text
  if (!original.isComplex) {
    return translatedText;
  }

  // For complex messages, we need structured translation data
  // This function is a fallback that preserves the original structure
  // but returns the translated text as-is
  return translatedText;
}

/**
 * Extract text segments from parsed message for translation
 */
export function extractTextSegments(parsed: ParsedICUMessage): Array<{
  index: number;
  text: string;
  context?: string;
}> {
  const segments: Array<{ index: number; text: string; context?: string }> = [];

  for (let i = 0; i < parsed.elements.length; i++) {
    const element = parsed.elements[i];
    if (!element) {
      continue;
    }

    if (element.type === 'text') {
      segments.push({
        index: i,
        text: element.value,
      });
    } else if (element.type === 'plural' || element.type === 'selectordinal') {
      // Extract text from each variant
      for (const variant of element.variants) {
        segments.push({
          index: i,
          text: variant.text,
          context: `Plural form "${variant.category}" for variable {${element.name}}`,
        });
      }
    } else if (element.type === 'select') {
      // Extract text from each option
      for (const option of element.options) {
        segments.push({
          index: i,
          text: option.value,
          context: `Select option "${option.key}" for variable {${element.name}}`,
        });
      }
    }
  }

  return segments;
}

/**
 * Create plural variants for a target language based on source variants
 */
export function createTargetPluralVariants(
  sourceVariants: PluralVariant[],
  targetLanguage: string,
  isOrdinal: boolean
): PluralVariant[] {
  const targetCategories = isOrdinal
    ? getOrdinalCategories(targetLanguage)
    : getCardinalCategories(targetLanguage);

  // Start with exact matches from source
  const exactMatches = sourceVariants.filter(v => v.category.startsWith('='));

  // Get the 'other' variant as fallback text
  const otherVariant = sourceVariants.find(v => v.category === 'other');
  const fallbackText = otherVariant?.text ?? sourceVariants[0]?.text ?? '';

  // Create variants for all required categories
  const result: PluralVariant[] = [...exactMatches];

  for (const category of targetCategories) {
    // Try to find matching variant from source
    const sourceMatch = sourceVariants.find(v => v.category === category);
    result.push({
      category,
      text: sourceMatch?.text ?? fallbackText,
    });
  }

  return result;
}
