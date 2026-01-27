import { parseICUMessage, hasICUPatterns, extractVariables } from '../../../src/icu/parser';

describe('ICU Parser', () => {
  describe('parseICUMessage', () => {
    it('should parse simple text', () => {
      const result = parseICUMessage('Hello, World!');

      expect(result.isComplex).toBe(false);
      expect(result.hasPlurals).toBe(false);
      expect(result.hasSelect).toBe(false);
      expect(result.elements.length).toBe(1);
      expect(result.elements[0]?.type).toBe('text');
    });

    it('should parse simple argument', () => {
      const result = parseICUMessage('Hello, {name}!');

      expect(result.variables).toContain('name');
      expect(result.elements.length).toBe(3);

      const argElement = result.elements.find(e => e.type === 'argument');
      expect(argElement).toBeDefined();
      if (argElement?.type === 'argument') {
        expect(argElement.name).toBe('name');
      }
    });

    it('should parse typed argument', () => {
      const result = parseICUMessage('Balance: {amount, number, currency}');

      expect(result.variables).toContain('amount');

      const argElement = result.elements.find(e => e.type === 'argument');
      expect(argElement).toBeDefined();
      if (argElement?.type === 'argument') {
        expect(argElement.name).toBe('amount');
        expect(argElement.argType).toBe('number');
        expect(argElement.format).toBe('currency');
      }
    });

    it('should parse plural with offset', () => {
      const result = parseICUMessage(
        '{count, plural, offset:1 =0 {No items} one {One item} other {# items}}'
      );

      const pluralElement = result.elements.find(e => e.type === 'plural');
      if (pluralElement?.type === 'plural') {
        expect(pluralElement.offset).toBe(1);
        expect(pluralElement.variants.length).toBe(3);
      }
    });

    it('should parse select message', () => {
      const result = parseICUMessage(
        '{gender, select, male {He} female {She} other {They}} left a comment.'
      );

      expect(result.isComplex).toBe(true);
      expect(result.hasSelect).toBe(true);
      expect(result.variables).toContain('gender');

      const selectElement = result.elements.find(e => e.type === 'select');
      expect(selectElement).toBeDefined();
      if (selectElement?.type === 'select') {
        expect(selectElement.name).toBe('gender');
        expect(selectElement.options.length).toBe(3);

        const maleOption = selectElement.options.find(o => o.key === 'male');
        expect(maleOption?.value).toBe('He');
      }
    });

    it('should parse nested ICU patterns', () => {
      const result = parseICUMessage(
        '{gender, select, male {{count, plural, one {He has # item} other {He has # items}}} other {{count, plural, one {They have # item} other {They have # items}}}}'
      );

      expect(result.isComplex).toBe(true);
      expect(result.hasSelect).toBe(true);
      expect(result.variables).toContain('gender');
    });
  });

  describe('hasICUPatterns', () => {
    it('should return true for plural patterns', () => {
      expect(hasICUPatterns('{count, plural, one {#} other {#}}')).toBe(true);
    });

    it('should return true for select patterns', () => {
      expect(hasICUPatterns('{type, select, a {A} other {B}}')).toBe(true);
    });

    it('should return false for simple arguments', () => {
      expect(hasICUPatterns('{name}')).toBe(false);
    });

    it('should return false for plain text', () => {
      expect(hasICUPatterns('Hello, World!')).toBe(false);
    });
  });

  describe('extractVariables', () => {
    it('should extract all variable names', () => {
      const variables = extractVariables('Hello {name}, you have {count} messages.');

      expect(variables).toContain('name');
      expect(variables).toContain('count');
      expect(variables.length).toBe(2);
    });
  });
});
