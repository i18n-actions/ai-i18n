/**
 * ICU Message Types
 *
 * These types represent the parsed structure of ICU MessageFormat messages.
 */

/**
 * Plural categories defined by CLDR
 */
export type PluralCategory = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';

/**
 * All plural categories
 */
export const PLURAL_CATEGORIES: PluralCategory[] = ['zero', 'one', 'two', 'few', 'many', 'other'];

/**
 * Select option (for selectordinal and select)
 */
export interface SelectOption {
  key: string;
  value: string;
}

/**
 * Plural variant
 */
export interface PluralVariant {
  category: string; // PluralCategory or exact matches like '=0', '=1'
  text: string;
}

/**
 * Types of ICU message elements
 */
export type ICUElementType = 'text' | 'argument' | 'plural' | 'select' | 'selectordinal';

/**
 * Base ICU element
 */
export interface ICUElementBase {
  type: ICUElementType;
  start: number;
  end: number;
}

/**
 * Plain text element
 */
export interface ICUTextElement extends ICUElementBase {
  type: 'text';
  value: string;
}

/**
 * Simple argument placeholder {name} or {name, type} or {name, type, format}
 */
export interface ICUArgumentElement extends ICUElementBase {
  type: 'argument';
  name: string;
  argType?: string; // 'number', 'date', 'time', etc.
  format?: string; // 'short', 'long', '#,##0.00', etc.
}

/**
 * Plural element {count, plural, one {...} other {...}}
 */
export interface ICUPluralElement extends ICUElementBase {
  type: 'plural';
  name: string;
  offset?: number;
  variants: PluralVariant[];
}

/**
 * Select element {gender, select, male {...} female {...} other {...}}
 */
export interface ICUSelectElement extends ICUElementBase {
  type: 'select';
  name: string;
  options: SelectOption[];
}

/**
 * Select ordinal element {position, selectordinal, one {...} two {...} other {...}}
 */
export interface ICUSelectOrdinalElement extends ICUElementBase {
  type: 'selectordinal';
  name: string;
  variants: PluralVariant[];
}

/**
 * Union of all ICU element types
 */
export type ICUElement =
  | ICUTextElement
  | ICUArgumentElement
  | ICUPluralElement
  | ICUSelectElement
  | ICUSelectOrdinalElement;

/**
 * Result of parsing an ICU message
 */
export interface ParsedICUMessage {
  original: string;
  elements: ICUElement[];
  hasPlurals: boolean;
  hasSelect: boolean;
  variables: string[];
  isComplex: boolean;
}

/**
 * Request to translate plural forms
 */
export interface PluralTranslationRequest {
  variable: string;
  sourceLanguage: string;
  targetLanguage: string;
  variants: PluralVariant[];
  requiredCategories: PluralCategory[];
  offset?: number;
}

/**
 * Response with translated plural forms
 */
export interface PluralTranslationResponse {
  variable: string;
  translations: PluralVariant[];
}

/**
 * Request to translate select options
 */
export interface SelectTranslationRequest {
  variable: string;
  sourceLanguage: string;
  targetLanguage: string;
  options: SelectOption[];
}

/**
 * Response with translated select options
 */
export interface SelectTranslationResponse {
  variable: string;
  translations: SelectOption[];
}

/**
 * Full ICU translation request (encompasses all ICU patterns)
 */
export interface ICUTranslationRequest {
  sourceMessage: string;
  parsedMessage: ParsedICUMessage;
  sourceLanguage: string;
  targetLanguage: string;
}

/**
 * Full ICU translation response
 */
export interface ICUTranslationResponse {
  translatedMessage: string;
  pluralTranslations?: PluralTranslationResponse[];
  selectTranslations?: SelectTranslationResponse[];
}
