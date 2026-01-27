import type { ActionConfig, ActionInputs, ConfigFile } from './types';
/**
 * Load configuration from file
 */
export declare function loadConfigFile(configPath: string): Promise<ConfigFile | null>;
/**
 * Get action inputs from GitHub Actions environment
 */
export declare function getActionInputs(): ActionInputs;
/**
 * Merge configuration sources and validate
 */
export declare function loadConfig(inputs?: ActionInputs): Promise<ActionConfig>;
//# sourceMappingURL=loader.d.ts.map