import * as core from '@actions/core';

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

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warning: 2,
  error: 3,
};

class ActionLogger implements Logger {
  private currentLevel: LogLevel = 'info';

  private formatContext(context?: Record<string, unknown>): string {
    if (!context || Object.keys(context).length === 0) {
      return '';
    }
    return ' ' + JSON.stringify(context);
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.currentLevel];
  }

  setLevel(level: LogLevel): void {
    this.currentLevel = level;
  }

  debug(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('debug')) {
      core.debug(`${message}${this.formatContext(context)}`);
    }
  }

  info(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('info')) {
      core.info(`${message}${this.formatContext(context)}`);
    }
  }

  warning(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('warning')) {
      core.warning(`${message}${this.formatContext(context)}`);
    }
  }

  error(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('error')) {
      core.error(`${message}${this.formatContext(context)}`);
    }
  }

  group(name: string): void {
    core.startGroup(name);
  }

  groupEnd(): void {
    core.endGroup();
  }
}

/**
 * Console logger for testing or non-action environments
 */
class ConsoleLogger implements Logger {
  private currentLevel: LogLevel = 'info';

  private formatContext(context?: Record<string, unknown>): string {
    if (!context || Object.keys(context).length === 0) {
      return '';
    }
    return ' ' + JSON.stringify(context);
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.currentLevel];
  }

  setLevel(level: LogLevel): void {
    this.currentLevel = level;
  }

  debug(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('debug')) {
      // eslint-disable-next-line no-console
      console.debug(`[DEBUG] ${message}${this.formatContext(context)}`);
    }
  }

  info(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('info')) {
      // eslint-disable-next-line no-console
      console.info(`[INFO] ${message}${this.formatContext(context)}`);
    }
  }

  warning(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('warning')) {
      // eslint-disable-next-line no-console
      console.warn(`[WARNING] ${message}${this.formatContext(context)}`);
    }
  }

  error(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('error')) {
      // eslint-disable-next-line no-console
      console.error(`[ERROR] ${message}${this.formatContext(context)}`);
    }
  }

  group(name: string): void {
    // eslint-disable-next-line no-console
    console.group(name);
  }

  groupEnd(): void {
    // eslint-disable-next-line no-console
    console.groupEnd();
  }
}

/**
 * Create a logger instance based on the environment
 */
export function createLogger(): Logger {
  // Check if running in GitHub Actions
  if (process.env['GITHUB_ACTIONS'] === 'true') {
    return new ActionLogger();
  }
  return new ConsoleLogger();
}

// Default logger instance
export const logger = createLogger();
