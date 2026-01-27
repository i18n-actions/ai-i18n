import { GitClient } from './client';
import { logger } from '../utils/logger';

/**
 * Signature patterns that indicate an automated translation commit
 */
const TRANSLATION_COMMIT_SIGNATURES = [
  /^chore\(i18n\):/i,
  /^chore: update translations/i,
  /^\[i18n\]/i,
  /^i18n:/i,
  /^translation:/i,
  /^feat\(i18n\):/i,
  /^fix\(i18n\):/i,
  /automated translation/i,
  /auto-translate/i,
];

/**
 * Options for loop detection
 */
export interface LoopDetectorOptions {
  /**
   * Custom commit message patterns to detect
   */
  customPatterns?: RegExp[];

  /**
   * Whether to check for the exact commit message
   */
  exactMatch?: boolean;
}

/**
 * Detector for preventing infinite translation loops
 *
 * When a translation action runs, it creates a commit. If that commit triggers
 * another workflow run, we need to detect this and skip to prevent an infinite loop.
 */
export class CommitLoopDetector {
  private gitClient: GitClient;
  private patterns: RegExp[];
  private targetMessage: string;

  constructor(gitClient: GitClient, commitMessage: string, options?: LoopDetectorOptions) {
    this.gitClient = gitClient;
    this.targetMessage = commitMessage;

    // Combine default patterns with custom ones
    this.patterns = [...TRANSLATION_COMMIT_SIGNATURES, ...(options?.customPatterns ?? [])];
  }

  /**
   * Check if the last commit was a translation commit
   */
  async isLastCommitTranslation(): Promise<boolean> {
    try {
      const lastMessage = await this.gitClient.getLastCommitMessage();

      if (!lastMessage) {
        return false;
      }

      // Check exact match first
      if (this.isExactMatch(lastMessage)) {
        logger.info('Last commit matches target message - skipping to prevent loop');
        return true;
      }

      // Check pattern matches
      if (this.matchesPatterns(lastMessage)) {
        logger.info('Last commit matches translation pattern - skipping to prevent loop');
        return true;
      }

      return false;
    } catch (error) {
      logger.warning('Could not check last commit', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * Check if a message matches the target commit message
   */
  private isExactMatch(message: string): boolean {
    // Compare first line only (ignore body)
    const firstLine = message.split('\n')[0]?.trim() ?? '';
    const targetFirstLine = this.targetMessage.split('\n')[0]?.trim() ?? '';

    return firstLine.toLowerCase() === targetFirstLine.toLowerCase();
  }

  /**
   * Check if a message matches any translation patterns
   */
  private matchesPatterns(message: string): boolean {
    return this.patterns.some(pattern => pattern.test(message));
  }

  /**
   * Get skip reason if we should skip the run
   */
  async getSkipReason(): Promise<string | null> {
    // Check GitHub Actions event context
    const eventName = process.env['GITHUB_EVENT_NAME'];
    const actor = process.env['GITHUB_ACTOR'];

    // Skip if triggered by a bot or action
    if (actor === 'github-actions[bot]' || actor === 'dependabot[bot]') {
      return `Triggered by ${actor}`;
    }

    // For push events, check the commit message
    if (eventName === 'push') {
      const isTranslation = await this.isLastCommitTranslation();
      if (isTranslation) {
        return 'Last commit was a translation commit';
      }
    }

    return null;
  }

  /**
   * Determine if the action should proceed
   */
  async shouldProceed(): Promise<{ proceed: boolean; reason?: string }> {
    const skipReason = await this.getSkipReason();

    if (skipReason) {
      return { proceed: false, reason: skipReason };
    }

    return { proceed: true };
  }
}

/**
 * Create a commit loop detector
 */
export function createLoopDetector(
  gitClient: GitClient,
  commitMessage: string,
  options?: LoopDetectorOptions
): CommitLoopDetector {
  return new CommitLoopDetector(gitClient, commitMessage, options);
}

/**
 * Check if we should skip based on environment variables
 */
export function shouldSkipFromEnv(): { skip: boolean; reason?: string } {
  // Check for explicit skip flag
  if (process.env['I18N_SKIP_TRANSLATION'] === 'true') {
    return { skip: true, reason: 'I18N_SKIP_TRANSLATION is set' };
  }

  // Check for bot actors
  const actor = process.env['GITHUB_ACTOR'];
  if (actor === 'github-actions[bot]') {
    return { skip: true, reason: 'Triggered by github-actions[bot]' };
  }

  return { skip: false };
}

/**
 * Add skip marker to commit message
 */
export function addSkipMarker(message: string): string {
  // Add [skip i18n] marker to prevent re-triggering
  if (message.includes('[skip i18n]') || message.includes('[i18n skip]')) {
    return message;
  }

  return `${message}\n\n[skip i18n]`;
}

/**
 * Check if a commit message has a skip marker
 */
export function hasSkipMarker(message: string): boolean {
  return message.includes('[skip i18n]') || message.includes('[i18n skip]');
}
