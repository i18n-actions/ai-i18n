import type { TranslationUnit } from '../types/translation';
import { parseICUMessage, hasICUPatterns } from '../icu/parser';
import { getCardinalCategories, formatCategoryDescription } from '../icu/cldr-rules';
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

const DEFAULT_OPTIONS: ContextBuilderOptions = {
  preserveFormatting: true,
  preservePlaceholders: true,
  handleICU: true,
};

/**
 * Build the system prompt for translation
 */
export function buildSystemPrompt(
  sourceLanguage: string,
  targetLanguage: string,
  options?: Partial<ContextBuilderOptions>
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  let prompt = `You are a professional translator specializing in software localization.
Your task is to translate text from ${sourceLanguage} to ${targetLanguage}.

CRITICAL RULES:
1. Provide ONLY the translations in valid JSON format
2. Maintain the exact meaning and tone of the original text
3. Use natural, fluent ${targetLanguage} that sounds native
4. Be consistent with terminology throughout`;

  if (opts.preservePlaceholders) {
    prompt += `
5. PRESERVE all placeholders exactly as they appear:
   - Double-brace placeholders like {{PH}}, {{0}}, {{remainingTime}}
   - Variables like {name}, {count}, {0}, {1}
   - HTML tags like <b>, </b>, <br/>
   - ICU format elements like {count, plural, ...}
   - Do NOT translate placeholder names or content inside {{...}}
   - The double-brace placeholders represent UI variables - keep them EXACTLY as-is
   - CRITICAL: Preserve whitespace around placeholders. If the source has a space before or after a placeholder, the translation MUST also have a space in the same position. For example: "Showing {{PH}} of" must NOT become "Showing{{PH}}of" or "{{PH}}Mostrando de"`;
  }

  if (opts.preserveFormatting) {
    prompt += `
6. Preserve formatting:
   - Keep newlines (\\n) in the same positions
   - Maintain whitespace patterns
   - Preserve punctuation style appropriate to ${targetLanguage}`;
  }

  if (opts.userContext) {
    prompt += `

CONTEXT: ${opts.userContext}`;
  }

  if (opts.glossary && Object.keys(opts.glossary).length > 0) {
    prompt += `

GLOSSARY (use these translations consistently):`;
    for (const [term, translation] of Object.entries(opts.glossary)) {
      prompt += `\n- "${term}" → "${translation}"`;
    }
  }

  prompt += `

RESPONSE FORMAT:
Respond ONLY with valid JSON in this exact format:
{
  "translations": [
    {"id": "string_id", "translation": "translated text"}
  ]
}`;

  return prompt;
}

/**
 * Build the user prompt with strings to translate
 */
export function buildUserPrompt(
  units: TranslationUnit[],
  sourceLanguage: string,
  targetLanguage: string,
  options?: Partial<ContextBuilderOptions>
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  let prompt = `Translate the following ${units.length} string(s) from ${sourceLanguage} to ${targetLanguage}:\n\n`;

  for (const unit of units) {
    prompt += `ID: ${unit.id}\n`;
    prompt += `Source: ${unit.source}\n`;

    // Add context if available
    if (unit.context) {
      prompt += `Context: ${unit.context}\n`;
    }

    // Add notes if available
    if (unit.metadata.notes) {
      prompt += `Notes: ${unit.metadata.notes}\n`;
    }

    // Handle ICU patterns
    if (opts.handleICU && hasICUPatterns(unit.source)) {
      const icuInfo = buildICUInstructions(unit.source, targetLanguage);
      if (icuInfo) {
        prompt += `ICU Instructions: ${icuInfo}\n`;
      }
    }

    prompt += '\n';
  }

  prompt += 'Respond with JSON containing all translations.';

  return prompt;
}

/**
 * Build instructions for translating ICU patterns
 */
function buildICUInstructions(source: string, targetLanguage: string): string | null {
  try {
    const parsed = parseICUMessage(source);

    if (!parsed.isComplex) {
      return null;
    }

    let instructions = '';

    // Handle plurals
    const pluralElements = parsed.elements.filter(e => e.type === 'plural');
    if (pluralElements.length > 0) {
      const targetCategories = getCardinalCategories(targetLanguage);

      instructions += `This contains plural forms. Target language (${targetLanguage}) requires: ${targetCategories.join(', ')}. `;
      instructions += `Provide translations for each required plural category. `;

      // Add category descriptions
      const descriptions = targetCategories
        .map(cat => formatCategoryDescription(cat as PluralCategory, targetLanguage))
        .join('; ');
      instructions += `Categories: ${descriptions}. `;
    }

    // Handle select
    const selectElements = parsed.elements.filter(e => e.type === 'select');
    if (selectElements.length > 0) {
      instructions += `This contains select patterns. Translate each option value while keeping option keys unchanged. `;
    }

    return instructions.trim() || null;
  } catch {
    return null;
  }
}

/**
 * Build a prompt specifically for plural translation
 */
export function buildPluralPrompt(
  variable: string,
  sourceVariants: Array<{ category: string; text: string }>,
  sourceLanguage: string,
  targetLanguage: string,
  targetCategories: PluralCategory[]
): string {
  let prompt = `Translate the following plural forms for the variable "{${variable}}" from ${sourceLanguage} to ${targetLanguage}.

The target language (${targetLanguage}) requires these plural categories:
`;

  for (const category of targetCategories) {
    prompt += `- ${formatCategoryDescription(category, targetLanguage)}\n`;
  }

  prompt += `\nSource plural forms:\n`;

  for (const variant of sourceVariants) {
    prompt += `- ${variant.category}: "${variant.text}"\n`;
  }

  prompt += `
IMPORTANT:
- Keep the placeholder {${variable}} or # (which represents the count) in all translations
- Translate ONLY the text, not the ICU syntax
- Provide a translation for EACH required category

Respond with JSON:
{
  "plurals": [
    {"category": "one", "translation": "..."},
    {"category": "other", "translation": "..."}
  ]
}`;

  return prompt;
}

