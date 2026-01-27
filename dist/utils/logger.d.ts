export type LogLevel = 'debug' | 'info' | 'warning' | 'error';
export interface Logger {
    debug(message: string, context?: Record<string, unknown>): void;
    info(message: string, context?: Record<string, unknown>): void;
    warning(message: string, context?: Record<string, unknown>): void;
    error(message: string, context?: Record<string, unknown>): void;
    group(name: string): void;
    groupEnd(): void;
    setLevel(level: LogLevel): void;
}
/**
 * Create a logger instance based on the environment
 */
export declare function createLogger(): Logger;
export declare const logger: Logger;
//# sourceMappingURL=logger.d.ts.map