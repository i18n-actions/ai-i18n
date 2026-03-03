import type { ActionConfig, ActionInputs, ConfigFile } from './types';
/**
 * Parse YAML content (simple implementation for basic structure)
 * For production, consider using a proper YAML parser like js-yaml
 */
export declare function parseYaml(content: string): Record<string, unknown>;
/**
 * Load configuration from file
 */
export declare function loadConfigFile(configPath: string): ConfigFile | null;
/**
 * Get action inputs from GitHub Actions environment
 */
export declare function getActionInputs(): ActionInputs;
/**
 * Merge configuration sources and validate
 */
export declare function loadConfig(inputs?: ActionInputs): ActionConfig;
//# sourceMappingURL=loader.d.ts.map