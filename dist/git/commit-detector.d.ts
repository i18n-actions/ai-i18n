import { GitClient } from './client';
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
export declare class CommitLoopDetector {
    private gitClient;
    private patterns;
    private targetMessage;
    constructor(gitClient: GitClient, commitMessage: string, options?: LoopDetectorOptions);
    /**
     * Check if the last commit was a translation commit
     */
    isLastCommitTranslation(): Promise<boolean>;
    /**
     * Check if a message matches the target commit message
     */
    private isExactMatch;
    /**
     * Check if a message matches any translation patterns
     */
    private matchesPatterns;
    /**
     * Get skip reason if we should skip the run
     */
    getSkipReason(): Promise<string | null>;
    /**
     * Determine if the action should proceed
     */
    shouldProceed(): Promise<{
        proceed: boolean;
        reason?: string;
    }>;
}
/**
 * Create a commit loop detector
 */
export declare function createLoopDetector(gitClient: GitClient, commitMessage: string, options?: LoopDetectorOptions): CommitLoopDetector;
/**
 * Check if we should skip based on environment variables
 */
export declare function shouldSkipFromEnv(): {
    skip: boolean;
    reason?: string;
};
/**
 * Add skip marker to commit message
 */
export declare function addSkipMarker(message: string): string;
/**
 * Check if a commit message has a skip marker
 */
export declare function hasSkipMarker(message: string): boolean;
//# sourceMappingURL=commit-detector.d.ts.map