import {
  getPluralRules,
  getCardinalCategories,
  getOrdinalCategories,
  getCategoryExamples,
  formatCategoryDescription,
} from '../../../src/icu/cldr-rules';

describe('CLDR Rules', () => {
  describe('getPluralRules', () => {
    it('should return rules for English', () => {
      const rules = getPluralRules('en');

      expect(rules.cardinalCategories).toEqual(['one', 'other']);
      expect(rules.ordinalCategories).toEqual(['one', 'two', 'few', 'other']);
    });

    it('should return rules for Russian', () => {
      const rules = getPluralRules('ru');

      expect(rules.cardinalCategories).toEqual(['one', 'few', 'many', 'other']);
    });

    it('should return rules for Arabic', () => {
      const rules = getPluralRules('ar');

      expect(rules.cardinalCategories).toEqual(['zero', 'one', 'two', 'few', 'many', 'other']);
    });

    it('should return rules for Japanese (only other)', () => {
      const rules = getPluralRules('ja');

      expect(rules.cardinalCategories).toEqual(['other']);
    });

    it('should handle language codes with region', () => {
      const rules = getPluralRules('en-US');

      expect(rules.cardinalCategories).toEqual(['one', 'other']);
    });

    it('should return default rules for unknown language', () => {
      const rules = getPluralRules('unknown');

      expect(rules.cardinalCategories).toEqual(['one', 'other']);
    });
  });

  describe('getCardinalCategories', () => {
    it('should return cardinal categories for a language', () => {
      expect(getCardinalCategories('en')).toEqual(['one', 'other']);
      expect(getCardinalCategories('pl')).toEqual(['one', 'few', 'many', 'other']);
    });
  });

  describe('getOrdinalCategories', () => {
    it('should return ordinal categories for a language', () => {
      expect(getOrdinalCategories('en')).toEqual(['one', 'two', 'few', 'other']);
      expect(getOrdinalCategories('de')).toEqual(['other']);
    });
  });

  describe('getCategoryExamples', () => {
    it('should return example numbers for category', () => {
      const examples = getCategoryExamples('en', 'one');

      expect(examples).toContain(1);
    });

    it('should return examples for ordinal categories', () => {
      const examples = getCategoryExamples('en', 'one', true);

      expect(examples).toContain(1);
      expect(examples).toContain(21);
    });

    it('should return empty array for unknown category', () => {
      const examples = getCategoryExamples('en', 'zero');

      expect(examples).toEqual([]);
    });
  });

  describe('formatCategoryDescription', () => {
    it('should format category with examples', () => {
      const description = formatCategoryDescription('one', 'en');

      expect(description).toContain('one');
      expect(description).toContain('singular');
      expect(description).toContain('1');
    });

    it('should format ordinal category', () => {
      const description = formatCategoryDescription('one', 'en', true);

      expect(description).toContain('one');
      expect(description).toContain('21');
    });
  });

  describe('language coverage', () => {
    const languages = [
      'en', 'de', 'fr', 'es', 'it', 'pt', 'ru', 'pl', 'uk', 'ar',
      'ja', 'zh', 'ko', 'tr', 'nl', 'sv', 'nb', 'da', 'fi', 'cs',
      'he', 'hi', 'th', 'vi'
    ];

    languages.forEach(lang => {
      it(`should have rules for ${lang}`, () => {
        const rules = getPluralRules(lang);

        expect(rules.cardinalCategories.length).toBeGreaterThan(0);
        expect(rules.ordinalCategories.length).toBeGreaterThan(0);
        expect(rules.cardinalCategories).toContain('other');
      });
    });
  });
});
