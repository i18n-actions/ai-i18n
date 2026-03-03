import { buildSystemPrompt } from '../../../src/translators/context-builder';

describe('Context Builder - Glossary', () => {
  it('should include glossary terms in system prompt', () => {
    const prompt = buildSystemPrompt('en', 'de', {
      preserveFormatting: true,
      preservePlaceholders: true,
      glossary: {
        'Shopping Cart': 'Warenkorb',
        Dashboard: 'Dashboard',
      },
    });

    expect(prompt).toContain('GLOSSARY');
    expect(prompt).toContain('"Shopping Cart" → "Warenkorb"');
    expect(prompt).toContain('"Dashboard" → "Dashboard"');
  });

  it('should not include glossary section when glossary is empty', () => {
    const prompt = buildSystemPrompt('en', 'de', {
      preserveFormatting: true,
      preservePlaceholders: true,
      glossary: {},
    });

    expect(prompt).not.toContain('GLOSSARY');
  });

  it('should not include glossary section when glossary is undefined', () => {
    const prompt = buildSystemPrompt('en', 'de', {
      preserveFormatting: true,
      preservePlaceholders: true,
    });

    expect(prompt).not.toContain('GLOSSARY');
  });

  it('should include multiple glossary entries', () => {
    const glossary: Record<string, string> = {
      Hello: 'Hallo',
      World: 'Welt',
      'Endpoint Protection': 'Endpoint Protection',
    };

    const prompt = buildSystemPrompt('en', 'de', {
      preserveFormatting: true,
      preservePlaceholders: true,
      glossary,
    });

    expect(prompt).toContain('GLOSSARY (use these translations consistently)');
    expect(prompt).toContain('"Hello" → "Hallo"');
    expect(prompt).toContain('"World" → "Welt"');
    expect(prompt).toContain('"Endpoint Protection" → "Endpoint Protection"');
  });
});
