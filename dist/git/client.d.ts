import type { GitConfig } from '../config/types';
/**
 * Result of a git commit operation
 */
export interface CommitResult {
    sha: string;
    summary: string;
    filesChanged: number;
    insertions: number;
    deletions: number;
}
/**
 * Options for git operations
 */
export interface GitClientOptions {
    baseDir?: string;
    timeout?: number;
}
/**
 * Git client wrapper for translation commits
 */
export declare class GitClient {
    private git;
    private config;
    constructor(config: GitConfig, options?: GitClientOptions);
    /**
     * Check if git is available and we're in a repository
     */
    checkRepository(): Promise<boolean>;
    /**
     * Configure git user if specified
     */
    configureUser(): Promise<void>;
    /**
     * Get current branch name
     */
    getCurrentBranch(): Promise<string>;
    /**
     * Check if there are uncommitted changes
     */
    hasChanges(): Promise<boolean>;
    /**
     * Stage files for commit
     */
    stageFiles(files: string[]): Promise<void>;
    /**
     * Commit staged changes
     */
    commit(message?: string): Promise<CommitResult>;
    /**
     * Stage files and commit in one operation
     */
    stageAndCommit(files: string[], message?: string): Promise<CommitResult>;
    /**
     * Get the last commit message
     */
    getLastCommitMessage(): Promise<string>;
    /**
     * Get the last commit SHA
     */
    getLastCommitSha(): Promise<string>;
    /**
     * Check if a branch exists
     */
    branchExists(branchName: string): Promise<boolean>;
    /**
     * Create a new branch
     */
    createBranch(branchName: string): Promise<void>;
    /**
     * Switch to an existing branch
     */
    checkoutBranch(branchName: string): Promise<void>;
    /**
     * Get list of modified files
     */
    getModifiedFiles(): Promise<string[]>;
    /**
     * Get the diff for staged files
     */
    getStagedDiff(): Promise<string>;
    /**
     * Reset changes to specific files
     */
    resetFiles(files: string[]): Promise<void>;
}
/**
 * Create a git client instance
 */
export declare function createGitClient(config: GitConfig, options?: GitClientOptions): GitClient;
//# sourceMappingURL=client.d.ts.map