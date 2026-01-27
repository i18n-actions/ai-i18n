/**
 * ICU Message Parser
 *
 * Parses ICU MessageFormat messages into structured format for translation.
 * Supports: arguments, plurals, select, and selectordinal.
 */

import { ICUParseError } from '../utils/errors';
import type {
  ICUArgumentElement,
  ICUElement,
  ICUPluralElement,
  ICUSelectElement,
  ICUSelectOrdinalElement,
  ICUTextElement,
  ParsedICUMessage,
  PluralVariant,
  SelectOption,
} from './types';

/**
 * Simple lexer for ICU messages
 */
class ICULexer {
  private pos = 0;
  private readonly inputStr: string;

  constructor(input: string) {
    this.inputStr = input;
  }

  peek(): string | undefined {
    return this.inputStr[this.pos];
  }

  peekAt(offset: number): string | undefined {
    return this.inputStr[this.pos + offset];
  }

  advance(): string | undefined {
    return this.inputStr[this.pos++];
  }

  isEnd(): boolean {
    return this.pos >= this.inputStr.length;
  }

  getPosition(): number {
    return this.pos;
  }

  setPosition(pos: number): void {
    this.pos = pos;
  }

  readUntil(chars: string[]): string {
    let result = '';
    let braceDepth = 0;

    while (!this.isEnd()) {
      const char = this.peek();
      if (char === undefined) {
        break;
      }

      if (char === '{') {
        braceDepth++;
      } else if (char === '}') {
        if (braceDepth === 0 && chars.includes('}')) {
          break;
        }
        braceDepth--;
      } else if (braceDepth === 0 && chars.includes(char)) {
        break;
      }

      result += this.advance();
    }

    return result;
  }

  readIdentifier(): string {
    let result = '';

    while (!this.isEnd()) {
      const char = this.peek();
      if (char === undefined) {
        break;
      }

      if (/[a-zA-Z0-9_-]/.test(char)) {
        result += this.advance();
      } else {
        break;
      }
    }

    return result;
  }

  skipWhitespace(): void {
    while (!this.isEnd()) {
      const char = this.peek();
      if (char !== undefined && /\s/.test(char)) {
        this.advance();
      } else {
        break;
      }
    }
  }
}

/**
 * Parse an ICU MessageFormat message
 */
export function parseICUMessage(message: string): ParsedICUMessage {
  const elements: ICUElement[] = [];
  const variables = new Set<string>();
  let hasPlurals = false;
  let hasSelect = false;

  const lexer = new ICULexer(message);

  while (!lexer.isEnd()) {
    const char = lexer.peek();

    if (char === '{') {
      const start = lexer.getPosition();
      lexer.advance(); // consume '{'

      // Parse argument
      lexer.skipWhitespace();
      const name = lexer.readIdentifier();

      if (!name) {
        throw new ICUParseError('Expected identifier in argument', message, start);
      }

      variables.add(name);
      lexer.skipWhitespace();

      const nextChar = lexer.peek();

      if (nextChar === '}') {
        // Simple argument: {name}
        lexer.advance();
        elements.push({
          type: 'argument',
          name,
          start,
          end: lexer.getPosition(),
        } as ICUArgumentElement);
      } else if (nextChar === ',') {
        lexer.advance(); // consume ','
        lexer.skipWhitespace();

        const argType = lexer.readIdentifier();
        lexer.skipWhitespace();

        if (argType === 'plural' || argType === 'selectordinal') {
          hasPlurals = true;
          const element = parsePluralOrSelectordinal(
            lexer,
            message,
            name,
            argType === 'selectordinal',
            start
          );
          elements.push(element);
        } else if (argType === 'select') {
          hasSelect = true;
          const element = parseSelect(lexer, message, name, start);
          elements.push(element);
        } else {
          // Format argument: {name, type} or {name, type, format}
          const nextChar2 = lexer.peek();
          let format: string | undefined;

          if (nextChar2 === ',') {
            lexer.advance(); // consume ','
            lexer.skipWhitespace();
            format = lexer.readUntil(['}']);
          }

          lexer.skipWhitespace();
          if (lexer.peek() !== '}') {
            throw new ICUParseError('Expected } after argument', message, lexer.getPosition());
          }
          lexer.advance(); // consume '}'

          elements.push({
            type: 'argument',
            name,
            argType,
            format: format?.trim(),
            start,
            end: lexer.getPosition(),
          } as ICUArgumentElement);
        }
      } else {
        throw new ICUParseError(
          `Unexpected character '${nextChar}' in argument`,
          message,
          lexer.getPosition()
        );
      }
    } else {
      // Plain text
      const start = lexer.getPosition();
      let text = '';

      while (!lexer.isEnd()) {
        const c = lexer.peek();
        if (c === '{' || c === '}') {
          break;
        }
        // Handle escape sequences
        if (c === "'" && lexer.peekAt(1) === "'") {
          text += "'";
          lexer.advance();
          lexer.advance();
        } else if (c === "'") {
          // Start of quoted string
          lexer.advance(); // consume opening quote
          while (!lexer.isEnd() && lexer.peek() !== "'") {
            text += lexer.advance();
          }
          lexer.advance(); // consume closing quote
        } else {
          text += lexer.advance();
        }
      }

      if (text) {
        elements.push({
          type: 'text',
          value: text,
          start,
          end: lexer.getPosition(),
        } as ICUTextElement);
      }
    }
  }

  return {
    original: message,
    elements,
    hasPlurals,
    hasSelect,
    variables: Array.from(variables),
    isComplex: hasPlurals || hasSelect,
  };
}