/** Regex matching placeholder tokens (shared by validation helpers) */
const PLACEHOLDER_REGEX = /\{\{[^}]+\}\}|\{[^}]+\}|<[^>]+>|<\/[^>]+>/g;

/**
 * Return the list of placeholder strings present in source but missing from translation.
 * Returns an empty array when the translation is complete.
 */
export function findMissingPlaceholders(source: string, translation: string): string[] {
  const sourcePlaceholders = source.match(PLACEHOLDER_REGEX) ?? [];
  const translationPlaceholders = new Set(translation.match(PLACEHOLDER_REGEX) ?? []);

  const missing: string[] = [];
  for (const ph of sourcePlaceholders) {
    if (!translationPlaceholders.has(ph)) {
      missing.push(ph);
    }
  }
  return [...new Set(missing)];
}

/**
 * Build a targeted retry prompt that shows the failed translations and
 * explicitly names the placeholders that were dropped.
 *
 * The prompt explains the semantic purpose of placeholders so the LLM
 * understands WHY they must be kept — not just that they must be.
 */
export function buildPlaceholderRetryPrompt(
  units: Array<{ id: string; source: string; brokenTarget: string; missing: string[] }>,
  sourceLanguage: string,
  targetLanguage: string
): string {
  let prompt = `IMPORTANT: Some of your translations are missing required placeholders.

Placeholders like {{PH}}, {{INTERPOLATION}}, {{0}}, and {{variableName}} are runtime variables
that get replaced with actual values (numbers, names, counts, etc.) when the application runs.
They are NOT template markers to be removed — they MUST appear in the translated output at the
appropriate position for the target language.

Example: "{{PH}} Critical" in ${sourceLanguage} should become "{{PH}} Kritisch" in ${targetLanguage}.
At runtime, {{PH}} is replaced by a number, producing "42 Kritisch".
If you omit {{PH}}, the number disappears from the UI entirely.

Re-translate ONLY the units listed below. Every placeholder in the "Missing" list MUST appear
in your translation exactly as written (same spelling, same braces).\n\n`;

  for (const unit of units) {
    prompt += `ID: ${unit.id}\n`;
    prompt += `Source: ${unit.source}\n`;
    prompt += `Your previous (broken) translation: ${unit.brokenTarget}\n`;
    prompt += `Missing placeholders that MUST be in your translation: ${unit.missing.join(', ')}\n\n`;
  }

  prompt += `Respond with JSON containing all translations:
{
  "translations": [
    {"id": "string_id", "translation": "translated text with ALL placeholders preserved"}
  ]
}`;

  return prompt;
}

/**
 * Validate that a translation preserves required elements
 */
export function validateTranslation(
  source: string,
  translation: string,
  options?: Partial<ContextBuilderOptions>
): { valid: boolean; issues: string[] } {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const issues: string[] = [];

  if (opts.preservePlaceholders) {
    // Extract placeholders from source (including {{...}} markers for XLIFF elements)
    const sourcePlaceholders = new Set(source.match(PLACEHOLDER_REGEX) ?? []);
    const translationPlaceholders = new Set(translation.match(PLACEHOLDER_REGEX) ?? []);

    // Check for missing placeholders
    for (const placeholder of sourcePlaceholders) {
      if (!translationPlaceholders.has(placeholder)) {
        issues.push(`Missing placeholder: ${placeholder}`);
      }
    }

    // Check for extra placeholders (might indicate translation issues)
    for (const placeholder of translationPlaceholders) {
      if (!sourcePlaceholders.has(placeholder)) {
        issues.push(`Unexpected placeholder: ${placeholder}`);
      }
    }

    // Check for missing whitespace around placeholders
    for (const placeholder of sourcePlaceholders) {
      if (!translationPlaceholders.has(placeholder)) {
        continue; // Already flagged as missing
      }
      const escaped = placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const srcMatch = new RegExp(`(.)${escaped}(.)`, 's').exec(source);
      const tgtMatch = new RegExp(`(.)${escaped}(.)`, 's').exec(translation);
      if (srcMatch && tgtMatch) {
        if (/\s/.test(srcMatch[1]) && !/\s/.test(tgtMatch[1])) {
          issues.push(`Missing space before placeholder: ${placeholder}`);
        }
        if (/\s/.test(srcMatch[2]) && !/\s/.test(tgtMatch[2])) {
          issues.push(`Missing space after placeholder: ${placeholder}`);
        }
      }
    }
  }

  // Check for empty translation
  if (translation.trim() === '') {
    issues.push('Translation is empty');
  }

  // Check for untranslated content (source === translation for non-placeholder text)
  if (source === translation && source.length > 3 && !/^\{[^}]+\}$/.test(source)) {
    issues.push('Translation appears to be identical to source');
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Extract context from surrounding strings
 */
export function extractSurroundingContext(
  unitId: string,
  allUnits: TranslationUnit[],
  contextSize = 2
): string {
  const index = allUnits.findIndex(u => u.id === unitId);
  if (index === -1) {
    return '';
  }

  const start = Math.max(0, index - contextSize);
  const end = Math.min(allUnits.length, index + contextSize + 1);

  const surrounding = allUnits.slice(start, end).filter(u => u.id !== unitId);

  if (surrounding.length === 0) {
    return '';
  }

  return surrounding.map(u => `"${u.source}"`).join(', ');
}
