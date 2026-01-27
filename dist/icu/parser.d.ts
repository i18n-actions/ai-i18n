/**
 * ICU Message Parser
 *
 * Parses ICU MessageFormat messages into structured format for translation.
 * Supports: arguments, plurals, select, and selectordinal.
 */
import type { ParsedICUMessage } from './types';
/**
 * Parse an ICU MessageFormat message
 */
export declare function parseICUMessage(message: string): ParsedICUMessage;
/**
 * Check if a message contains ICU patterns
 */
export declare function hasICUPatterns(message: string): boolean;
/**
 * Check if a message is a simple argument reference
 */
export declare function isSimpleArgument(message: string): boolean;
/**
 * Extract all variable names from a message
 */
export declare function extractVariables(message: string): string[];
//# sourceMappingURL=parser.d.ts.map