/**
 * Parse plural or selectordinal element
 */
function parsePluralOrSelectordinal(
  lexer: ICULexer,
  message: string,
  name: string,
  isOrdinal: boolean,
  start: number
): ICUPluralElement | ICUSelectOrdinalElement {
  const variants: PluralVariant[] = [];
  let offset: number | undefined;

  // Check for offset
  lexer.skipWhitespace();
  if (lexer.peek() === ',') {
    lexer.advance();
    lexer.skipWhitespace();

    const offsetKeyword = lexer.readIdentifier();
    if (offsetKeyword === 'offset') {
      lexer.skipWhitespace();
      if (lexer.peek() === ':') {
        lexer.advance();
        lexer.skipWhitespace();
        const offsetStr = lexer.readIdentifier();
        offset = parseInt(offsetStr, 10);
        if (isNaN(offset)) {
          throw new ICUParseError('Invalid offset value', message, lexer.getPosition());
        }
      }
    }
  }

  // Parse variants
  while (!lexer.isEnd()) {
    lexer.skipWhitespace();
    const char = lexer.peek();

    if (char === '}') {
      lexer.advance(); // consume final '}'
      break;
    }

    // Read category (e.g., 'one', 'other', '=0', '=1')
    let category = '';
    if (char === '=') {
      lexer.advance();
      category = '=' + lexer.readIdentifier();
    } else {
      category = lexer.readIdentifier();
    }

    if (!category) {
      throw new ICUParseError('Expected plural category', message, lexer.getPosition());
    }

    lexer.skipWhitespace();

    // Expect '{'
    if (lexer.peek() !== '{') {
      throw new ICUParseError('Expected { after plural category', message, lexer.getPosition());
    }
    lexer.advance();

    // Read the variant text (handling nested braces)
    const text = readNestedContent(lexer, message);

    variants.push({
      category: category,
      text,
    });
  }

  const end = lexer.getPosition();

  if (isOrdinal) {
    return {
      type: 'selectordinal',
      name,
      variants,
      start,
      end,
    } as ICUSelectOrdinalElement;
  }

  return {
    type: 'plural',
    name,
    offset,
    variants,
    start,
    end,
  } as ICUPluralElement;
}

/**
 * Parse select element
 */
function parseSelect(
  lexer: ICULexer,
  message: string,
  name: string,
  start: number
): ICUSelectElement {
  const options: SelectOption[] = [];

  // Expect comma after 'select'
  lexer.skipWhitespace();
  if (lexer.peek() === ',') {
    lexer.advance();
  }

  // Parse options
  while (!lexer.isEnd()) {
    lexer.skipWhitespace();
    const char = lexer.peek();

    if (char === '}') {
      lexer.advance(); // consume final '}'
      break;
    }

    // Read key
    const key = lexer.readIdentifier();
    if (!key) {
      throw new ICUParseError('Expected select key', message, lexer.getPosition());
    }

    lexer.skipWhitespace();

    // Expect '{'
    if (lexer.peek() !== '{') {
      throw new ICUParseError('Expected { after select key', message, lexer.getPosition());
    }
    lexer.advance();

    // Read the option value (handling nested braces)
    const value = readNestedContent(lexer, message);

    options.push({ key, value });
  }

  return {
    type: 'select',
    name,
    options,
    start,
    end: lexer.getPosition(),
  };
}

/**
 * Read content with nested braces
 */
function readNestedContent(lexer: ICULexer, message: string): string {
  let content = '';
  let braceDepth = 1;

  while (!lexer.isEnd()) {
    const char = lexer.peek();
    if (char === undefined) {
      break;
    }

    if (char === '{') {
      braceDepth++;
      content += lexer.advance();
    } else if (char === '}') {
      braceDepth--;
      if (braceDepth === 0) {
        lexer.advance(); // consume closing '}'
        break;
      }
      content += lexer.advance();
    } else if (char === "'" && lexer.peekAt(1) === "'") {
      // Escaped quote
      content += lexer.advance();
      content += lexer.advance();
    } else {
      content += lexer.advance();
    }
  }

  if (braceDepth !== 0) {
    throw new ICUParseError('Unmatched braces in message', message, lexer.getPosition());
  }

  return content;
}

/**
 * Check if a message contains ICU patterns
 */
export function hasICUPatterns(message: string): boolean {
  return (
    message.includes('{') &&
    (message.includes(', plural,') ||
      message.includes(',plural,') ||
      message.includes(', select,') ||
      message.includes(',select,') ||
      message.includes(', selectordinal,') ||
      message.includes(',selectordinal,'))
  );
}

/**
 * Check if a message is a simple argument reference
 */
export function isSimpleArgument(message: string): boolean {
  const trimmed = message.trim();
  return /^\{[a-zA-Z_][a-zA-Z0-9_]*\}$/.test(trimmed);
}

/**
 * Extract all variable names from a message
 */
export function extractVariables(message: string): string[] {
  const parsed = parseICUMessage(message);
  return parsed.variables;
}
